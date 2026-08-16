window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

// Заготовка под освещение. Пока рендер использует константный символ полигона;
// здесь — математика интенсивности (Ламберт + заполняющий свет), чтобы в будущем
// Rasterizer мог выбирать символ из GlyphMap.RAMP по интенсивности грани.
A3D.modules.Colors = (function () {
    'use strict';

    var Vec3 = A3D.modules.Vec3;
    var GlyphMap = A3D.modules.GlyphMap;

    // Направленный свет (по умолчанию — сверху-сбоку, как солнце): вектор от
    // источника к сцене.
    var lightDir = new Vec3(-0.4, -1, -0.3).normalize();

    setLightDirection(lightDir);

    function setLightDirection(dir) {
        lightDir = dir.clone().normalize();
    }

    function getLightDirection() {
        return lightDir;
    }

    // Ламберт: intensity = clamp(dot(normal, -lightDir), 0..1).
    // lightDir указывает НАД объектом (от источника к сцене), поэтому берём
    // противоположное направление — от поверхности к источнику.
    function lambert(normal) {
        var d = normal.x * (-lightDir.x) + normal.y * (-lightDir.y) + normal.z * (-lightDir.z);
        return clamp(d, 0, 1);
    }

    // Ламберт + заполняющий свет (ambient), чтобы тёмные грани не исчезали.
    function intensity(normal, ambient) {
        if (ambient === undefined) ambient = 0.25;
        var base = lambert(normal);
        return clamp(ambient + (1 - ambient) * base, 0, 1);
    }

    // Символ по интенсивности (через GlyphMap.RAMP).
    function glyphForNormal(normal, ambient) {
        return GlyphMap.byIntensity(intensity(normal, ambient));
    }

    function clamp(v, a, b) {
        return v < a ? a : (v > b ? b : v);
    }

    return {
        setLightDirection: setLightDirection,
        getLightDirection: getLightDirection,
        lambert: lambert,
        intensity: intensity,
        glyphForNormal: glyphForNormal
    };
})();
