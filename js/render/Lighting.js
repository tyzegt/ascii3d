window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

// Освещение (этап B): плоские описания источников света + flat-shading Ламберта.
// Модель на грань:
//   contribution = lightColor * intensity
//                  * max(0, dot(normal, toLight))          (Ламберт)
//                  * attenuation                           (point/spot: 1/(1+K*d^2))
//                  * cone                                  (spot: плавный конус)
//   lightRGB = ambient*white + Σ contributions             (clamp 0..1)
A3D.modules.Lighting = (function () {
    'use strict';

    var Vec3 = A3D.modules.Vec3;
    var Config = A3D.modules.Config;
    var Debug = A3D.modules.Debug;

    function isNum(v) {
        return typeof v === 'number' && isFinite(v);
    }

    // [x,y,z] → Vec3 или null, если битые данные.
    function vec3FromArr(a) {
        if (!Array.isArray(a) || a.length < 3) return null;
        if (!isNum(a[0]) || !isNum(a[1]) || !isNum(a[2])) return null;
        return new Vec3(a[0], a[1], a[2]);
    }

    function clamp(v, lo, hi) {
        return v < lo ? lo : (v > hi ? hi : v);
    }

    // Цвет [r,g,b] (0..1, допустимо >1) или null.
    function colorFromArr(a) {
        if (!Array.isArray(a) || a.length < 3) return null;
        if (!isNum(a[0]) || !isNum(a[1]) || !isNum(a[2])) return null;
        return [a[0], a[1], a[2]];
    }

    // Приводит сырой объект света из JSON к канонической форме.
    //   point:       { type:'point', color:[r,g,b], intensity, position:[x,y,z] }
    //   directional: { type:'directional', color:[r,g,b], intensity, direction:[dx,dy,dz] }
    //   spot:        { type:'spot', color:[r,g,b], intensity, position:[x,y,z],
    //                  direction:[dx,dy,dz], coneHalfAngle (рад), innerCone (0..1) }
    // Возвращает нормализованный объект или null (битые данные — пропускаем с логом).
    function normalizeLight(raw) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

        var type = (typeof raw.type === 'string') ? raw.type : '';
        if (type !== 'point' && type !== 'directional' && type !== 'spot') {
            Debug.warn('Lighting', 'normalizeLight: bad type "' + type + '", light skipped');
            return null;
        }

        var color = colorFromArr(raw.color);
        if (!color) {
            Debug.warn('Lighting', 'normalizeLight: bad color, light skipped');
            return null;
        }

        var intensity = isNum(raw.intensity) ? raw.intensity : 1;

        if (type === 'point') {
            var pos = vec3FromArr(raw.position);
            if (!pos) {
                Debug.warn('Lighting', 'normalizeLight: point light has bad position, skipped');
                return null;
            }
            return { type: 'point', color: color, intensity: intensity, position: pos };
        }

        if (type === 'spot') {
            var spos = vec3FromArr(raw.position);
            if (!spos) {
                Debug.warn('Lighting', 'normalizeLight: spot light has bad position, skipped');
                return null;
            }
            var sdir = vec3FromArr(raw.direction);
            if (!sdir) {
                Debug.warn('Lighting', 'normalizeLight: spot light has bad direction, skipped');
                return null;
            }
            sdir = sdir.normalize();
            if (sdir.length() === 0) {
                Debug.warn('Lighting', 'normalizeLight: spot zero-length direction, skipped');
                return null;
            }
            // coneHalfAngle — половина угла конуса (рад); innerCone — доля жёсткого
            // ядра (1 = резкая граница, 0 = равномерно до края). Defaults из Config.
            var half = isNum(raw.coneHalfAngle) ? raw.coneHalfAngle : Config.SPOT_CONE_HALF_ANGLE;
            if (!(half > 0)) half = Config.SPOT_CONE_HALF_ANGLE;
            var inner = isNum(raw.innerCone) ? clamp(raw.innerCone, 0, 1) : Config.SPOT_INNER_CONE;
            return {
                type: 'spot', color: color, intensity: intensity,
                position: spos, direction: sdir,
                coneHalfAngle: half, innerCone: inner
            };
        }

        var dir = vec3FromArr(raw.direction);
        if (!dir) {
            Debug.warn('Lighting', 'normalizeLight: directional light has bad direction, skipped');
            return null;
        }
        dir = dir.normalize();
        if (dir.length() === 0) {
            Debug.warn('Lighting', 'normalizeLight: zero-length direction, skipped');
            return null;
        }
        return { type: 'directional', color: color, intensity: intensity, direction: dir };
    }

    // Аттенюация point/spot-света на расстоянии d: 1/(1 + K*d^2).
    function attenuation(d) {
        var k = (isNum(Config.POINT_ATTENUATION_K)) ? Config.POINT_ATTENUATION_K : 0;
        return 1 / (1 + k * d * d);
    }

    // Конус spot-света: cosDot = cos угла между direction света и направлением
    // к точке. Возвращает множитель 0..1: innerCone — жёсткое ядро (полная
    // яркость), дальше плавный спад до нуля на границе coneHalfAngle.
    function coneFactor(cosDot, L) {
        var cosOuter = Math.cos(L.coneHalfAngle);
        if (cosDot <= cosOuter) return 0;
        var inner = L.innerCone;
        if (inner >= 1) return 1;
        var cosInner = Math.cos(L.coneHalfAngle * inner);
        if (cosDot >= cosInner) return 1;
        var t = (cosDot - cosOuter) / (cosInner - cosOuter);
        return clamp(t, 0, 1);
    }

    // Свет на грань (flat-shading).
    //   normalWorld - Vec3, мировая нормаль грани (единичная)
    //   posWorld    - Vec3, мировая позиция (центроид грани)
    //   lights      - Lighting.normalizeLight[] (может быть пустым)
    //   ambient     - (опц.) доля белого; по умолчанию Config.AMBIENT
    // Возвращает { r, g, b } в 0..1 (clamp'нуто).
    function computeFaceLight(normalWorld, posWorld, lights, ambient) {
        if (ambient === undefined) ambient = Config.AMBIENT;
        var amb = isNum(ambient) ? clamp(ambient, 0, 1) : Config.AMBIENT;

        var r = amb, g = amb, b = amb;

        if (lights && lights.length) {
            for (var i = 0; i < lights.length; i++) {
                var L = lights[i];
                if (!L || !L.color) continue;

                var toLightDir;
                var att = 1;
                var cone = 1;
                if (L.type === 'point') {
                    var delta = L.position.sub(posWorld);
                    var dist = delta.length();
                    if (dist < 1e-6) {
                        // свет точно в точке грани: направления нет, берём ambient-only
                        continue;
                    }
                    toLightDir = new Vec3(delta.x / dist, delta.y / dist, delta.z / dist);
                    att = attenuation(dist);
                } else if (L.type === 'spot') {
                    // direction — вектор, КУДА светит конус. Точка вне конуса → 0.
                    var sdelta = posWorld.sub(L.position);
                    var sdist = sdelta.length();
                    if (sdist < 1e-6) continue;
                    var cosDot = L.direction.dot(sdelta.scale(1 / sdist));
                    cone = coneFactor(cosDot, L);
                    if (cone <= 0) continue;
                    toLightDir = new Vec3(-L.direction.x, -L.direction.y, -L.direction.z);
                    att = attenuation(sdist);
                } else {
                    // directional.direction — вектор, КУДА светит (от источника к сцене).
                    toLightDir = L.direction.scale(-1);
                }

                var lamberTerm = normalWorld.dot(toLightDir);
                if (lamberTerm <= 0) continue;

                var s = L.intensity * lamberTerm * att * cone;
                r += L.color[0] * s;
                g += L.color[1] * s;
                b += L.color[2] * s;
            }
        }

        return {
            r: clamp(r, 0, 1),
            g: clamp(g, 0, 1),
            b: clamp(b, 0, 1)
        };
    }

    // Яркость цвета (для выбора глифа из GlyphMap.RAMP): 0.3r + 0.59g + 0.11b.
    function luminance(rgb) {
        if (!rgb) return 0;
        return clamp(0.3 * rgb.r + 0.59 * rgb.g + 0.11 * rgb.b, 0, 1);
    }

    return {
        normalizeLight: normalizeLight,
        computeFaceLight: computeFaceLight,
        attenuation: attenuation,
        luminance: luminance
    };
})();
