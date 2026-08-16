window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

A3D.modules.Mat4 = (function () {
    'use strict';

    var MathUtils = A3D.modules.MathUtils;

    function Mat4(elements) {
        if (elements) {
            this.elements = elements;
        } else {
            var m = new Float32Array(16);
            m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1;
            this.elements = m;
        }
    }

    Mat4.identity = function () {
        return new Mat4();
    };

    Mat4.translation = function (x, y, z) {
        var m = new Float32Array(16);
        m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1;
        m[12] = x; m[13] = y; m[14] = z;
        return new Mat4(m);
    };

    Mat4.rotationX = function (rad) {
        var c = Math.cos(rad);
        var s = Math.sin(rad);
        var m = new Float32Array(16);
        m[0] = 1;
        m[5] = c;  m[6] = s;
        m[9] = -s; m[10] = c;
        m[15] = 1;
        return new Mat4(m);
    };

    Mat4.rotationY = function (rad) {
        var c = Math.cos(rad);
        var s = Math.sin(rad);
        var m = new Float32Array(16);
        m[0] = c;  m[2] = -s;
        m[5] = 1;
        m[8] = s;  m[10] = c;
        m[15] = 1;
        return new Mat4(m);
    };

    Mat4.rotationZ = function (rad) {
        var c = Math.cos(rad);
        var s = Math.sin(rad);
        var m = new Float32Array(16);
        m[0] = c;  m[1] = s;
        m[4] = -s; m[5] = c;
        m[10] = 1;
        m[15] = 1;
        return new Mat4(m);
    };

    Mat4.scaling = function (x, y, z) {
        var m = new Float32Array(16);
        m[0] = x; m[5] = y; m[10] = z; m[15] = 1;
        return new Mat4(m);
    };

    Mat4.perspective = function (fovY, aspect, near, far) {
        var f = Math.tan(MathUtils.degToRad(fovY) / 2);
        var nf = 1 / (near - far);
        var m = new Float32Array(16);
        m[0]  = 1 / (aspect * f);
        m[5]  = 1 / f;
        m[10] = (far + near) * nf;
        m[11] = -1;
        m[14] = 2 * far * near * nf;
        return new Mat4(m);
    };

        Mat4.lookAt = function (eye, target, up) {
            var dx = eye.x - target.x;
            var dy = eye.y - target.y;
            var dz = eye.z - target.z;
            var len = Math.sqrt(dx * dx + dy * dy + dz * dz);
            var f = { x: dx / len, y: dy / len, z: dz / len };
            var s = { x: f.y * up.z - f.z * up.y, y: f.z * up.x - f.x * up.z, z: f.x * up.y - f.y * up.x };
            var sLen = Math.sqrt(s.x * s.x + s.y * s.y + s.z * s.z);
            s.x /= sLen; s.y /= sLen; s.z /= sLen;
            var u = { x: s.y * f.z - s.z * f.y, y: s.z * f.x - s.x * f.z, z: s.x * f.y - s.y * f.x };

            var m = new Float32Array(16);
            m[0] = s.x;  m[1] = u.x;  m[2] = f.x; m[3]  = 0;
            m[4] = s.y;  m[5] = u.y;  m[6] = f.y; m[7]  = 0;
            m[8] = s.z;  m[9] = u.z;  m[10] = f.z; m[11] = 0;
            m[12] = -(s.x * target.x + s.y * target.y + s.z * target.z);
            m[13] = -(u.x * target.x + u.y * target.y + u.z * target.z);
            m[14] =  -(f.x * target.x + f.y * target.y + f.z * target.z);
            m[15] = 1;
            return new Mat4(m);
        };

    Mat4.multiply = function (a, b) {
        var A = a.elements;
        var B = b.elements;
        var out = new Float32Array(16);

        for (var col = 0; col < 4; col++) {
            for (var row = 0; row < 4; row++) {
                out[row + col * 4] =
                    A[row] * B[col * 4] +
                    A[row + 4] * B[col * 4 + 1] +
                    A[row + 8] * B[col * 4 + 2] +
                    A[row + 12] * B[col * 4 + 3];
            }
        }

        return new Mat4(out);
    };

        Mat4.invert = function (mat) {
            var m = mat.elements;
            // column-major: element (row r, col c) = m[c*4 + r]
            var a00 = m[0],  a01 = m[4],  a02 = m[8],  a03 = m[12];
            var a10 = m[1],  a11 = m[5],  a12 = m[9],  a13 = m[13];
            var a20 = m[2],  a21 = m[6],  a22 = m[10], a23 = m[14];
            var a30 = m[3],  a31 = m[7],  a32 = m[11], a33 = m[15];

            function det3(p00, p01, p02, p10, p11, p12, p20, p21, p22) {
                return p00 * (p11 * p22 - p12 * p21) -
                       p01 * (p10 * p22 - p12 * p20) +
                       p02 * (p10 * p21 - p11 * p20);
            }

            // Cofactors C[r][c] = (-1)^(r+c) * minor(r, c)
            var c00 =  det3(a11, a12, a13, a21, a22, a23, a31, a32, a33);
            var c01 = -det3(a10, a12, a13, a20, a22, a23, a30, a32, a33);
            var c02 =  det3(a10, a11, a13, a20, a21, a23, a30, a31, a33);
            var c03 = -det3(a10, a11, a12, a20, a21, a22, a30, a31, a32);
            var c10 = -det3(a01, a02, a03, a21, a22, a23, a31, a32, a33);
            var c11 =  det3(a00, a02, a03, a20, a22, a23, a30, a32, a33);
            var c12 = -det3(a00, a01, a03, a20, a21, a23, a30, a31, a33);
            var c13 =  det3(a00, a01, a02, a20, a21, a22, a30, a31, a32);
            var c20 =  det3(a01, a02, a03, a11, a12, a13, a31, a32, a33);
            var c21 = -det3(a00, a02, a03, a10, a12, a13, a30, a32, a33);
            var c22 =  det3(a00, a01, a03, a10, a11, a13, a30, a31, a33);
            var c23 = -det3(a00, a01, a02, a10, a11, a12, a30, a31, a32);
            var c30 = -det3(a01, a02, a03, a11, a12, a13, a21, a22, a23);
            var c31 =  det3(a00, a02, a03, a10, a12, a13, a20, a22, a23);
            var c32 = -det3(a00, a01, a03, a10, a11, a13, a20, a21, a23);
            var c33 =  det3(a00, a01, a02, a10, a11, a12, a20, a21, a22);

            var det = a00 * c00 + a01 * c01 + a02 * c02 + a03 * c03;
            if (det === 0) {
                return Mat4.identity();
            }
            var idet = 1.0 / det;

            // Inverse = C^T / det; column-major: out[c*4+r] = M[r][c] = C[c][r] * idet
            var out = new Float32Array(16);
            out[0]  = c00 * idet; out[1]  = c01 * idet; out[2]  = c02 * idet; out[3]  = c03 * idet;
            out[4]  = c10 * idet; out[5]  = c11 * idet; out[6]  = c12 * idet; out[7]  = c13 * idet;
            out[8]  = c20 * idet; out[9]  = c21 * idet; out[10] = c22 * idet; out[11] = c23 * idet;
            out[12] = c30 * idet; out[13] = c31 * idet; out[14] = c32 * idet; out[15] = c33 * idet;
            return new Mat4(out);
        };

    Mat4.prototype.transformPoint = function (v) {
        return v.transform(this);
    };

    Mat4.prototype.transformDirection = function (v) {
        return v.transformDirection(this);
    };

    return Mat4;
})();
