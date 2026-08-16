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
    var frameBuffer = null;
    var scene = null;
    var charW = 0;
    var charH = 0;
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
            'Object3D',
            'Mesh',
            'Cube',
            'Plane',
            'Sphere',
            'Pyramid',
            'Group',
            'Character',
            'Scene',
            'SceneLoader',
            'GlyphMap',
            'FrameBuffer',
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
        frameBuffer = new A3D.modules.FrameBuffer();

        registerPrimitiveTypes();
        loadSceneFromURLParam();

        resize();
        window.addEventListener('resize', resize);

        input.init(canvas);
        hud.init();
        hud.setSceneName(scene ? scene.name : 'default');

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
        if (scene) {
            Debug.log('Main', 'scene "' + scene.name + '": objects=' + scene.objects.length +
                ', faces=' + scene.countFaces() + ', registry scenes: ' + A3D.SceneRegistry.listScenes().join(', '));
        }

        lastTime = performance.now();
        requestAnimationFrame(frame);
    }

    // New primitive = one line here; SceneLoader stays untouched.
    function registerPrimitiveTypes() {
        var R = A3D.SceneRegistry;
        R.register('cube',      function (p) { return new A3D.modules.Cube(p); });
        R.register('plane',     function (p) { return new A3D.modules.Plane(p); });
        R.register('sphere',    function (p) { return new A3D.modules.Sphere(p); });
        R.register('pyramid',   function (p) { return new A3D.modules.Pyramid(p); });
        R.register('group',     function (p) { return new A3D.modules.Group(p); });
        R.register('character', function (p) { return A3D.modules.Character.build(p); });
    }

    // ?scene=<name> picks a registered scene; default is the first one.
    function loadSceneFromURLParam() {
        var SceneLoader = A3D.modules.SceneLoader;
        var R = A3D.SceneRegistry;
        var name = null;
        try {
            var match = /[?&]scene=([^&]+)/.exec(window.location.search);
            if (match) name = decodeURIComponent(match[1]);
        } catch (e) { /* ignore bad URL */ }

        var data = (name && R.getScene(name)) ? R.getScene(name) : null;
        if (!data) {
            var list = R.listScenes();
            data = list.length > 0 ? R.getScene(list[0]) : { name: 'empty', objects: [] };
        }
        scene = SceneLoader.load(data);
    }

    function resize() {
        var dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        camera.aspect = window.innerWidth / window.innerHeight;

        // Замер ширины/высоты ascii-ячейки в текущем шрифте.
        var fontPx = 16;
        ctx.font = fontPx + 'px monospace';
        charW = ctx.measureText('M').width || fontPx * 0.6;
        charH = fontPx;
        if (charW <= 0) {
            charW = fontPx * 0.6;
        }

        var cols = Math.max(1, Math.floor(canvas.width / charW));
        var rows = Math.max(1, Math.floor(canvas.height / charH));
        frameBuffer.resize(cols, rows);
        Debug.log('Main', 'resize:', canvas.width + 'x' + canvas.height +
            ' (dpr=' + dpr + '), grid: ' + cols + 'x' + rows +
            ', charW=' + charW.toFixed(2) + ', charH=' + charH.toFixed(2));
    }

    function frame(now) {
        var dt = (now - lastTime) / 1000;
        lastTime = now;
        if (dt > Config.MAX_DT) {
            dt = Config.MAX_DT;
        }

        input.update(camera, dt);
        if (scene) scene.update(dt);

        fpsFrames++;
        fpsTimer += dt;
        if (fpsTimer >= 0.5) {
            fps = Math.round(fpsFrames / fpsTimer);
            fpsFrames = 0;
            fpsTimer = 0;
        }

        render();
        var sceneInfo = scene ? (' [' + scene.name + '] faces=' + scene.countFaces()) : '';
        hud.update(camera, fps, frameBuffer.width + 'x' + frameBuffer.height + sceneInfo);
        requestAnimationFrame(frame);
    }

    function render() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0f0';

        frameBuffer.clear();
        drawDemoPattern(frameBuffer);
        frameBuffer.flush(ctx, charW, charH);
    }

    // Тестовый паттерн этапа 3: рамка + заполнение по модулю —
    // видно сетку, границы и корректность flush при любом размере окна.
    function drawDemoPattern(fb) {
        var w = fb.width;
        var h = fb.height;
        var GlyphMap = A3D.modules.GlyphMap;

        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var ch;
                if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
                    ch = GlyphMap.edge();
                } else if ((x + y) % 4 === 0) {
                    ch = GlyphMap.getBase();
                } else {
                    continue;
                }
                fb.setCell(x, y, ch);
            }
        }

        // Крест в центре — проверка координат сетки.
        var cx = w >> 1;
        var cy = h >> 1;
        for (var d = -3; d <= 3; d++) {
            fb.setCell(cx + d, cy, GlyphMap.edge());
            fb.setCell(cx, cy + d, GlyphMap.edge());
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
