window.A3D = window.A3D || {};

// Рабочая сцена: небоскрёб в неоново-киберпанковом освещении —
// цветные point-света (magenta/cyan) + холодный направленный.
A3D.SceneRegistry.registerScene('skyscraper', {
    name: 'skyscraper',
    camera: { position: [0, 16, 38], yaw: 0, pitch: -0.18 },
    lights: [
        // Неоновая подсветка спереди-сверху (magenta).
        { "type": "point", "color": [1, 0.25, 0.85], "intensity": 1.6, "position": [0, 14, 8] },
        // Холодный направленный свет (ледяной cyan) — как лунный неон.
        { "type": "directional", "color": [0.35, 0.75, 1], "intensity": 1.0, "direction": [0.3, -0.8, 0.4] },
        // Заполняющие цветные point-света с противоположных сторон:
        // левые/задние грани получают cyan/magenta без тёмных зон.
        { "type": "point", "color": [0.2, 0.9, 1], "intensity": 1.5, "position": [-12, 10, -6] },
        { "type": "point", "color": [1, 0.3, 0.7], "intensity": 1.5, "position": [12, 10, -6] }
    ],
    objects: [
        // Тёмная земля: цвет неоновых огней читается на ней максимально ярко.
        { "type": "plane", "name": "ground", "segments": 16, "size": 200, "color": [0.25, 0.25, 0.32], "showEdges": false },
        {
            "type": "group", "name": "skyscraper", "position": [0, 0, 0],
            "children": [
                // Насыщенные материалы: neоновая цветокоррекция (Config.NEON_*)
                // делает грани яркими и цветными.
                { "type": "cube", "name": "podium", "position": [0, 1.5, 0], "scale": [6, 3, 6], "color": [0.95, 0.4, 0.85], "textures": { "front": "brick", "back": "brick", "left": "brick", "right": "brick" }, "showEdges": false },
                { "type": "cube", "name": "tower", "position": [0, 9, 0], "scale": [4, 12, 4], "color": [0.35, 0.85, 1], "textures": { "front": "window", "back": "window", "left": "window", "right": "window" }, "showEdges": false },
                { "type": "cube", "name": "crown", "position": [0, 16.5, 0], "scale": [2.5, 3, 2.5], "color": [1, 0.8, 0.3], "textures": { "front": "brick", "back": "brick", "left": "brick", "right": "brick" }, "showEdges": false },
                { "type": "pyramid", "name": "spire", "position": [0, 19.5, 0], "scale": [1.2, 3, 1.2], "color": [0.8, 0.4, 1], "showEdges": false }
            ]
        }
    ]
});
