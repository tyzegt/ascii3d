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
        DEFAULT_SCENE: 'city_block',
        GLYPH_MAP: {
            base: '#',
            edge: '@',
            empty: ' '
        },
        // Палитра "цветов": каждый меш рисуется своим глифом (и цветом canvas),
        // чтобы объекты визуально различались. Индекс = meshId % длина.
        MESH_PALETTE: [
            '#0f0', '#0ff', '#ff0', '#f0f', '#f80', '#f44', '#88f', '#fff',
            '#4f4', '#fa0', '#4ff', '#f6a'
        ]
    };
})();
