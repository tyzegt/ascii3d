window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

A3D.modules.Mesh = (function () {
    'use strict';

    var Vec3 = A3D.modules.Vec3;
    var Object3D = A3D.modules.Object3D;

    // Base mesh: vertices (Vec3[]), faces ({indices:[i0,i1,i2], normal, uv?}).
    // Winding is CCW seen from outside so computed normals point outward.
    // material (опц., этап C): { texture: 'name', textures: {group:'name'|spec},
    // tile: [tu,tv], color: [r,g,b] }. SceneLoader кладёт эти поля в params —
    // конструктор собирает их в this.material (топ-уровневые поля JSON объекта).
    function Mesh(params) {
        Object3D.call(this, params);
        this.isMesh = true;
        this.vertices = [];
        this.faces = [];
        var mat = (params && params.material && typeof params.material === 'object') ? params.material : null;
        if (!mat && params && typeof params === 'object') {
            var m2 = {};
            if (typeof params.texture === 'string') m2.texture = params.texture;
            if (params.textures && typeof params.textures === 'object' && !Array.isArray(params.textures)) m2.textures = params.textures;
            if (Array.isArray(params.tile) && params.tile.length >= 2) m2.tile = [params.tile[0], params.tile[1]];
            if (Array.isArray(params.color) && params.color.length >= 3) m2.color = [params.color[0], params.color[1], params.color[2]];
            if (m2.texture || m2.textures || m2.tile || m2.color) mat = m2;
        }
        this.material = mat;
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
        var spec = this.getFaceTexture(f);
        return spec ? spec.name : null;
    };

    // Дескриптор текстуры грани (tile-режим): { name, tile: [tu, tv] | null }.
    // Приоритет: material.textures[groupName] → material.texture. Значение в
    // textures/group может быть строкой-именем или объектом
    // { texture: 'name', tile: [tu, tv] } (tile — повтор паттерна по u/v).
    Mesh.prototype.getFaceTexture = function (f) {
        var mat = this.material;
        if (!mat) return null;
        var spec = null;
        var groupName = this.faceGroupName(f);
        if (mat.textures && typeof mat.textures === 'object' && mat.textures[groupName]) {
            spec = normalizeTexSpec(mat.textures[groupName]);
        }
        if (!spec && typeof mat.texture === 'string') {
            spec = normalizeTexSpec({ texture: mat.texture, tile: mat.tile });
        }
        return spec;
    };

    function normalizeTexSpec(v) {
        if (typeof v === 'string') return { name: v, tile: null };
        if (v && typeof v === 'object' && typeof v.texture === 'string') {
            var tu = (Array.isArray(v.tile) && v.tile.length >= 2) ? [v.tile[0], v.tile[1]] : null;
            return { name: v.texture, tile: tu };
        }
        return null;
    }

    // Edges as unique vertex-index pairs (for the outline pass in stage 5).
    // showEdges=false → только внешние контурные рёбра: рёбро, которому
    // принадлежат обе соседние грани одной группы (front/back/left/right/
    // top/bottom), — это внутренняя диагональ триангуляции и она отбрасывается.
    Mesh.prototype.getEdges = function () {
        if (this._edges) return this._edges;
        var seen = {};
        var count = {};
        var groupCount = {};
        for (var i = 0; i < this.faces.length; i++) {
            var idx = this.faces[i].indices;
            for (var k = 0; k < 3; k++) {
                var p = idx[k];
                var q = idx[(k + 1) % 3];
                var key = Math.min(p, q) + '_' + Math.max(p, q);
                if (!seen[key]) {
                    seen[key] = true;
                    count[key] = 0;
                    groupCount[key] = {};
                }
                count[key]++;
                if (count[key] > 2) continue; // >2 грани — не контур в любом случае
                var g = this.faceGroupName(this.faces[i]);
                if (g) {
                    if (!groupCount[key][g]) groupCount[key][g] = 0;
                    groupCount[key][g]++;
                }
            }
        }
        var edges = [];
        for (var k2 in seen) {
            if (!Object.prototype.hasOwnProperty.call(seen, k2)) continue;
            if (count[k2] > 2) continue;
            if (this.showEdges === false) {
                var gc = groupCount[k2];
                var interior = false;
                for (var g in gc) {
                    if (Object.prototype.hasOwnProperty.call(gc, g) && gc[g] > 1) {
                        interior = true;
                        break;
                    }
                }
                if (interior) continue;
            }
            var parts = k2.split('_');
            edges.push([parseInt(parts[0], 10), parseInt(parts[1], 10)]);
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
            if (Array.isArray(this.material.tile) && this.material.tile.length >= 2) {
                m.tile = [this.material.tile[0], this.material.tile[1]];
            }
            if (Array.isArray(this.material.color) && this.material.color.length >= 3) {
                m.color = [this.material.color[0], this.material.color[1], this.material.color[2]];
            }
            if (m.texture || m.textures || m.tile || m.color) base.material = m;
        }
        return base;
    };

    return Mesh;
})();
