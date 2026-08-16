window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

A3D.modules.Pyramid = (function () {
    'use strict';

    var Vec3 = A3D.modules.Vec3;
    var Mesh = A3D.modules.Mesh;

    // Square pyramid: 5 vertices (4 base + apex), 5 faces. CCW from outside.
    function Pyramid(params) {
        params = params || {};
        if (!params.scale) params.scale = [1, 1, 1];
        Mesh.call(this, params);

        var v = [
            new Vec3(-0.5, -0.5, -0.5), // 0 base
            new Vec3( 0.5, -0.5, -0.5), // 1
            new Vec3( 0.5, -0.5,  0.5), // 2
            new Vec3(-0.5, -0.5,  0.5), // 3
            new Vec3( 0.0,  0.5,  0.0)  // 4 apex
        ];

        var faces = [
            { indices: [0, 4, 1] }, // back   -z
            { indices: [1, 4, 2] }, // right  +x
            { indices: [2, 4, 3] }, // front  +z
            { indices: [3, 4, 0] }, // left   -x
            { indices: [0, 1, 2] }  // bottom -y
        ];

        this.meshType = 'pyramid';
        this.vertices = v;
        this.faces = faces;
        this.computeNormals();
    }

    Pyramid.prototype = Object.create(Mesh.prototype);
    Pyramid.prototype.constructor = Pyramid;

    return Pyramid;
})();
