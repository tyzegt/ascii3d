window.A3D = window.A3D || {};

// Демо освещения (этап B): один point-свет и один directional-свет.
// Без источников сцена затемнена до AMBIENT (0.1); здесь — градиент глифов по
// граням: освещённые/теневые стороны, цветная подсветка от point-света.
A3D.SceneRegistry.registerScene('light_demo', {
    name: 'light_demo',
    camera: { position: [0, 6, 22], yaw: 0, pitch: -0.25 },
    lights: [
        // Тёплый point-свет (омни) над сценой: градиент по расстоянию + цвет.
        { "type": "point", "color": [1, 0.85, 0.6], "intensity": 1.2, "position": [0, 9, 4] },
        // Холодный направленный свет слева-сверху (как солнце): параллельный.
        { "type": "directional", "color": [0.7, 0.85, 1], "intensity": 0.9, "direction": [0.35, -0.8, 0.45] }
    ],
    objects: [
        { "type": "plane", "name": "ground", "segments": 16, "size": 120 },
        {
            "type": "group",
            "name": "tower",
            "position": [0, 0, 0],
            "children": [
                { "type": "cube", "name": "body", "position": [0, 3, 0], "scale": [4, 6, 4] },
                { "type": "sphere", "name": "dome", "position": [0, 7, 0], "scale": [1.5, 1, 1.5] }
            ]
        },
        {
            "type": "group",
            "name": "block_2",
            "position": [9, 0, -3],
            "children": [
                { "type": "cube", "name": "body", "position": [0, 2.5, 0], "scale": [3, 5, 3] }
            ]
        },
        {
            "type": "group",
            "name": "block_3",
            "position": [-9, 0, -1],
            "children": [
                { "type": "cube", "name": "body", "position": [0, 2, 0], "scale": [3.5, 4, 3] }
            ]
        },
        { "type": "pyramid", "name": "tower_pyr", "position": [11, 0, -9], "scale": [2, 4, 2] },
        { "type": "character", "name": "walker", "position": [-6, 0, 4] },
        { "type": "sphere", "name": "orb", "position": [4, 1.5, 3], "scale": [0.8, 0.8, 0.8] }
    ]
});
