window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

A3D.modules.Input = (function () {
    'use strict';

    var MathUtils = A3D.modules.MathUtils;
    var Config = A3D.modules.Config;
    var Debug = A3D.modules.Debug;

    var keys = {};
    var mouseDX = 0;
    var mouseDY = 0;
    var locked = false;
    var canvas = null;

    var ARROWS = [
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
        'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE',
        'KeyR', 'KeyH', 'Tab'
    ];

    function isPointerLocked() {
        return document.pointerLockElement === canvas;
    }

    function onKeyDown(e) {
        if (e.code === 'Tab') {
            e.preventDefault();
        }
        if (ARROWS.indexOf(e.code) !== -1) {
            e.preventDefault();
        }
        if (keys[e.code]) {
            return;
        }
        keys[e.code] = true;
        if (e.code >= 'Digit1' && e.code <= 'Digit9') {
            var num = parseInt(e.code.charAt(5), 10);
            Debug.log('Input', 'hotkey: add primitive ' + num);
        }
    }

    function onKeyUp(e) {
        keys[e.code] = false;
    }

    function onMouseMove(e) {
        if (!locked) {
            return;
        }
        mouseDX += e.movementX;
        mouseDY += e.movementY;
    }

    function onClick() {
        if (!locked && canvas.requestPointerLock) {
            var result = canvas.requestPointerLock();
            if (result && result.catch) {
                result.catch(function (err) {
                    Debug.warn('Input', 'pointer lock request failed:', err && err.message);
                });
            }
        }
    }

    function onPointerLockChange() {
        locked = isPointerLocked();
        if (!locked) {
            mouseDX = 0;
            mouseDY = 0;
        }
    }

    return {
        init: function (canvasEl) {
            canvas = canvasEl;
            document.addEventListener('keydown', onKeyDown);
            document.addEventListener('keyup', onKeyUp);
            document.addEventListener('mousemove', onMouseMove);
            canvas.addEventListener('click', onClick);
            document.addEventListener('pointerlockchange', onPointerLockChange);
            Debug.log('Input', 'initialized');
        },

        isDown: function (code) {
            return !!keys[code];
        },

        consumeMouseDelta: function () {
            var dx = mouseDX;
            var dy = mouseDY;
            mouseDX = 0;
            mouseDY = 0;
            return { x: dx, y: dy };
        },

        isLocked: function () {
            return locked;
        },

        update: function (camera, dt) {
            var move = 0;
            var strafe = 0;
            var lift = 0;
            var turn = 0;
            var look = 0;

            if (keys['KeyW'] || keys['ArrowUp']) {
                move += 1;
            }
            if (keys['KeyS'] || keys['ArrowDown']) {
                move -= 1;
            }
            if (keys['KeyD']) {
                strafe += 1;
            }
            if (keys['KeyA']) {
                strafe -= 1;
            }
            if (keys['ArrowRight']) {
                turn += 1;
            }
            if (keys['ArrowLeft']) {
                turn -= 1;
            }
            if (keys['KeyE']) {
                lift += 1;
            }
            if (keys['KeyQ']) {
                lift -= 1;
            }

            var delta = this.consumeMouseDelta();
            if (locked) {
                camera.rotate(delta.x * Config.SENSITIVITY, delta.y * Config.SENSITIVITY);
            }
            if (turn !== 0) {
                camera.rotate(turn * Config.SENSITIVITY * 15 * dt, 0);
            }
            if (move !== 0) {
                camera.moveForward(move * Config.SPEED * dt);
            }
            if (strafe !== 0) {
                camera.moveRight(strafe * Config.SPEED * dt);
            }
            if (lift !== 0) {
                camera.moveUp(lift * Config.SPEED * dt);
            }
        }
    };
})();
