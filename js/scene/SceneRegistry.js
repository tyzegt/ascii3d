window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

// Single registry with two independent sections:
//   types  — primitive factories (name -> function(params) -> Object3D)
//   scenes — ready-made scene data (name -> JSON-like object)
A3D.SceneRegistry = {
    types: {},
    scenes: {},

    register: function (typeName, factory) {
        this.types[typeName] = factory;
    },

    create: function (typeName, params) {
        var factory = this.types[typeName];
        if (!factory) return null;
        return factory(params || {});
    },

    hasType: function (typeName) {
        return !!this.types[typeName];
    },

    registerScene: function (name, data) {
        this.scenes[name] = data;
    },

    getScene: function (name) {
        return this.scenes[name] || null;
    },

    listScenes: function () {
        return Object.keys(this.scenes);
    }
};
