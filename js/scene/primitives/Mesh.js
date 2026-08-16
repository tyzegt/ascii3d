window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

A3D.modules.Mesh = (function () {
    'use strict';

    var Vec3 = A3D.modules.Vec3;
    var Object3D = A3D.modules.Object3D;

    // Base mesh: vertices (Vec3[]), faces ({indices:[i0,i1,i2], normal, uv?}).
    // Winding is CCW seen from outside so computed normals point outward.
    // material (опц., этап C): { texture: 'name', textures: {group:'name'}, color: [r,g,b] }.
    function Mesh(params) {
        Object3D.call(this, params);
        this.isMesh = true;
        this.vertices = [];
        this.faces = [];
        this.material = (params && params.material && typeof params.material === 'object') ? params.material : null;
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

    // Имя группы грани (этап C): по нормали к ближайшей оси.
    // Cube: back/right/front/left/top/bottom; Pyramid: +bottom; Plane: top; Sphere: surface.
    Mesh.prototype.faceGroupName = function (f) {
        var type = this.meshType;
        if (type === 'sphere') return 'surface';
        if (type === 'plane') return 'top';
        var n = f.normal;
        if (!n) return '';
        // доминирующая ось нормали → имя группы
        var ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
        if (ax >= ay && ax >= az) return n.x > 0 ? 'right' : 'left';
        if (ay >= az) return n.y > 0 ? 'top' : 'bottom';
        return n.z > 0 ? 'front' : 'back';
    };

    // Группы граней: имя → массив индексов граней (этап C). Кэшируется.
    Mesh.prototype.computeFaceGroups = function () {
        if (this._faceGroups) return this._faceGroups;
        var groups = {};
        for (var i = 0; i < this.faces.length; i++) {
            var name = this.faceGroupName(this.faces[i]);
            if (!name) continue;
            if (!groups[name]) groups[name] = [];
            groups[name].push(i);
        }
        this._faceGroups = groups;
        return groups;
    };

    // Текстура для грани: material.textures[groupName] || material.texture || null.
    Mesh.prototype.getFaceTextureName = function (f) {
        var mat = this.material;
        if (!mat) return null;
        var groupName = this.faceGroupName(f);
        if (mat.textures && typeof mat.textures === 'object' && mat.textures[groupName]) {
            return mat.textures[groupName];
        }
        if (typeof mat.texture === 'string') return mat.texture;
        return null;
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
        // материал (этап C): texture/textures/color — сериализуем как есть
        if (this.material) {
            var m = {};
            if (typeof this.material.texture === 'string') m.texture = this.material.texture;
            if (this.material.textures && typeof this.material.textures === 'object') {
                m.textures = {};
                for (var g in this.material.textures) {
                    if (Object.prototype.hasOwnProperty.call(this.material.textures, g)) {
                        m.textures[g] = this.material.textures[g];
                    }
                }
            }
            if (Array.isArray(this.material.color) && this.material.color.length >= 3) {
                m.color = [this.material.color[0], this.material.color[1], this.material.color[2]];
            }
            if (m.texture || m.textures || m.color) base.material = m;
        }
        return base;
    };

    return Mesh;
})();
