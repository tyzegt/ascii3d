window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

A3D.modules.Debug = (function () {
    'use strict';

    var enabled = true;

    function log(tag) {
        if (!enabled) return;
        var args = Array.prototype.slice.call(arguments, 1);
        var line = ['[A3D:' + tag + ']'].concat(args);
        console.log.apply(console, line);
    }

    function warn(tag) {
        if (!enabled) return;
        var args = Array.prototype.slice.call(arguments, 1);
        var line = ['[A3D:' + tag + ']'].concat(args);
        console.warn.apply(console, line);
    }

    function error(tag) {
        var args = Array.prototype.slice.call(arguments, 1);
        var line = ['[A3D:' + tag + ']'].concat(args);
        console.error.apply(console, line);
    }

    return {
        log: log,
        warn: warn,
        error: error,
        setEnabled: function (value) { enabled = !!value; },
        isEnabled: function () { return enabled; }
    };
})();
