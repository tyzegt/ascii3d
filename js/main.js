window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

A3D.modules.Main = (function () {
    'use strict';

    var Debug = A3D.modules.Debug;

    function boot() {
        var expected = [
            'Debug',
            'MathUtils',
            'Vec3',
            'Mat4',
            'Config'
        ];

        var missing = expected.filter(function (name) {
            return !A3D.modules[name];
        });

        if (missing.length > 0) {
            Debug.error('Main', 'missing modules:', missing.join(', '));
            return;
        }

        var canvas = document.getElementById('canvas');
        if (!canvas) {
            Debug.error('Main', 'canvas element not found');
            return;
        }

        var loaded = Object.keys(A3D.modules).sort();
        Debug.log('Main', 'loaded modules:', loaded.join(', '));
        Debug.log('Main', 'canvas ready:', canvas.id);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
