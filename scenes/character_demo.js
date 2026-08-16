window.A3D = window.A3D || {};

// Built-in scene registered in the registry (works from file:// double-click).
A3D.SceneRegistry.registerScene('character_demo', {
    name: 'character_demo',
    camera: { position: [0, 3, 12], yaw: 0, pitch: -0.1 },
    objects: [
        // Большой мир: см. city_block — маленький размер даёт «просвечивание» у края.
        { "type": "plane", "name": "floor", "segments": 16, "size": 200 },
        // a row of characters at different scales to show composition
        { "type": "character", "name": "hero",     "position": [-6, 0, 0], "scale": [1.2, 1.2, 1.2] },
        { "type": "character", "name": "companion","position": [0, 0, 0] },
        { "type": "character", "name": "scout",    "position": [6, 0, 0],  "scale": [0.8, 0.8, 0.8] },
        // a couple of props to frame the characters
        { "type": "cube",    "name": "crate",   "position": [-9, 0.5, -3], "scale": [1, 1, 1] },
        { "type": "pyramid", "name": "marker",  "position": [9, 0, -4],    "scale": [1.2, 1.6, 1.2] },
        { "type": "sphere",  "name": "beacon",  "position": [0, 2.5, -5],  "scale": [0.4, 0.4, 0.4], "rings": 8, "segments": 10 }
    ]
});
