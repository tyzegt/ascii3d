window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

A3D.modules.Vec3 = (function () {
    'use strict';

    function Vec3(x, y, z) {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
    }

    Vec3.prototype.clone = function () {
        return new Vec3(this.x, this.y, this.z);
    };

    Vec3.prototype.set = function (x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    };

    Vec3.prototype.add = function (v) {
        return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
    };

    Vec3.prototype.sub = function (v) {
        return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
    };

    Vec3.prototype.scale = function (s) {
        return new Vec3(this.x * s, this.y * s, this.z * s);
    };

    Vec3.prototype.dot = function (v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    };

    Vec3.prototype.cross = function (v) {
        return new Vec3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    };

    Vec3.prototype.length = function () {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    };

    Vec3.prototype.normalize = function () {
        var len = this.length();
        if (len === 0) {
            return new Vec3(0, 0, 0);
        }
        return new Vec3(this.x / len, this.y / len, this.z / len);
    };

    Vec3.prototype.transform = function (mat4) {
        var m = mat4.elements;
        var x = this.x;
        var y = this.y;
        var z = this.z;

        return new Vec3(
            m[0] * x + m[4] * y + m[8] * z + m[12],
            m[1] * x + m[5] * y + m[9] * z + m[13],
            m[2] * x + m[6] * y + m[10] * z + m[14]
        );
    };

    Vec3.prototype.transformW = function (mat4) {
        var m = mat4.elements;
        var x = this.x;
        var y = this.y;
        var z = this.z;

        return {
            x: m[0] * x + m[4] * y + m[8] * z + m[12],
            y: m[1] * x + m[5] * y + m[9] * z + m[13],
            z: m[2] * x + m[6] * y + m[10] * z + m[14],
            w: m[3] * x + m[7] * y + m[11] * z + m[15]
        };
    };

    Vec3.prototype.transformDirection = function (mat4) {
        var m = mat4.elements;
        var x = this.x;
        var y = this.y;
        var z = this.z;

        return new Vec3(
            m[0] * x + m[4] * y + m[8] * z,
            m[1] * x + m[5] * y + m[9] * z,
            m[2] * x + m[6] * y + m[10] * z
        );
    };

    return Vec3;
})();
