window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

A3D.modules.FrameBuffer = (function () {
    'use strict';

    var Config = A3D.modules.Config;
    var Debug = A3D.modules.Debug;

    function FrameBuffer() {
        this.width = 0;
        this.height = 0;
        this.chars = null;   // String, w*h
        this.depth = null;   // Float32Array, w*h (1/w, Infinity = пусто)
        this.ids = null;     // Int32Array, w*h (meshId ячейки, -1 = пусто)
    }

    FrameBuffer.prototype.resize = function (w, h) {
        if (w <= 0 || h <= 0) {
            Debug.warn('FrameBuffer', 'invalid size:', w, 'x', h);
            return;
        }
        this.width = w;
        this.height = h;
        var n = w * h;
        this.chars = new Array(n);
        for (var i = 0; i < n; i++) {
            this.chars[i] = Config.GLYPH_MAP.empty;
        }
        this.depth = new Float32Array(n);
        for (var j = 0; j < n; j++) {
            this.depth[j] = Infinity;
        }
        this.ids = new Int32Array(n);
        for (var k = 0; k < n; k++) {
            this.ids[k] = -1;
        }
    };

    FrameBuffer.prototype.clear = function () {
        if (!this.chars) {
            return;
        }
        var empty = Config.GLYPH_MAP.empty;
        for (var i = 0; i < this.chars.length; i++) {
            this.chars[i] = empty;
        }
        this.depth.fill(Infinity);
        if (this.ids) {
            this.ids.fill(-1);
        }
    };

    FrameBuffer.prototype.setCell = function (x, y, ch, depth, meshId) {
        if (!this.chars) {
            return;
        }
        x |= 0;
        y |= 0;
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return;
        }
        var i = y * this.width + x;
        // z-buffer: пишем, только если глубина ближе (меньше 1/w)
        if (depth === undefined || depth < this.depth[i]) {
            this.chars[i] = ch;
            this.depth[i] = depth;
            if (this.ids) {
                this.ids[i] = (meshId === undefined) ? -1 : meshId;
            }
        }
    };

    FrameBuffer.prototype.getChar = function (x, y) {
        x |= 0;
        y |= 0;
        if (!this.chars || x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return null;
        }
        return this.chars[y * this.width + x];
    };

    FrameBuffer.prototype.getDepth = function (x, y) {
        x |= 0;
        y |= 0;
        if (!this.depth || x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return Infinity;
        }
        return this.depth[y * this.width + x];
    };

    // Отрисовка на canvas: строка разбивается на прогалины одного цвета
    // (meshId), каждый run — отдельный fillText со своим ctx.fillStyle.
    FrameBuffer.prototype.flush = function (ctx, charW, charH, palette) {
        if (!this.chars || !charW || !charH) {
            return;
        }
        var w = this.width;
        var h = this.height;
        var fontPx = Math.max(1, Math.round(charH));
        ctx.font = fontPx + 'px monospace';
        ctx.textBaseline = 'top';
        var baseColor = (palette && palette.length > 0) ? palette[0] : Config.GLYPH_MAP.empty;

        for (var y = 0; y < h; y++) {
            var offset = y * w;
            var x = 0;
            while (x < w) {
                var ch = this.chars[offset + x];
                if (ch === Config.GLYPH_MAP.empty) {
                    x++;
                    continue;
                }
                var runStart = x;
                var id = (this.ids) ? this.ids[offset + x] : -1;
                while (x < w) {
                    var c2 = this.chars[offset + x];
                    if (c2 === Config.GLYPH_MAP.empty) break;
                    var id2 = (this.ids) ? this.ids[offset + x] : -1;
                    if (id2 !== id) break;
                    x++;
                }
                var run = '';
                for (var r = runStart; r < x; r++) {
                    run += this.chars[offset + r];
                }
                ctx.fillStyle = (palette && id >= 0 && id < palette.length) ? palette[id] : baseColor;
                // рисуем все прогалины, включая пустые — пробелы важны для фона
                ctx.fillText(run, runStart * charW, y * charH);
            }
        }
    };

    return FrameBuffer;
})();
