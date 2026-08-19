window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

A3D.modules.GlyphMap = (function () {
    'use strict';

    var Config = A3D.modules.Config;

    // Символы по возрастанию интенсивности: от пустого к самому тёмному.
    var RAMP = [
        ' ', '.', ':', '-', '~', '*', '+', '#', '%', '@'
    ];

    return {
        RAMP: RAMP,

        getBase: function () {
            return Config.GLYPH_MAP.base;
        },

        getEdge: function () {
            return Config.GLYPH_MAP.edge;
        },

        getEmpty: function () {
            return Config.GLYPH_MAP.empty;
        },

        // intensity: 0..1 → символ из градиента (для будущего освещения).
        // Минимальный порог (Config.MIN_GLYPH_INTENSITY): при яркости ниже порога
        // рисуем RAMP[1] ('.'), а не RAMP[0] (' ') — тёмные объекты остаются видимыми.
        byIntensity: function (intensity) {
            var minI = (typeof Config.MIN_GLYPH_INTENSITY === 'number') ? Config.MIN_GLYPH_INTENSITY : 0;
            if (intensity <= 0 || intensity < minI) {
                return RAMP[1]; // '.' — минимально видимый глиф
            }
            if (intensity >= 1) {
                return RAMP[RAMP.length - 1];
            }
            var idx = Math.round(intensity * (RAMP.length - 1));
            if (idx < 1) idx = 1; // не ниже '.'
            return RAMP[idx];
        },

        // символ полигона по умолчанию (до появления освещения)
        polygon: function () {
            return Config.GLYPH_MAP.base;
        },

        // символ рёбер (отдельный проход контуров)
        edge: function () {
            return Config.GLYPH_MAP.edge;
        }
    };
})();
