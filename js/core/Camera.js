window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

A3D.modules.Camera = (function () {
    'use strict';

    var Vec3 = A3D.modules.Vec3;
    var Mat4 = A3D.modules.Mat4;
    var MathUtils = A3D.modules.MathUtils;
    var Config = A3D.modules.Config;
    var Debug = A3D.modules.Debug;

    function Camera() {
        this.position = new Vec3(0, 1.7, 8);
        this.yaw = 0;
        this.pitch = 0;
        this.fov = Config.FOV;
        this.aspect = 1;
        this.near = Config.NEAR;
        this.far = Config.FAR;
        this.reset();
    }

    Camera.prototype.reset = function () {
        this.position = new Vec3(0, 1.7, 8);
        this.yaw = 0;
        this.pitch = 0;
    };

    Camera.prototype.forward = function () {
        return new Vec3(
            -Math.sin(this.yaw) * Math.cos(this.pitch),
            Math.sin(this.pitch),
            -Math.cos(this.yaw) * Math.cos(this.pitch)
        );
    };

    Camera.prototype.right = function () {
        return new Vec3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    };

    Camera.prototype.up = function () {
        return this.forward().cross(this.right()).normalize();
    };

    Camera.prototype.moveForward = function (distance) {
        this.position = this.position.add(this.forward().scale(distance));
    };

    Camera.prototype.moveBack = function (distance) {
        this.position = this.position.add(this.forward().scale(-distance));
    };

    Camera.prototype.moveLeft = function (distance) {
        this.position = this.position.add(this.right().scale(-distance));
    };

    Camera.prototype.moveRight = function (distance) {
        this.position = this.position.add(this.right().scale(distance));
    };

    Camera.prototype.moveUp = function (distance) {
        this.position = this.position.add(new Vec3(0, distance, 0));
    };

    Camera.prototype.moveDown = function (distance) {
        this.position = this.position.add(new Vec3(0, -distance, 0));
    };

    Camera.prototype.rotate = function (dx, dy) {
        this.yaw -= dx;
        this.pitch = MathUtils.clamp(this.pitch - dy, -Config.PITCH_LIMIT, Config.PITCH_LIMIT);
    };

    Camera.prototype.lookAt = function (target) {
        var dir = target.sub(this.position);
        var len = dir.length();
        if (len === 0) {
            return;
        }
        dir = dir.scale(1 / len);
        this.yaw = -Math.atan2(dir.x, dir.z);
        this.pitch = MathUtils.clamp(Math.asin(dir.y), -Config.PITCH_LIMIT, Config.PITCH_LIMIT);
    };

    Camera.prototype.getViewMatrix = function () {
        var e = this.position;
        var f = this.forward();
        var s = this.right();
        var u = new Vec3(
            s.y * f.z - s.z * f.y,
            s.z * f.x - s.x * f.z,
            s.x * f.y - s.y * f.x
        );

        var m = new Float32Array(16);
        m[0] = s.x;  m[1] = u.x;  m[2]  = -f.x; m[3]  = 0;
        m[4] = s.y;  m[5] = u.y;  m[6]  = -f.y; m[7]  = 0;
        m[8] = s.z;  m[9] = u.z;  m[10] = -f.z; m[11] = 0;
        m[12] = -(s.x * e.x + s.y * e.y + s.z * e.z);
        m[13] = -(u.x * e.x + u.y * e.y + u.z * e.z);
        m[14] =   (f.x * e.x + f.y * e.y + f.z * e.z);
        m[15] = 1;
        return new Mat4(m);
    };

    Camera.prototype.getProjectionMatrix = function () {
        return Mat4.perspective(this.fov, this.aspect, this.near, this.far);
    };

    Camera.prototype.setView = function (position, yaw, pitch) {
        if (position instanceof Vec3) {
            this.position = position.clone();
        } else if (Array.isArray(position)) {
            this.position = new Vec3(position[0] || 0, position[1] || 0, position[2] || 0);
        } else {
            this.position = new Vec3(position.x || 0, position.y || 0, position.z || 0);
        }
        this.yaw = yaw || 0;
        this.pitch = MathUtils.clamp(pitch || 0, -Config.PITCH_LIMIT, Config.PITCH_LIMIT);
    };

    return Camera;
})();
