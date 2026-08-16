window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

A3D.modules.Cube = (function () {
    'use strict';

    var Vec3 = A3D.modules.Vec3;
    var Mesh = A3D.modules.Mesh;

    // Unit cube, 8 vertices, 12 triangles (6 faces x 2). CCW from outside.
    function Cube(params) {
        params = params || {};
        if (!params.scale) params.scale = [1, 1, 1];
        Mesh.call(this, params);

        var v = [
            new Vec3(-0.5, -0.5, -0.5), // 0
            new Vec3( 0.5, -0.5, -0.5), // 1
            new Vec3( 0.5,  0.5, -0.5), // 2
            new Vec3(-0.5,  0.5, -0.5), // 3
            new Vec3(-0.5, -0.5,  0.5), // 4
            new Vec3( 0.5, -0.5,  0.5), // 5
            new Vec3( 0.5,  0.5,  0.5), // 6
            new Vec3(-0.5,  0.5,  0.5)  // 7
        ];

        var faces = [
            { indices: [0, 3, 2] }, { indices: [0, 2, 1] }, // back   -z
            { indices: [1, 6, 5] }, { indices: [1, 2, 6] }, // right  +x
            { indices: [5, 6, 7] }, { indices: [5, 7, 4] }, // front  +z
            { indices: [4, 7, 3] }, { indices: [4, 3, 0] }, // left   -x
            { indices: [3, 7, 6] }, { indices: [3, 6, 2] }, // top    +y
            { indices: [4, 1, 5] }, { indices: [0, 1, 5] }  // bottom -y
        ];

        this.meshType = 'cube';
        this.vertices = v;
        this.faces = faces;
        this.computeNormals();
    }

    Cube.prototype = Object.create(Mesh.prototype);
    Cube.prototype.constructor = Cube;

    return Cube;
})();
