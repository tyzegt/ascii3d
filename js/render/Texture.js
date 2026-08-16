window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

// Текстуры (этап C): ascii-текстура = сетка символов w×h + именованный реестр.
// sample(t, u, v) — bilinear-интерполяция интенсивности глифов с clamp;
// uvForFaceGroup(type, group) — UV [u0,v0,u1,v1,u2,v2] для угла грани по оси.
A3D.modules.Texture = (function () {
    'use strict';

    var Debug = A3D.modules.Debug;

    // Интенсивность символа: позиция в ramp-таблице / (длина-1) → 0..1.
    // Символы вне таблицы дают 0.5 (нейтрально).
    var RAMP_ORDER = ' .:-~*+#%@';
    function glyphIntensity(ch) {
        if (!ch || ch === ' ') return 0;
        var idx = RAMP_ORDER.indexOf(ch);
        if (idx < 0) return 0.5;
        return idx / (RAMP_ORDER.length - 1);
    }

    // Встроенные текстуры: именованные ascii-паттерны.
    var registry = {};

    function define(name, w, h, glyphs) {
        if (!name || typeof name !== 'string') return null;
        if (!w || !h || w <= 0 || h <= 0) {
            Debug.warn('Texture', 'define("' + name + '"): bad size');
            return null;
        }
        // glyphs: строка (строки через \n или плоская) или массив строк/символов.
        var cells = new Array(w * h);
        if (typeof glyphs === 'string') {
            var lines = glyphs.split('\n');
            for (var y = 0; y < h; y++) {
                var line = (y < lines.length) ? lines[y] : '';
                for (var x = 0; x < w; x++) {
                    cells[y * w + x] = (x < line.length) ? line.charAt(x) : ' ';
                }
            }
        } else if (Array.isArray(glyphs)) {
            for (var y2 = 0; y2 < h; y2++) {
                var row = glyphs[y2];
                for (var x2 = 0; x2 < w; x2++) {
                    if (Array.isArray(row)) {
                        cells[y2 * w + x2] = (x2 < row.length) ? row[x2] : ' ';
                    } else if (typeof row === 'string') {
                        cells[y2 * w + x2] = (x2 < row.length) ? row.charAt(x2) : ' ';
                    } else {
                        cells[y2 * w + x2] = ' ';
                    }
                }
            }
        } else {
            Debug.warn('Texture', 'define("' + name + '"): bad glyphs, skipped');
            return null;
        }
        var tex = { name: name, w: w, h: h, cells: cells };
        registry[name] = tex;
        return tex;
    }

    function get(name) {
        return (name && typeof name === 'string') ? (registry[name] || null) : null;
    }

    // Bilinear семплинг интенсивности в точке (u,v) ∈ [0,1]² с clamp.
    // u — по горизонтали (x), v — по вертикали (y, 0 = верх).
    function sample(tex, u, v) {
        if (!tex || !tex.cells) return 0;
        var w = tex.w, h = tex.h;
        // clamp в [0,1]
        if (u < 0) u = 0; else if (u > 1) u = 1;
        if (v < 0) v = 0; else if (v > 1) v = 1;
        // пересчёт в пиксельные координаты (центр пикселя: (u*w - 0.5))
        var fx = u * w - 0.5;
        var fy = v * h - 0.5;
        var x0 = Math.floor(fx);
        var y0 = Math.floor(fy);
        var tx = fx - x0;
        var ty = fy - y0;
        // clamp индексов соседей
        function cl(i, max) { return i < 0 ? 0 : (i > max ? max : i); }
        var i00 = glyphIntensity(tex.cells[cl(y0, h - 1) * w + cl(x0, w - 1)]);
        var i10 = glyphIntensity(tex.cells[cl(y0, h - 1) * w + cl(x0 + 1, w - 1)]);
        var i01 = glyphIntensity(tex.cells[cl(y0 + 1, h - 1) * w + cl(x0, w - 1)]);
        var i11 = glyphIntensity(tex.cells[cl(y0 + 1, h - 1) * w + cl(x0 + 1, w - 1)]);
        var top = i00 + (i10 - i00) * tx;
        var bot = i01 + (i11 - i01) * tx;
        return top + (bot - top) * ty;
    }

    // UV для угла грани по оси нормали. Возвращает [u0,v0, u1,v1, u2,v2]
    // (параллельно f.indices). Оси выбираются по нормали:
    //   +x/-x → u = -z/w..+z/w, v = y/h (боковые грани)
    //   +y/-y → u = x/w..+x/w,     v = z/d (верх/низ)
    //   +z/-z → u = x/w..+x/w,     v = y/h (перед/зад)
    function uvForFaceGroup(meshType, group) {
        if (!meshType || !group) return null;
        var faces;
        if (meshType === 'cube') {
            // 6 групп по 2 триангла: back(-z), right(+x), front(+z), left(-x), top(+y), bottom(-y)
            var order = ['back', 'right', 'front', 'left', 'top', 'bottom'];
            var gi = order.indexOf(group);
            if (gi < 0) return null;
            faces = [gi * 2, gi * 2 + 1];
        } else if (meshType === 'pyramid') {
            var pOrder = ['back', 'right', 'front', 'left', 'bottom'];
            var pi = pOrder.indexOf(group);
            if (pi < 0) return null;
            faces = [pi];
        } else if (meshType === 'plane') {
            if (group !== 'top') return null;
            faces = null; // все грани
        } else if (meshType === 'sphere') {
            if (group !== 'surface') return null;
            faces = null; // все грани
        } else {
            return null;
        }
        return { meshType: meshType, group: group, faceIndices: faces };
    }

    // Генерирует f.uv для всех граней меша по нормали (flat UV на плоскую грань).
    // Вызывается после computeNormals(). Для plane/sphere — своя параметризация.
    function generateFaceUVs(mesh) {
        if (!mesh || !mesh.faces || !mesh.vertices) return;
        var type = mesh.meshType;
        if (type === 'sphere') {
            generateSphereUVs(mesh);
            return;
        }
        var bb = null;
        for (var i = 0; i < mesh.faces.length; i++) {
            var f = mesh.faces[i];
            var n = f.normal;
            if (!n) continue;
            // bbox для нормализации (лениво)
            if (!bb) {
                bb = { minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity };
                for (var vi = 0; vi < mesh.vertices.length; vi++) {
                    var v = mesh.vertices[vi];
                    if (v.x < bb.minX) bb.minX = v.x;
                    if (v.y < bb.minY) bb.minY = v.y;
                    if (v.z < bb.minZ) bb.minZ = v.z;
                    if (v.x > bb.maxX) bb.maxX = v.x;
                    if (v.y > bb.maxY) bb.maxY = v.y;
                    if (v.z > bb.maxZ) bb.maxZ = v.z;
                }
            }
            var wx = Math.max(1e-6, bb.maxX - bb.minX);
            var wy = Math.max(1e-6, bb.maxY - bb.minY);
            var wz = Math.max(1e-6, bb.maxZ - bb.minZ);
            f.uv = faceUVByNormal(n, mesh, f, wx, wy, wz, bb);
        }
    }

    // UV одного треугольника по его нормали (оси в плоскости грани).
    function faceUVByNormal(n, mesh, f, wx, wy, wz, bb) {
        var ax = n.x < -0.9 ? 1 : (n.x > 0.9 ? -1 : 0); // ось x для u/v
        var ay = n.y < -0.9 ? 1 : (n.y > 0.9 ? -1 : 0);
        var az = n.z < -0.9 ? 1 : (n.z > 0.9 ? -1 : 0);
        // выбираем две оси, перпендикулярные нормали
        var uAxis, vAxis;
        if (Math.abs(n.x) >= Math.abs(n.y) && Math.abs(n.x) >= Math.abs(n.z)) {
            uAxis = 'z'; vAxis = 'y';
        } else if (Math.abs(n.y) >= Math.abs(n.z)) {
            uAxis = 'x'; vAxis = 'z';
        } else {
            uAxis = 'x'; vAxis = 'y';
        }
        var uv = [0, 0, 0, 0, 0, 0];
        for (var k = 0; k < 3; k++) {
            var idx = f.indices[k];
            var v = mesh.vertices[idx];
            var uVal, vVal;
            if (uAxis === 'x') { uVal = (v.x - bb.minX) / wx; }
            else if (uAxis === 'y') { uVal = (v.y - bb.minY) / wy; }
            else { uVal = (v.z - bb.minZ) / wz; }
            if (vAxis === 'x') { vVal = (v.x - bb.minX) / wx; }
            else if (vAxis === 'y') { vVal = (v.y - bb.minY) / wy; }
            else { vVal = (v.z - bb.minZ) / wz; }
            // flip по признаку нормали для согласованного направления
            if (ax !== 0 && n.x < 0) uVal = 1 - uVal;
            if (ay !== 0 && n.y < 0) vVal = 1 - vVal;
            if (az !== 0 && n.z < 0) { uVal = 1 - uVal; }
            uv[k * 2] = uVal;
            uv[k * 2 + 1] = vVal;
        }
        return uv;
    }

    // UV сферы: параметризация (theta, phi) → u = theta/2π, v = phi/π.
    function generateSphereUVs(mesh) {
        var rings = mesh.rings || 10;
        var segs = mesh.segments || 14;
        for (var i = 0; i < mesh.faces.length; i++) {
            var f = mesh.faces[i];
            var uv = [0, 0, 0, 0, 0, 0];
            for (var k = 0; k < 3; k++) {
                var idx = f.indices[k];
                var v = mesh.vertices[idx];
                // theta: азимут вокруг Y, phi: от +Y (0) к -Y (π)
                var theta = Math.atan2(v.z, v.x);
                if (theta < 0) theta += 2 * Math.PI;
                var phi = Math.acos(Math.max(-1, Math.min(1, v.y)));
                uv[k * 2] = theta / (2 * Math.PI);
                uv[k * 2 + 1] = phi / Math.PI;
            }
            f.uv = uv;
        }
    }

    // Именованные текстуры по умолчанию (ascii-паттерны).
    define('brick', 8, 4, [
        '########',
        '#      #',
        '########',
        '#      #'
    ]);

    define('checker', 8, 4, [
        '#...#...',
        '..#. ...',
        '.##..##.',
        '....#...'
    ]);

    define('window', 6, 4, [
        '######',
        '#--##-',
        '#-##-#',
        '######'
    ]);

    define('grass', 8, 4, [
        '.~.:.~..',
        ':.~.:..:',
        '~..:~...',
        '..:..~..'
    ]);

    define('water', 8, 4, [
        '..~~....',
        '~~..~~..',
        '...~~~~.',
        '.~~...~.'
    ]);

    return {
        registry: registry,
        define: define,
        get: get,
        sample: sample,
        uvForFaceGroup: uvForFaceGroup,
        generateFaceUVs: generateFaceUVs,
        glyphIntensity: glyphIntensity
    };
})();
