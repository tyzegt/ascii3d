window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

A3D.modules.SceneLoader = (function () {
    'use strict';

    var Scene = A3D.modules.Scene;
    var Debug = A3D.modules.Debug;

    var MAX_DEPTH = 32;

    // Parses scene JSON data into a Scene. Unknown types / bad transforms are
    // logged and skipped — the loader never throws on malformed input.
    function load(data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            Debug.error('SceneLoader', 'load: invalid scene data, returning empty scene');
            return new Scene({});
        }

        var scene = new Scene({
            name: (typeof data.name === 'string') ? data.name : 'scene',
            camera: (data.camera && typeof data.camera === 'object') ? data.camera : null
        });

        var list = Array.isArray(data.objects) ? data.objects : [];
        for (var i = 0; i < list.length; i++) {
            try {
                var obj = createObject(list[i], i, 0);
                if (obj) scene.add(obj);
            } catch (e) {
                Debug.error('SceneLoader', 'failed to build object #' + i + ':', e && e.message ? e.message : e);
            }
        }

        return scene;
    }

    function createObject(data, index, depth) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            Debug.warn('SceneLoader', 'object #' + index + ': not an object, skipped');
            return null;
        }
        if (depth > MAX_DEPTH) {
            Debug.warn('SceneLoader', 'object #' + index + ': max depth exceeded, skipped');
            return null;
        }

        var type = typeof data.type === 'string' ? data.type : '';
        if (!type) {
            Debug.warn('SceneLoader', 'object #' + index + ': missing "type", skipped');
            return null;
        }
        if (!A3D.SceneRegistry.hasType(type)) {
            Debug.warn('SceneLoader', 'object #' + index + ': unknown type "' + type + '", skipped');
            return null;
        }

        var obj;
        try {
            obj = A3D.SceneRegistry.create(type, data);
        } catch (e) {
            Debug.error('SceneLoader', 'factory for "' + type + '" threw:', e && e.message ? e.message : e);
            return null;
        }
        if (!obj) return null;

        obj.name = (typeof data.name === 'string') ? data.name : '';
        applyTransform(obj, data, index);

        if (Array.isArray(data.children)) {
            for (var i = 0; i < data.children.length; i++) {
                var child = createObject(data.children[i], index + '.' + i, depth + 1);
                if (child) obj.add(child);
            }
        }

        return obj;
    }

    function applyTransform(obj, data, index) {
        try {
            obj.setTransform(data.position, data.rotation, data.scale);
        } catch (e) {
            Debug.warn('SceneLoader', 'object #' + index + ': bad transform, using defaults',
                e && e.message ? e.message : e);
        }
    }

    // Fetches a scene from a URL (requires a local server; fetch over file:// fails).
    function loadFromURL(url) {
        return fetch(url).then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        }).then(function (data) {
            return load(data);
        }, function (e) {
            Debug.error('SceneLoader', 'loadFromURL("' + url + '") failed:', e && e.message ? e.message : e);
            throw e;
        });
    }

    return {
        load: load,
        loadFromURL: loadFromURL
    };
})();
