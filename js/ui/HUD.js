window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

A3D.modules.HUD = (function () {
    'use strict';

    var Debug = A3D.modules.Debug;

    var visible = true;
    var el = null;
    var fpsEl = null;
    var posEl = null;
    var rotEl = null;
    var sceneEl = null;
    var gridEl = null;
    var hintsEl = null;

    function build() {
        if (el) {
            return;
        }
        el = document.createElement('div');
        el.id = 'hud';
        el.style.position = 'fixed';
        el.style.top = '10px';
        el.style.left = '10px';
        el.style.zIndex = '10';
        el.style.color = '#0f0';
        el.style.fontFamily = 'monospace';
        el.style.fontSize = '13px';
        el.style.lineHeight = '1.5';
        el.style.textShadow = '0 0 4px #000';
        el.style.pointerEvents = 'none';
        el.style.whiteSpace = 'pre';
        el.innerHTML =
            '<span id="hud-fps">FPS: -</span>\n' +
            '<span id="hud-pos">pos: -</span>\n' +
            '<span id="hud-rot">rot: -</span>\n' +
            '<span id="hud-scene">scene: -</span>\n' +
            '<span id="hud-grid">grid: -</span>\n' +
            '<span id="hud-hints">WASD/QE move, arrows+ZX look, mouse look (click)\n' +
            '1-5 add obj, Tab menu, R reset, H hud, P save</span>';
        document.body.appendChild(el);
        fpsEl = document.getElementById('hud-fps');
        posEl = document.getElementById('hud-pos');
        rotEl = document.getElementById('hud-rot');
        sceneEl = document.getElementById('hud-scene');
        gridEl = document.getElementById('hud-grid');
        hintsEl = document.getElementById('hud-hints');
        Debug.log('HUD', 'initialized');
    }

    return {
        init: function () {
            build();
        },

        setVisible: function (value) {
            visible = !!value;
            if (el) {
                el.style.display = visible ? '' : 'none';
            }
        },

        toggle: function () {
            this.setVisible(!visible);
            return visible;
        },

        isVisible: function () {
            return visible;
        },

        setSceneName: function (name) {
            if (sceneEl) {
                sceneEl.textContent = 'scene: ' + name;
            }
        },

        update: function (camera, fps, grid) {
            if (!visible || !el) {
                return;
            }
            if (fpsEl && fps !== undefined) {
                fpsEl.textContent = 'FPS: ' + fps;
            }
            if (gridEl && grid) {
                gridEl.textContent = 'grid: ' + grid;
            }
            if (camera) {
                var p = camera.position;
                if (posEl) {
                    posEl.textContent = 'pos: ' +
                        p.x.toFixed(2) + ', ' +
                        p.y.toFixed(2) + ', ' +
                        p.z.toFixed(2);
                }
                if (rotEl) {
                    var rad2deg = 180 / Math.PI;
                    rotEl.textContent = 'yaw: ' +
                        (camera.yaw * rad2deg).toFixed(1) + '°, pitch: ' +
                        (camera.pitch * rad2deg).toFixed(1) + '°';
                }
            }
        }
    };
})();
