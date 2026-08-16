window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

A3D.modules.Object3D = (function () {
    'use strict';

    var Vec3 = A3D.modules.Vec3;
    var Mat4 = A3D.modules.Mat4;

    function Object3D(params) {
        params = params || {};
        this.name = params.name || '';
        this.position = toVec3(params.position, 0, 0, 0);
        // Euler radians, local matrix order: T * Rz * Ry * Rx * S (column vectors).
        this.rotation = toEuler(params.rotation);
        this.scale = toVec3(params.scale, 1, 1, 1);
        this.children = [];
        this.parent = null;
        this.localMatrixDirty = true;
        this.worldMatrixDirty = true;
        this.localMatrix = Mat4.identity();
        this.worldMatrix = Mat4.identity();
    }

    function toVec3(v, dx, dy, dz) {
        if (!v) return new Vec3(dx, dy, dz);
        if (v instanceof Vec3) return v.clone();
        if (Array.isArray(v)) return new Vec3(v[0] || 0, v[1] || 0, v[2] || 0);
        return new Vec3(v.x || dx, v.y || dy, v.z || dz);
    }

    function toEuler(r) {
        if (!r) return { x: 0, y: 0, z: 0 };
        if (typeof r === 'object' && !Array.isArray(r)) {
            return { x: r.x || 0, y: r.y || 0, z: r.z || 0 };
        }
        return { x: r[0] || 0, y: r[1] || 0, z: r[2] || 0 };
    }

    Object3D.prototype.markDirty = function () {
        // Local transform changed: recompute self + all ancestors' world
        // matrices (a child's move changes its parent's subtree) and every
        // descendant (their world depends on this node).
        this.localMatrixDirty = true;
        var node = this;
        while (node) {
            node.worldMatrixDirty = true;
            node = node.parent;
        }
        this.traverse(function (n) { n.worldMatrixDirty = true; });
    };

    Object3D.prototype.setTransform = function (position, rotation, scale) {
        if (position) this.position = toVec3(position);
        if (rotation) this.rotation = toEuler(rotation);
        if (scale) this.scale = toVec3(scale, 1, 1, 1);
        this.markDirty();
    };

    Object3D.prototype.add = function (child) {
        if (!child || child === this) return null;
        if (child.parent) child.parent.remove(child);
        child.parent = this;
        this.children.push(child);
        child.markDirty();
        this.markDirty();
        return child;
    };

    Object3D.prototype.remove = function (child) {
        var idx = this.children.indexOf(child);
        if (idx !== -1) {
            this.children.splice(idx, 1);
            child.parent = null;
            this.markDirty();
            return child;
        }
        return null;
    };

    // Recomputes localMatrix if needed, then worldMatrix from the given
    // parent world matrix (or identity for a root). Children are not touched.
    Object3D.prototype.updateWorldMatrix = function (parentWorld) {
        if (this.localMatrixDirty) {
            var m = Mat4.translation(this.position.x, this.position.y, this.position.z);
            m = Mat4.multiply(m, Mat4.rotationZ(this.rotation.z));
            m = Mat4.multiply(m, Mat4.rotationY(this.rotation.y));
            m = Mat4.multiply(m, Mat4.rotationX(this.rotation.x));
            if (this.scale.x !== 1 || this.scale.y !== 1 || this.scale.z !== 1) {
                m = Mat4.multiply(m, Mat4.scaling(this.scale.x, this.scale.y, this.scale.z));
            }
            this.localMatrix = m;
            this.localMatrixDirty = false;
        }
        var parentM = parentWorld || Mat4.identity();
        if (this.worldMatrixDirty) {
            this.worldMatrix = Mat4.multiply(parentM, this.localMatrix);
            this.worldMatrixDirty = false;
        }
        return this.worldMatrix;
    };

    // Walks from the root down to this node, recomputing every dirty matrix.
    Object3D.prototype.getWorldMatrix = function () {
        var chain = [];
        var node = this;
        while (node) {
            chain.push(node);
            node = node.parent;
        }
        for (var i = chain.length - 1; i >= 0; i--) {
            chain[i].updateWorldMatrix(i === chain.length - 1 ? null : chain[i + 1].worldMatrix);
        }
        return this.worldMatrix;
    };

    Object3D.prototype.traverse = function (fn) {
        fn(this);
        for (var i = 0; i < this.children.length; i++) {
            this.children[i].traverse(fn);
        }
    };

    Object3D.prototype.toJSON = function () {
        return {
            name: this.name,
            position: [this.position.x, this.position.y, this.position.z],
            rotation: [this.rotation.x, this.rotation.y, this.rotation.z],
            scale: [this.scale.x, this.scale.y, this.scale.z]
        };
    };

    return Object3D;
})();
