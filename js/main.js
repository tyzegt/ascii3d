window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

A3D.modules.Main = (function () {
    'use strict';

    var Debug = A3D.modules.Debug;
    var Config = A3D.modules.Config;

    var canvas = null;
    var ctx = null;
    var camera = null;
    var input = null;
    var hud = null;
    var lastTime = 0;
    var fps = 0;
    var fpsTimer = 0;
    var fpsFrames = 0;

    function boot() {
        var expected = [
            'Debug',
            'MathUtils',
            'Vec3',
            'Mat4',
            'Config',
            'Camera',
            'Input',
            'HUD'
        ];

        var missing = expected.filter(function (name) {
            return !A3D.modules[name];
        });

        if (missing.length > 0) {
            Debug.error('Main', 'missing modules:', missing.join(', '));
            return;
        }

        canvas = document.getElementById('canvas');
        if (!canvas) {
            Debug.error('Main', 'canvas element not found');
            return;
        }
        ctx = canvas.getContext('2d');

        camera = new A3D.modules.Camera();
        input = A3D.modules.Input;
        hud = A3D.modules.HUD;

        resize();
        window.addEventListener('resize', resize);

        input.init(canvas);
        hud.init();
        hud.setSceneName('default');

        document.addEventListener('keydown', function (e) {
            if (e.code === 'KeyR') {
                camera.reset();
                Debug.log('Main', 'camera reset');
            } else if (e.code === 'KeyH') {
                hud.toggle();
            }
        });

        var loaded = Object.keys(A3D.modules).sort();
        Debug.log('Main', 'loaded modules:', loaded.join(', '));
        Debug.log('Main', 'canvas ready:', canvas.id);

        lastTime = performance.now();
        requestAnimationFrame(frame);
    }

    function resize() {
        var dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        camera.aspect = window.innerWidth / window.innerHeight;
    }

    function frame(now) {
        var dt = (now - lastTime) / 1000;
        lastTime = now;
        if (dt > Config.MAX_DT) {
            dt = Config.MAX_DT;
        }

        input.update(camera, dt);

        fpsFrames++;
        fpsTimer += dt;
        if (fpsTimer >= 0.5) {
            fps = Math.round(fpsFrames / fpsTimer);
            fpsFrames = 0;
            fpsTimer = 0;
        }

        render();
        hud.update(camera, fps);
        requestAnimationFrame(frame);
    }

    function render() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
