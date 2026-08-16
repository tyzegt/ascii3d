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

        // intensity: 0..1 → символ из градиента (для будущего освещения)
        byIntensity: function (intensity) {
            if (intensity <= 0) {
                return RAMP[0];
            }
            if (intensity >= 1) {
                return RAMP[RAMP.length - 1];
            }
            var idx = Math.round(intensity * (RAMP.length - 1));
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
