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
        TURN_SPEED: 2.5,
        LOOK_SPEED: 1.5,
        MAX_DT: 0.1,
        PITCH_LIMIT: MathUtils.degToRad(89),
        DEFAULT_SCENE: 'city_block',
        GLYPH_MAP: {
            base: '#',
            edge: '@',
            empty: ' '
        },
        // Освещение (этап B): глобальный заполняющий свет — доля белого,
        // добавляемая ко всем граням. 0.1 → тёмная сцена без источников
        // (~90% затемнения), но читаемая.
        AMBIENT: 0.1,
        // Коэффициент аттенюации point/spot-света: attenuation = 1/(1 + K*d^2).
        // K=0.08 → на d=5 затухание ~0.2 (заметный градиент в пределах сцены).
        POINT_ATTENUATION_K: 0.08,
        // Фонарик (spot-свет, привязанный к камере, клавиша F): ярко-бело-жёлтый.
        FLASHLIGHT_COLOR: [1.0, 0.95, 0.7],
        FLASHLIGHT_INTENSITY: 3.0,
        // Half-angle of the beam cone (radians). ~40° — широкий пучок фонарика:
        // соседние грани угла здания попадают в конус и получают градиент.
        SPOT_CONE_HALF_ANGLE: MathUtils.degToRad(40),
        // Share of the hard core inside the cone (1 = sharp edge, 0 = full falloff).
        SPOT_INNER_CONE: 0.3,
        // Цвет рёбер при освещении (r,g,b 0..1) — контуры читаются даже на
        // затемнённых гранях.
        EDGE_COLOR: [0.35, 0.35, 0.35],
        // Палитра "цветов": каждый меш рисуется своим цветом (canvas), чтобы
        // объекты визуально различались. Индекс = meshId % длина.
        MESH_PALETTE: [
            '#0f0', '#0ff', '#ff0', '#f0f', '#f80', '#f44', '#88f', '#fff',
            '#4f4', '#fa0', '#4ff', '#f6a'
        ]
    };
})();
