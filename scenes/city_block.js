window.A3D = window.A3D || {};

// Built-in scene registered in the registry (works from file:// double-click).
// Неоново-киберпанковый город: цветные вывески (point-света magenta/cyan/yellow)
// + холодный направленный. Тёмная земля, насыщенные материалы зданий.
A3D.SceneRegistry.registerScene('city_block', {
    name: 'city_block',
    camera: { position: [0, 5, 20], yaw: 0, pitch: -0.2 },
    lights: [
        // Неоновая вывеска (magenta) над городом: градиент по расстоянию + цвет.
        { "type": "point", "color": [1, 0.3, 0.85], "intensity": 1.6, "position": [0, 12, 6] },
        // Холодный направленный свет (ледяной cyan) слева-сверху.
        { "type": "directional", "color": [0.35, 0.75, 1], "intensity": 1.0, "direction": [0.3, -0.8, 0.4] },
        // Заполняющие цветные огни с флангов: задние грани не чернеют.
        { "type": "point", "color": [0.25, 0.9, 1], "intensity": 1.3, "position": [-14, 6, -8] },
        { "type": "point", "color": [1, 0.75, 0.25], "intensity": 1.3, "position": [14, 6, -8] }
    ],
    objects: [
        // Тёмная земля (см. city_block — о размере 200): неоновые огни на ней
        // дают максимальный контраст.
        { "type": "plane", "name": "ground", "segments": 16, "size": 200, "color": [0.25, 0.25, 0.32] },
        {
            "type": "group",
            "name": "building_1",
            "position": [0, 0, 0],
            "children": [
                { "type": "cube",   "name": "body",   "position": [0, 3, 0], "scale": [4, 6, 4], "color": [0.95, 0.4, 0.85], "textures": { "front": "window", "back": "window", "left": "brick", "right": "brick" } },
                { "type": "sphere", "name": "dome",   "position": [0, 7, 0], "scale": [1.5, 1, 1.5], "color": [1, 0.8, 0.3] }
            ]
        },
        {
            "type": "group",
            "name": "building_2",
            "position": [8, 0, -4],
            "children": [
                { "type": "cube", "name": "body", "position": [0, 2.5, 0], "scale": [3, 5, 3], "color": [0.3, 0.85, 1], "texture": "brick" }
            ]
        },
        {
            "type": "group",
            "name": "building_3",
            "position": [-8, 0, -2],
            "children": [
                { "type": "cube", "name": "body", "position": [0, 2, 0], "scale": [3.5, 4, 3], "color": [0.6, 0.95, 0.4], "textures": { "front": "window", "back": "brick", "left": "brick", "right": "brick" } }
            ]
        },
        { "type": "pyramid",   "name": "tower",     "position": [10, 0, -8], "scale": [2, 4, 2], "color": [0.85, 0.4, 1] },
        { "type": "character", "name": "walker_1",  "position": [-6, 0, 3] },
        { "type": "sphere",    "name": "orb",       "position": [4, 2, 2],   "scale": [0.7, 0.7, 0.7], "color": [1, 0.95, 0.6] }
    ]
});
