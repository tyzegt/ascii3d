window.A3D = window.A3D || {};

// Built-in scene registered in the registry (works from file:// double-click).
A3D.SceneRegistry.registerScene('city_block', {
    name: 'city_block',
    camera: { position: [0, 5, 20], yaw: 0, pitch: -0.2 },
    lights: [
        // Тёплый point-свет (омни) над городом: градиент по расстоянию + цвет.
        { "type": "point", "color": [1, 0.9, 0.7], "intensity": 1.2, "position": [0, 12, 6] },
        // Холодный направленный свет слева-сверху (как солнце): параллельный.
        { "type": "directional", "color": [0.75, 0.85, 1], "intensity": 0.9, "direction": [0.3, -0.8, 0.4] }
    ],
    objects: [
        // Большой плоский мир: при размере ~60 игрок у края (x≈±30) при наклоне
        // вниз смотрит ЗА грань и видит чёрный фон («просвечивание»). 200 единиц
        // — этого не достичь на текущей скорости, а сегментов всего 256.
        // Нейтральные (серые) материалы: цвет света (фонарик, лампы) читается
        // напрямую, без перемножения с палитрой meshId % 12.
        { "type": "plane", "name": "ground", "segments": 16, "size": 200, "color": [0.5, 0.5, 0.5] },
        {
            "type": "group",
            "name": "building_1",
            "position": [0, 0, 0],
            "children": [
                { "type": "cube",   "name": "body",   "position": [0, 3, 0], "scale": [4, 6, 4], "color": [0.75, 0.72, 0.68], "textures": { "front": "window", "back": "window", "left": "brick", "right": "brick" } },
                { "type": "sphere", "name": "dome",   "position": [0, 7, 0], "scale": [1.5, 1, 1.5], "color": [0.75, 0.72, 0.68] }
            ]
        },
        {
            "type": "group",
            "name": "building_2",
            "position": [8, 0, -4],
            "children": [
                { "type": "cube", "name": "body", "position": [0, 2.5, 0], "scale": [3, 5, 3], "color": [0.7, 0.68, 0.65], "texture": "brick" }
            ]
        },
        {
            "type": "group",
            "name": "building_3",
            "position": [-8, 0, -2],
            "children": [
                { "type": "cube", "name": "body", "position": [0, 2, 0], "scale": [3.5, 4, 3], "color": [0.72, 0.7, 0.66], "textures": { "front": "window", "back": "brick", "left": "brick", "right": "brick" } }
            ]
        },
        { "type": "pyramid",   "name": "tower",     "position": [10, 0, -8], "scale": [2, 4, 2], "color": [0.68, 0.66, 0.62] },
        { "type": "character", "name": "walker_1",  "position": [-6, 0, 3] },
        { "type": "sphere",    "name": "orb",       "position": [4, 2, 2],   "scale": [0.7, 0.7, 0.7], "color": [0.8, 0.78, 0.75] }
    ]
});
