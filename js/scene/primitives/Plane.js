window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

A3D.modules.Plane = (function () {
    'use strict';

    var Vec3 = A3D.modules.Vec3;
    var Mesh = A3D.modules.Mesh;

    // Ground plane: N x N grid of quads (2 triangles each), normal up (+y).
    // UV (этап C) генерируется лениво в Rasterizer.render.
    function Plane(params) {
        params = params || {};
        this.segments = Math.max(1, Math.floor(params.segments || 8));
        this.size = params.size || 40;
        var size = this.size;

        Mesh.call(this, params);

        var n = this.segments;
        var half = size / 2;
        var v = [];
        for (var j = 0; j <= n; j++) {
            for (var i = 0; i <= n; i++) {
                var x = -half + (size * i) / n;
                var z = -half + (size * j) / n;
                v.push(new Vec3(x, 0, z));
            }
        }

        var faces = [];
        for (var jj = 0; jj < n; jj++) {
            for (var ii = 0; ii < n; ii++) {
                var a = jj * (n + 1) + ii;
                var b = a + 1;
                var c = a + (n + 1);
                var d = c + 1;
                faces.push({ indices: [a, c, b] });
                faces.push({ indices: [b, c, d] });
            }
        }

        this.meshType = 'plane';
        this.vertices = v;
        this.faces = faces;
        this.computeNormals();
    }

    Plane.prototype = Object.create(Mesh.prototype);
    Plane.prototype.constructor = Plane;

    Plane.prototype.serializeParams = function () {
        return { segments: this.segments, size: this.size };
    };

    return Plane;
})();
