window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

// Устаревшая заготовка под освещение (этапы 0–6). Математика переехала в
// js/render/Lighting.js (этап B): источники света сцены, Ламберт + ambient,
// point/directional, аттенюация. Здесь остаётся тонкая обёртка для обратной
// совместимости: по умолчанию — один направленный свет сверху-сбоку.
A3D.modules.Colors = (function () {
    'use strict';

    var Vec3 = A3D.modules.Vec3;
    var GlyphMap = A3D.modules.GlyphMap;
    var Lighting = A3D.modules.Lighting;
    var Config = A3D.modules.Config;

    // Направленный свет (по умолчанию — сверху-сбоку, как солнце): вектор от
    // источника к сцене.
    var lightDir = new Vec3(-0.4, -1, -0.3).normalize();

    function setLightDirection(dir) {
        lightDir = dir.clone().normalize();
    }

    function getLightDirection() {
        return lightDir;
    }

    // Ламберт: clamp(dot(normal, -lightDir), 0..1).
    function lambert(normal) {
        var d = normal.x * (-lightDir.x) + normal.y * (-lightDir.y) + normal.z * (-lightDir.z);
        return d < 0 ? 0 : (d > 1 ? 1 : d);
    }

    // Ламберт + заполняющий свет (ambient), чтобы тёмные грани не исчезали.
    function intensity(normal, ambient) {
        if (ambient === undefined) ambient = Config.AMBIENT;
        var base = lambert(normal);
        return Math.max(0, Math.min(1, ambient + (1 - ambient) * base));
    }

    // Свет на грань через Lighting (белый directional-свет по lightDir).
    function faceLight(normalWorld, posWorld) {
        var L = Lighting.normalizeLight({
            type: 'directional',
            color: [1, 1, 1],
            intensity: 1 - Config.AMBIENT,
            direction: [lightDir.x, lightDir.y, lightDir.z]
        });
        return Lighting.computeFaceLight(normalWorld, posWorld || new Vec3(0, 0, 0), [L]);
    }

    // Символ по интенсивности (через GlyphMap.RAMP).
    function glyphForNormal(normal, ambient) {
        return GlyphMap.byIntensity(intensity(normal, ambient));
    }

    return {
        setLightDirection: setLightDirection,
        getLightDirection: getLightDirection,
        lambert: lambert,
        intensity: intensity,
        faceLight: faceLight,
        glyphForNormal: glyphForNormal
    };
})();
