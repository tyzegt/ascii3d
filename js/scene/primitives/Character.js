window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

A3D.modules.Character = (function () {
    'use strict';

    var Group = A3D.modules.Group;
    var Cube = A3D.modules.Cube;
    var Sphere = A3D.modules.Sphere;

    // Composite demo object: Group -> Cube (body) + Sphere (head).
    function build(params) {
        params = params || {};
        var g = new Group(params);
        g.name = params.name || 'character';

        var body = new Cube({
            name: 'body',
            position: [0, 0.75, 0],
            scale: [0.8, 1.5, 0.8]
        });
        var head = new Sphere({
            name: 'head',
            position: [0, 1.85, 0],
            scale: [0.6, 0.6, 0.6],
            rings: 8,
            segments: 10
        });

        g.add(body);
        g.add(head);
        return g;
    }

    return { build: build };
})();
