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

        // lights парсятся внутри Scene (normalizeLight, битые — с логом).
        var scene = new Scene({
            name: (typeof data.name === 'string') ? data.name : 'scene',
            camera: (data.camera && typeof data.camera === 'object') ? data.camera : null,
            lights: Array.isArray(data.lights) ? data.lights : []
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
        applyTextureData(data, index);
        applyTransform(obj, data, index);
        applyMaterial(obj, data, index);

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

    // Инлайн-текстура из JSON: data.textureData = { name?, rows: [...] }.
    // Регистрирует ascii-сетку в Texture под именем (name || data.texture),
    // чтобы материал мог ссылаться на неё как на обычную именованную текстуру.
    function applyTextureData(data, index) {
        if (!data.textureData || typeof data.textureData !== 'object') return;
        var Texture = A3D.modules.Texture;
        if (!Texture || !Texture.defineFromData) return;
        var fallbackName = (typeof data.texture === 'string') ? data.texture : null;
        var tex = Texture.defineFromData(data.textureData, fallbackName);
        if (!tex) {
            Debug.warn('SceneLoader', 'object #' + index + ': textureData not registered');
        }
    }

    // Значение текстуры в JSON: строка-имя или объект { texture, tile }.
    function normalizeTexSpec(v) {
        if (typeof v === 'string') return v;
        if (v && typeof v === 'object' && typeof v.texture === 'string') {
            var spec = { texture: v.texture };
            if (Array.isArray(v.tile) && v.tile.length >= 2) {
                spec.tile = [v.tile[0], v.tile[1]];
            }
            return spec;
        }
        return null;
    }

    // Материал (этап C): texture/textures/color из JSON объекта → obj.material.
    function applyMaterial(obj, data, index) {
        if (!obj.isMesh) return;
        var mat = null;
        if (typeof data.texture === 'string') {
            mat = { texture: data.texture };
            if (Array.isArray(data.tile) && data.tile.length >= 2) {
                mat.tile = [data.tile[0], data.tile[1]];
            }
        } else if (data.textures && typeof data.textures === 'object' && !Array.isArray(data.textures)) {
            var any = false;
            for (var g in data.textures) {
                if (!Object.prototype.hasOwnProperty.call(data.textures, g)) continue;
                var spec = normalizeTexSpec(data.textures[g]);
                if (spec) {
                    if (!mat) mat = { textures: {} };
                    mat.textures[g] = spec;
                    any = true;
                }
            }
            if (!any && mat === null) mat = null;
        }
        if (Array.isArray(data.color) && data.color.length >= 3) {
            if (!mat) mat = {};
            mat.color = [data.color[0], data.color[1], data.color[2]];
        }
        // showEdges: false → не рисовать рёбра контура (включая диагонали
        // триангуляции); true/отсутствует → как раньше.
        if (typeof data.showEdges === 'boolean') {
            if (!mat) mat = {};
            obj.showEdges = data.showEdges;
        }
        if (mat) obj.material = mat;
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
