window.A3D = window.A3D || {};

// Built-in scene registered in the registry (works from file:// double-click).
A3D.SceneRegistry.registerScene('desert', {
    name: 'desert',
    camera: { position: [0, 1.8, 7], yaw: 0, pitch: -0.18 },
    objects: [
        // Большой мир: см. city_block — маленький размер даёт «просвечивание» у края.
        { "type": "plane", "name": "sand", "segments": 16, "size": 200 },
        // pyramids of the desert (clustered ahead of the camera)
        { "type": "pyramid", "name": "pyr_big",   "position": [-5, 0, -8],  "scale": [6, 5, 6] },
        { "type": "pyramid", "name": "pyr_mid",   "position": [5, 0, -10],  "scale": [4.5, 3.8, 4.5] },
        { "type": "pyramid", "name": "pyr_small", "position": [10, 0, -5],  "scale": [2.8, 2.2, 2.8] },
        { "type": "pyramid", "name": "pyr_distant", "position": [-11, 0, -14], "scale": [3.5, 2.6, 3.5] },
        // scattered rocks (small spheres squashed to the ground)
        { "type": "sphere", "name": "rock_1", "position": [2, 0.4, 2],   "scale": [1.2, 0.5, 1.0], "rings": 6, "segments": 8 },
        { "type": "sphere", "name": "rock_2", "position": [-3, 0.3, 4],  "scale": [0.8, 0.35, 0.9], "rings": 6, "segments": 8 },
        { "type": "sphere", "name": "rock_3", "position": [7, 0.5, -1], "scale": [1.5, 0.6, 1.2], "rings": 6, "segments": 8 },
        // a lone traveler and an oasis orb
        { "type": "character", "name": "traveler", "position": [-1, 0, 3] },
        { "type": "sphere", "name": "oasis_glow", "position": [0, 1.2, -4], "scale": [0.5, 0.5, 0.5], "rings": 8, "segments": 10 }
    ]
});
