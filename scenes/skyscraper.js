window.A3D = window.A3D || {};

// Рабочая сцена: создание модели небоскрёба (болванка).
A3D.SceneRegistry.registerScene('skyscraper', {
    name: 'skyscraper',
    camera: { position: [0, 16, 38], yaw: 0, pitch: -0.18 },
    lights: [
        { "type": "point", "color": [1, 0.9, 0.7], "intensity": 1.2, "position": [0, 14, 8] },
        { "type": "directional", "color": [0.75, 0.85, 1], "intensity": 0.9, "direction": [0.3, -0.8, 0.4] },
        // Равномерность: два заполняющих point-света с противоположных сторон —
        // левые/задние грани получают свет без заметных тёмных зон.
        { "type": "point", "color": [0.9, 0.95, 1], "intensity": 1.4, "position": [-12, 10, -6] },
        { "type": "point", "color": [0.9, 0.95, 1], "intensity": 1.4, "position": [12, 10, -6] }
    ],
    objects: [
        { "type": "plane", "name": "ground", "segments": 16, "size": 200, "color": [0.5, 0.5, 0.5], "showEdges": false },
        {
            "type": "group", "name": "skyscraper", "position": [0, 0, 0],
            "children": [
                { "type": "cube", "name": "podium", "position": [0, 1.5, 0], "scale": [6, 3, 6], "color": [0.72, 0.7, 0.66], "textures": { "front": "brick", "back": "brick", "left": "brick", "right": "brick" }, "showEdges": false },
                { "type": "cube", "name": "tower", "position": [0, 9, 0], "scale": [4, 12, 4], "color": [0.78, 0.76, 0.72], "textures": { "front": "window", "back": "window", "left": "window", "right": "window" }, "showEdges": false },
                { "type": "cube", "name": "crown", "position": [0, 16.5, 0], "scale": [2.5, 3, 2.5], "color": [0.74, 0.72, 0.68], "textures": { "front": "brick", "back": "brick", "left": "brick", "right": "brick" }, "showEdges": false },
                { "type": "pyramid", "name": "spire", "position": [0, 19.5, 0], "scale": [1.2, 3, 1.2], "color": [0.68, 0.66, 0.62], "showEdges": false }
            ]
        }
    ]
});
