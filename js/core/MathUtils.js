window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

A3D.modules.MathUtils = (function () {
    'use strict';

    function clamp(value, min, max) {
        return value < min ? min : (value > max ? max : value);
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function degToRad(deg) {
        return deg * Math.PI / 180;
    }

    function radToDeg(rad) {
        return rad * 180 / Math.PI;
    }

    return {
        clamp: clamp,
        lerp: lerp,
        degToRad: degToRad,
        radToDeg: radToDeg
    };
})();
