window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

A3D.modules.Mesh = (function () {
    'use strict';

    var Vec3 = A3D.modules.Vec3;
    var Object3D = A3D.modules.Object3D;

    // Base mesh: vertices (Vec3[]), faces ({indices:[i0,i1,i2], normal, material?}).
    // Winding is CCW seen from outside so computed normals point outward.
    function Mesh(params) {
        Object3D.call(this, params);
        this.isMesh = true;
        this.vertices = [];
        this.faces = [];
        this.computeNormals();
    }

    Mesh.prototype = Object.create(Object3D.prototype);
    Mesh.prototype.constructor = Mesh;

    // Outward normals from face winding: normalize((v1-v0) x (v2-v0)).
    Mesh.prototype.computeNormals = function () {
        for (var i = 0; i < this.faces.length; i++) {
            var f = this.faces[i];
            var a = this.vertices[f.indices[0]];
            var b = this.vertices[f.indices[1]];
            var c = this.vertices[f.indices[2]];
            var e1 = b.sub(a);
            var e2 = c.sub(a);
            var n = e1.cross(e2).normalize();
            f.normal = n;
        }
    };

    // Edges as unique vertex-index pairs (for the outline pass in stage 5).
    Mesh.prototype.getEdges = function () {
        if (this._edges) return this._edges;
        var seen = {};
        var edges = [];
        for (var i = 0; i < this.faces.length; i++) {
            var idx = this.faces[i].indices;
            for (var k = 0; k < 3; k++) {
                var p = idx[k];
                var q = idx[(k + 1) % 3];
                var key = Math.min(p, q) + '_' + Math.max(p, q);
                if (!seen[key]) {
                    seen[key] = true;
                    edges.push([p, q]);
                }
            }
        }
        this._edges = edges;
        return edges;
    };

    Mesh.prototype.toJSON = function () {
        var base = Object3D.prototype.toJSON ? Object3D.prototype.toJSON.call(this) : {};
        base.type = this.meshType || 'mesh';
        if (this.serializeParams) {
            var extra = this.serializeParams();
            for (var k in extra) {
                if (Object.prototype.hasOwnProperty.call(extra, k)) base[k] = extra[k];
            }
        }
        return base;
    };

    return Mesh;
})();
