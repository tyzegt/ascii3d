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
    var keydownHandlers = [];

    var ARROWS = [
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
        'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE',
        'KeyZ', 'KeyX',
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
        // One-shot actions (save, add object, toggle menu) must fire only on a
        // genuine press -> release transition. OS auto-repeat (and some browsers'
        // quirk of not setting e.repeat reliably) otherwise re-triggers them while
        // a key is held. We latch on the FIRST keydown of a press and release it
        // on keyup, so repeats / held keys never re-fire.
        var wasHeld = !!keys[e.code];
        keys[e.code] = true;
        if (!wasHeld && !e.repeat) {
            for (var i = 0; i < keydownHandlers.length; i++) {
                try {
                    keydownHandlers[i](e);
                } catch (err) {
                    Debug.error('Input', 'keydown handler failed:', err && err.message ? err.message : err);
                }
            }
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

        // Registers a one-shot keydown handler (fires on every key-down,
        // independent of key repeat / held state).
        onKeydown: function (fn) {
            if (typeof fn === 'function') {
                keydownHandlers.push(fn);
            }
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

            if (keys['KeyZ']) {
                look -= 1;
            }
            if (keys['KeyX']) {
                look += 1;
            }

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
            if (look !== 0) {
                camera.rotate(0, look * Config.LOOK_SPEED * dt);
            }
            if (turn !== 0) {
                camera.rotate(turn * Config.TURN_SPEED * dt, 0);
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
