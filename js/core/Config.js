window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

A3D.modules.Config = (function () {
    'use strict';

    var MathUtils = A3D.modules.MathUtils;

    return {
        FOV: 70,
        NEAR: 0.1,
        FAR: 500,
        SPEED: 8,
        SENSITIVITY: 0.003,
        MAX_DT: 0.1,
        PITCH_LIMIT: MathUtils.degToRad(89),
        GLYPH_MAP: {
            base: '#',
            edge: '@',
            empty: ' '
        }
    };
})();
