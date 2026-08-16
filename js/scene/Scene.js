window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

A3D.modules.Scene = (function () {
    'use strict';

    var Debug = A3D.modules.Debug;

    function Scene(data) {
        data = data || {};
        this.name = data.name || 'scene';
        this.objects = [];
        if (data.camera) {
            this.camera = {
                position: data.camera.position,
                yaw: data.camera.yaw,
                pitch: data.camera.pitch
            };
        } else {
            this.camera = null;
        }
    }

    Scene.prototype.add = function (obj) {
        if (!obj) return null;
        obj.parent = null;
        obj.markDirty();
        this.objects.push(obj);
        return obj;
    };

    Scene.prototype.remove = function (obj) {
        var idx = this.objects.indexOf(obj);
        if (idx !== -1) {
            this.objects.splice(idx, 1);
            obj.parent = null;
            return obj;
        }
        return null;
    };

    // Recomputes world matrices for every root object (lazy, dirty only).
    Scene.prototype.update = function (dt) {
        dt = dt || 0;
        for (var i = 0; i < this.objects.length; i++) {
            this.objects[i].getWorldMatrix();
        }
        // Future: per-object animation hooks can use dt here.
    };

    // Total mesh face count (for HUD / performance budgeting).
    Scene.prototype.countFaces = function () {
        var total = 0;
        for (var i = 0; i < this.objects.length; i++) {
            this.objects[i].traverse(function (node) {
                if (node.isMesh) total += node.faces.length;
            });
        }
        return total;
    };

    // Serializes back to the same JSON structure SceneLoader consumes,
    // so load(toJSON()) yields an equivalent scene (round-trip).
    Scene.prototype.toJSON = function () {
        var data = { name: this.name, objects: [] };
        if (this.camera) data.camera = this.camera;
        for (var i = 0; i < this.objects.length; i++) {
            data.objects.push(this.objects[i].toJSON());
        }
        return data;
    };

    Scene.fromData = function (data) {
        if (!data || typeof data !== 'object') {
            Debug.error('Scene', 'fromData: invalid data, using empty scene');
            return new Scene({});
        }
        return new Scene(data);
    };

    return Scene;
})();
