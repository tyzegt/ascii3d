window.A3D = window.A3D || {};

// Демо освещения (этап B): один point-свет и один directional-свет.
// Теперь — в неоновой гамме: magenta «вывеска» + ледяной cyan направленный.
// Без источников сцена затемнена до AMBIENT; здесь — градиент глифов по граням,
// цветная подсветка от point-света и неоновые контуры (Config.EDGE_COLOR).
A3D.SceneRegistry.registerScene('light_demo', {
    name: 'light_demo',
    camera: { position: [0, 6, 22], yaw: 0, pitch: -0.25 },
    lights: [
        // Неоновая «вывеска» (magenta, омни) над сценой: градиент по расстоянию + цвет.
        { "type": "point", "color": [1, 0.3, 0.85], "intensity": 1.6, "position": [0, 9, 4] },
        // Ледяной направленный свет (cyan) слева-сверху: параллельный.
        { "type": "directional", "color": [0.35, 0.75, 1], "intensity": 1.0, "direction": [0.35, -0.8, 0.45] }
    ],
    objects: [
        // Тёмная земля: неоновые цвета света читаются максимально ярко.
        { "type": "plane", "name": "ground", "segments": 16, "size": 120, "color": [0.25, 0.25, 0.32] },
        {
            "type": "group",
            "name": "tower",
            "position": [0, 0, 0],
            "children": [
                { "type": "cube", "name": "body", "position": [0, 3, 0], "scale": [4, 6, 4], "color": [0.95, 0.4, 0.85] },
                { "type": "sphere", "name": "dome", "position": [0, 7, 0], "scale": [1.5, 1, 1.5], "color": [1, 0.8, 0.3] }
            ]
        },
        {
            "type": "group",
            "name": "block_2",
            "position": [9, 0, -3],
            "children": [
                { "type": "cube", "name": "body", "position": [0, 2.5, 0], "scale": [3, 5, 3], "color": [0.3, 0.85, 1] }
            ]
        },
        {
            "type": "group",
            "name": "block_3",
            "position": [-9, 0, -1],
            "children": [
                { "type": "cube", "name": "body", "position": [0, 2, 0], "scale": [3.5, 4, 3], "color": [0.6, 0.95, 0.4] }
            ]
        },
        { "type": "pyramid", "name": "tower_pyr", "position": [11, 0, -9], "scale": [2, 4, 2], "color": [0.85, 0.4, 1] },
        { "type": "character", "name": "walker", "position": [-6, 0, 4] },
        { "type": "sphere", "name": "orb", "position": [4, 1.5, 3], "scale": [0.8, 0.8, 0.8], "color": [1, 0.95, 0.6] }
    ]
});
