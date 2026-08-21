window.A3D = window.A3D || {};

// Демонстрация tile-текстур (этап D): ascii-паттерны «размножаются» на гранях.
// material.tile: [repeatU, repeatV] — сколько раз тайл повторяется по u/v;
// семплинг nearest+wrap (без bilinear-размытия) — кирпичи остаются чёткими.
// textureData: инлайн-ascii-сетка прямо в scene JSON (регистрируется в Texture).
A3D.SceneRegistry.registerScene('bricktown', {
    name: 'bricktown',
    camera: { position: [0, 8, 42], yaw: 0, pitch: -0.1 },
    lights: [
        { "type": "directional", "color": [1, 0.95, 0.85], "intensity": 1.1, "direction": [0.3, -0.8, 0.4] },
        { "type": "point", "color": [1, 0.55, 0.25], "intensity": 1.4, "position": [0, 6, 14] }
    ],
    objects: [
        // Земля: инлайн-текстура «мощение» + tile — паттерн из JSON размножается.
        {
            "type": "plane", "name": "ground", "segments": 16, "size": 200,
            "color": [0.5, 0.48, 0.45], "showEdges": false,
            "textureData": {
                "name": "cobbles",
                "rows": [
                    "o--o--o-",
                    "--oo--oo",
                    "o--o--o-",
                    "--oo--oo"
                ]
            },
            "texture": "cobbles",
            "tile": [24, 24]
        },
        // Дом A: встроенная кирпичная кладка (brickwall), tile по высоте.
        {
            "type": "cube", "name": "house_a", "position": [-10, 5, 0], "scale": [8, 10, 8],
            "color": [0.9, 0.45, 0.3], "showEdges": false,
            "textures": {
                "front": { "texture": "brickwall", "tile": [4, 6] },
                "back": { "texture": "brickwall", "tile": [4, 6] },
                "left": { "texture": "brickwall", "tile": [4, 6] },
                "right": { "texture": "brickwall", "tile": [4, 6] },
                "top": "checker"
            }
        },
        // Дом B: кирпичи с «лицом» (brickface) + окна на одной грани.
        {
            "type": "cube", "name": "house_b", "position": [10, 7, -4], "scale": [10, 14, 8],
            "color": [0.75, 0.5, 0.85], "showEdges": false,
            "textures": {
                "front": { "texture": "brickface", "tile": [5, 7] },
                "back": { "texture": "brickwall", "tile": [5, 7] },
                "left": "window",
                "right": { "texture": "window", "tile": [3, 4] }
            }
        },
        // Дом C: инлайн-текстура «плитка» прямо в JSON + tile.
        {
            "type": "cube", "name": "house_c", "position": [0, 3.5, -16], "scale": [7, 7, 7],
            "color": [0.4, 0.85, 0.9], "showEdges": false,
            "textureData": {
                "name": "tiles",
                "rows": [
                    "@@@.@@@.",
                    "@..@..@.",
                    "@..@..@.",
                    "@@@.@@@."
                ]
            },
            "textures": {
                "front": { "texture": "tiles", "tile": [3, 3] },
                "back": { "texture": "tiles", "tile": [3, 3] },
                "left": { "texture": "tiles", "tile": [3, 3] },
                "right": { "texture": "tiles", "tile": [3, 3] }
            }
        },
        // Башня: высокий repeat — кладка «растягивается» на всю высоту.
        {
            "type": "cube", "name": "tower", "position": [-2, 9, -2], "scale": [4, 18, 4],
            "color": [0.95, 0.7, 0.35], "showEdges": false,
            "textures": {
                "front": { "texture": "brickwall", "tile": [2, 10] },
                "back": { "texture": "brickwall", "tile": [2, 10] },
                "left": { "texture": "brickwall", "tile": [2, 10] },
                "right": { "texture": "brickwall", "tile": [2, 10] }
            }
        }
    ]
});
