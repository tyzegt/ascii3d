window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

A3D.modules.Sphere = (function () {
    'use strict';

    var Vec3 = A3D.modules.Vec3;
    var Mesh = A3D.modules.Mesh;

    // UV grid sphere: `rings` latitude bands x `segments` longitude slices.
    // Poles are merged into single vertices (acceptable for ascii resolution).
    function Sphere(params) {
        params = params || {};
        this.rings = Math.max(2, Math.floor(params.rings || 10));
        this.segments = Math.max(3, Math.floor(params.segments || 14));

        Mesh.call(this, params);

        var rings = this.rings;
        var segs = this.segments;
        var v = [];
        var faces = [];

        // Top pole
        v.push(new Vec3(0, 1, 0)); // index 0
        // Latitude rows: phi from (PI/rings) to (PI - PI/rings)
        for (var i = 0; i < rings - 1; i++) {
            var phi = Math.PI * (i + 1) / rings;
            for (var j = 0; j < segs; j++) {
                var theta = 2 * Math.PI * j / segs;
                v.push(new Vec3(
                    Math.sin(phi) * Math.cos(theta),
                    Math.cos(phi),
                    Math.sin(phi) * Math.sin(theta)
                ));
            }
        }
        // Bottom pole
        var bottomIdx = v.length;
        v.push(new Vec3(0, -1, 0));

        function rowStart(i) { return 1 + i * segs; }

        // Cap: top pole to first ring.
        for (var j2 = 0; j2 < segs; j2++) {
            var a = rowStart(0) + j2;
            var b = rowStart(0) + (j2 + 1) % segs;
            faces.push({ indices: [0, b, a] });
        }

        // Middle bands.
        for (var i2 = 0; i2 < rings - 2; i2++) {
            var top = rowStart(i2);
            var bot = rowStart(i2 + 1);
            for (var j3 = 0; j3 < segs; j3++) {
                var t1 = top + j3;
                var t2 = top + (j3 + 1) % segs;
                var b1 = bot + j3;
                var b2 = bot + (j3 + 1) % segs;
                faces.push({ indices: [t1, t2, b1] });
                faces.push({ indices: [t2, b2, b1] });
            }
        }

        // Cap: last ring to bottom pole.
        var last = rowStart(rings - 2);
        for (var j4 = 0; j4 < segs; j4++) {
            var c1 = last + j4;
            var c2 = last + (j4 + 1) % segs;
            faces.push({ indices: [c1, c2, bottomIdx] });
        }

        this.meshType = 'sphere';
        this.vertices = v;
        this.faces = faces;
        this.computeNormals();
    }

    Sphere.prototype = Object.create(Mesh.prototype);
    Sphere.prototype.constructor = Sphere;

    Sphere.prototype.serializeParams = function () {
        return { rings: this.rings, segments: this.segments };
    };

    return Sphere;
})();
