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
    };

    FrameBuffer.prototype.setCell = function (x, y, ch, depth) {
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

    // Отрисовка на canvas построчно — один fillText на строку (быстрее, чем по ячейкам).
    FrameBuffer.prototype.flush = function (ctx, charW, charH) {
        if (!this.chars || !charW || !charH) {
            return;
        }
        var w = this.width;
        var h = this.height;
        var fontPx = Math.max(1, Math.round(charH));
        ctx.font = fontPx + 'px monospace';
        ctx.textBaseline = 'top';

        for (var y = 0; y < h; y++) {
            var row = '';
            var offset = y * w;
            for (var x = 0; x < w; x++) {
                var ch = this.chars[offset + x];
                row += (ch === Config.GLYPH_MAP.empty) ? ' ' : ch;
            }
            // рисуем все строки, включая пустые — пробелы важны для фона
            ctx.fillText(row, 0, y * charH);
        }
    };

    return FrameBuffer;
})();
