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
    var menu = null;
    var debugConsole = null;
    var frameBuffer = null;
    var scene = null;
    var charW = 0;
    var charH = 0;
    var lastTime = 0;
    var fps = 0;
    var fpsTimer = 0;
    var fpsFrames = 0;

    // Фонарик: spot-свет, привязанный к камере (клавиша F).
    var flashlightOn = false;

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
            'Lighting',
            'Texture',
            'Projection',
            'Rasterizer',
            'FrameBuffer',
            'HUD',
            'SceneMenu',
            'DebugConsole'
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
        menu = A3D.modules.SceneMenu;
        debugConsole = A3D.modules.DebugConsole;
        frameBuffer = new A3D.modules.FrameBuffer();

        registerPrimitiveTypes();
        loadSceneFromURLParam();

        resize();
        window.addEventListener('resize', resize);

        input.init(canvas);
        hud.init();
        hud.setSceneName(scene ? scene.name : 'default');
        menu.init(onMenuPick);
        debugConsole.init(camera);

        input.onKeydown(onHotkey);

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

    // ?scene=<name> picks a registered scene; default is Config.DEFAULT_SCENE.
    function loadSceneFromURLParam() {
        var R = A3D.SceneRegistry;
        var name = null;
        try {
            var match = /[?&]scene=([^&]+)/.exec(window.location.search);
            if (match) name = decodeURIComponent(match[1]);
        } catch (e) { /* ignore bad URL */ }

        var data = (name && R.getScene(name)) ? R.getScene(name) : null;
        if (!data) {
            data = R.getScene(A3D.modules.Config.DEFAULT_SCENE) || { name: 'empty', objects: [] };
        }
        var loaded = A3D.modules.SceneLoader.load(data);
        if (loaded) loaded.assignMeshIds();
        applyScene(loaded);
    }

    // One-shot hotkeys: menu, camera reset, HUD, add primitive, save scene.
    function onHotkey(e) {
        if (e.code === 'Tab') {
            menu.toggle();
            return;
        }
        if (menu.isOpen()) {
            if (e.code === 'Escape' || e.code === 'Enter') {
                e.preventDefault();
                if (e.code === 'Enter') {
                    menu.activate();
                } else {
                    menu.toggle();
                }
            } else if (e.code === 'ArrowUp') {
                e.preventDefault();
                menu.move(-1);
            } else if (e.code === 'ArrowDown') {
                e.preventDefault();
                menu.move(1);
            }
            return;
        }
        if (e.code === 'KeyR') {
            camera.reset();
            Debug.log('Main', 'camera reset');
        } else if (e.code === 'KeyH') {
            hud.toggle();
        } else if (e.code === 'KeyF') {
            toggleFlashlight();
        } else if (e.code === 'KeyP') {
            saveScene();
        } else if (e.code === 'Backquote' || e.code === 'IntlBackslash') {
            debugConsole.toggle();
        } else if (e.code >= 'Digit1' && e.code <= 'Digit9') {
            var num = parseInt(e.code.charAt(5), 10);
            addPrimitiveByHotkey(num);
        }
    }

    // Scene picked from the Tab menu: name (built-in) or raw data (file).
    function onMenuPick(name, rawData) {
        var data = rawData || (name ? A3D.SceneRegistry.getScene(name) : null);
        if (!data) {
            Debug.warn('Main', 'menu pick: unknown scene "' + name + '"');
            return;
        }
        var picked = A3D.modules.SceneLoader.load(data);
        if (picked) picked.assignMeshIds();
        applyScene(picked);
    }

    function applyScene(newScene) {
        scene = newScene;
        // Новый список lights из сцены: фонарик добавляется поверх него.
        removeFlashlightLight();
        if (scene && scene.camera && scene.camera.position) {
            var c = scene.camera;
            camera.setView(
                [c.position[0] || 0, c.position[1] || 0, c.position[2] || 0],
                c.yaw || 0,
                c.pitch || 0
            );
        }
        hud.setSceneName(scene ? scene.name : 'default');
        Debug.log('Main', 'scene loaded: "' + (scene && scene.name) + '"');
    }

    // Фонарик —spot-свет в scene.lights; позиция/направление обновляются
    // каждый кадр из камеры (updateFlashlight), поэтому он следует за взглядом.
    function toggleFlashlight() {
        if (!scene) return;
        flashlightOn = !flashlightOn;
        if (flashlightOn) {
            var L = A3D.modules.Lighting.normalizeLight({
                type: 'spot',
                color: Config.FLASHLIGHT_COLOR,
                intensity: Config.FLASHLIGHT_INTENSITY,
                position: [camera.position.x, camera.position.y, camera.position.z],
                direction: [0, 0, -1],
                coneHalfAngle: Config.SPOT_CONE_HALF_ANGLE,
                innerCone: Config.SPOT_INNER_CONE
            });
            if (L) {
                L._flashlight = true;
                scene.lights.push(L);
            }
            Debug.log('Main', 'flashlight ON');
        } else {
            removeFlashlightLight();
            Debug.log('Main', 'flashlight OFF');
        }
    }

    function updateFlashlight() {
        if (!flashlightOn || !scene) return;
        for (var i = scene.lights.length - 1; i >= 0; i--) {
            var L = scene.lights[i];
            if (!L || !L._flashlight) continue;
            L.position.x = camera.position.x;
            L.position.y = camera.position.y;
            L.position.z = camera.position.z;
            var fwd = camera.forward();
            L.direction.x = fwd.x;
            L.direction.y = fwd.y;
            L.direction.z = fwd.z;
        }
    }

    function removeFlashlightLight() {
        if (!scene) return;
        for (var i = scene.lights.length - 1; i >= 0; i--) {
            if (scene.lights[i] && scene.lights[i]._flashlight) {
                scene.lights.splice(i, 1);
            }
        }
    }

    // Hotkeys 1-9 spawn a primitive in front of the camera.
    var HOTKEY_PRIMITIVES = ['cube', 'sphere', 'pyramid', 'plane', 'character'];

    function addPrimitiveByHotkey(num) {
        if (!scene) return;
        var type = HOTKEY_PRIMITIVES[num - 1];
        if (!type || !A3D.SceneRegistry.hasType(type)) {
            Debug.warn('Main', 'hotkey ' + num + ': no primitive assigned');
            return;
        }
        try {
            var obj = A3D.SceneRegistry.create(type, {});
            if (!obj) return;

            // place ~4 units in front of the camera, dropped to y=0 for ground types
            var fwd = camera.forward();
            var pos = [
                camera.position.x + fwd.x * 4,
                camera.position.y + fwd.y * 4,
                camera.position.z + fwd.z * 4
            ];
            if (type === 'plane') {
                pos[1] = 0;
            } else if (type !== 'sphere') {
                pos[1] = Math.max(0, pos[1]);
            }
            obj.name = type + '_' + (scene.objects.length + 1);
            obj.setTransform(pos, null, null);
            scene.add(obj);
            Debug.log('Main', 'added "' + obj.name + '" (' + type + ') at [' +
                pos[0].toFixed(2) + ', ' + pos[1].toFixed(2) + ', ' + pos[2].toFixed(2) + ']');
        } catch (e) {
            Debug.error('Main', 'hotkey add failed:', e && e.message ? e.message : e);
        }
    }

    // Saves the current scene as a downloadable JSON file (works on file:// too).
    function saveScene() {
        if (!scene) return;
        try {
            var json = JSON.stringify(scene.toJSON(), null, 2);
            var blob = new Blob([json], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = (scene.name || 'scene') + '.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
            Debug.log('Main', 'scene saved: ' + a.download + ' (' + json.length + ' bytes)');
        } catch (e) {
            Debug.error('Main', 'save failed:', e && e.message ? e.message : e);
        }
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
        updateFlashlight();

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

        frameBuffer.clear();

        if (scene) {
            var Rasterizer = A3D.modules.Rasterizer;
            var viewMatrix = camera.getViewMatrix();
            var projMatrix = camera.getProjectionMatrix();
            // ascii-ячейка выше, чем шире: компенсируем в проекции по y
            var aspect = charH / charW;
            Rasterizer.render(scene, camera, frameBuffer, viewMatrix, projMatrix, aspect);
        }

        frameBuffer.flush(ctx, charW, charH, Config.MESH_PALETTE);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
