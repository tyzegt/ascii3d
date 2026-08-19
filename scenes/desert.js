window.A3D = window.A3D || {};

// Built-in scene registered in the registry (works from file:// double-click).
// Пустыня в неоновом свете: «закат» — янтарный направленный свет + cyan-свечение
// у оазиса. Материалы насыщенные, земля тёмная для контраста.
A3D.SceneRegistry.registerScene('desert', {
    name: 'desert',
    camera: { position: [0, 1.8, 7], yaw: 0, pitch: -0.18 },
    lights: [
        // Неоновый «закат» справа-сверху (параллельный свет): градиент по граням.
        { "type": "directional", "color": [1, 0.55, 0.2], "intensity": 1.4, "direction": [-0.25, -0.7, 0.3] },
        // Cyan-свечение у оазиса (омни): холодный акцент в центре.
        { "type": "point", "color": [0.2, 0.9, 1], "intensity": 1.2, "position": [0, 2, -4] },
        // Magenta-подсветка с фланга: задние грани пирамид не чернеют.
        { "type": "point", "color": [0.9, 0.3, 0.8], "intensity": 1.0, "position": [-10, 4, -10] }
    ],
    objects: [
        // Тёмная земля (см. city_block — о размере 200): цвет света читается ярко.
        { "type": "plane", "name": "sand", "segments": 16, "size": 200, "color": [0.35, 0.28, 0.3] },
        // pyramids of the desert (clustered ahead of the camera)
        { "type": "pyramid", "name": "pyr_big",   "position": [-5, 0, -8],  "scale": [6, 5, 6], "texture": "checker", "color": [0.9, 0.5, 0.3] },
        { "type": "pyramid", "name": "pyr_mid",   "position": [5, 0, -10],  "scale": [4.5, 3.8, 4.5], "color": [1, 0.65, 0.25] },
        { "type": "pyramid", "name": "pyr_small", "position": [10, 0, -5],  "scale": [2.8, 2.2, 2.8], "color": [0.95, 0.45, 0.7] },
        { "type": "pyramid", "name": "pyr_distant", "position": [-11, 0, -14], "scale": [3.5, 2.6, 3.5], "color": [0.5, 0.7, 0.95] },
        // scattered rocks (small spheres squashed to the ground)
        { "type": "sphere", "name": "rock_1", "position": [2, 0.4, 2],   "scale": [1.2, 0.5, 1.0], "rings": 6, "segments": 8, "color": [0.7, 0.5, 0.6] },
        { "type": "sphere", "name": "rock_2", "position": [-3, 0.3, 4],  "scale": [0.8, 0.35, 0.9], "rings": 6, "segments": 8, "color": [0.55, 0.5, 0.7] },
        { "type": "sphere", "name": "rock_3", "position": [7, 0.5, -1],  "scale": [1.5, 0.6, 1.2], "rings": 6, "segments": 8, "color": [0.8, 0.55, 0.4] },
        // a lone traveler and an oasis orb (ярко-неоновое свечение)
        { "type": "character", "name": "traveler", "position": [-1, 0, 3] },
        { "type": "sphere", "name": "oasis_glow", "position": [0, 1.2, -4], "scale": [0.5, 0.5, 0.5], "rings": 8, "segments": 10, "color": [0.3, 1, 0.9] }
    ]
});
