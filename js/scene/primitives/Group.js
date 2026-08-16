window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

A3D.modules.Group = (function () {
    'use strict';

    var Object3D = A3D.modules.Object3D;

    // Container for composite objects: no own geometry, only children.
    function Group(params) {
        Object3D.call(this, params);
        this.isGroup = true;
    }

    Group.prototype = Object.create(Object3D.prototype);
    Group.prototype.constructor = Group;

    Group.prototype.toJSON = function () {
        var data = Object3D.prototype.toJSON.call(this);
        data.type = 'group';
        if (this.children.length > 0) {
            data.children = this.children.map(function (c) { return c.toJSON(); });
        }
        return data;
    };

    return Group;
})();
