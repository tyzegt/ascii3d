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
        this.r = null;       // Uint8ClampedArray, w*h (per-cell цвет, 0..255)
        this.g = null;
        this.b = null;
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
        // Инициализируем 0: з-тест держит МАКСИМУМ 1/w (ближе = больше 1/w),
        // поэтому пустая ячейка должна проигрывать любому реальному значению.
        this.depth = new Float32Array(n);
        this.ids = new Int32Array(n);
        for (var k = 0; k < n; k++) {
            this.ids[k] = -1;
        }
        // per-cell цвет: по умолчанию белый (нейтральный умножитель).
        this.r = new Uint8ClampedArray(n);
        this.g = new Uint8ClampedArray(n);
        this.b = new Uint8ClampedArray(n);
        for (var c = 0; c < n; c++) {
            this.r[c] = 255;
            this.g[c] = 255;
            this.b[c] = 255;
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
        this.depth.fill(0);
        if (this.ids) {
            this.ids.fill(-1);
        }
        // цвет сбрасываем в нейтральный белый (умножитель не меняет материал)
        if (this.r) {
            var n = this.chars.length;
            for (var c = 0; c < n; c++) {
                this.r[c] = 255;
                this.g[c] = 255;
                this.b[c] = 255;
            }
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
        // z-buffer: пишем, только если глубина ближе. Камера смотрит вдоль -z,
        // w = -z_cam: БЛИЖЕ = МЕНЬШЕ w = БОЛЬШЕ 1/w. Значит держим МАКСИМУМ 1/w.
        if (depth === undefined || depth > this.depth[i]) {
            this.chars[i] = ch;
            this.depth[i] = depth;
            if (this.ids) {
                this.ids[i] = (meshId === undefined) ? -1 : meshId;
            }
            // цвет по умолчанию — нейтральный белый (материал/палитра без изменения)
            if (this.r) {
                this.r[i] = 255;
                this.g[i] = 255;
                this.b[i] = 255;
            }
        }
    };

    // Пишет глиф + per-cell цвет (r/g/b в 0..1). Цвет записывается только если
    // глубина ближе (тот же з-тест, что и в setCell). Используется освещением/
    // текстурами; setCell остаётся для совместимости (цвет = белый).
    FrameBuffer.prototype.setCellColor = function (x, y, ch, depth, meshId, r, g, b) {
        if (!this.chars) {
            return;
        }
        x |= 0;
        y |= 0;
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return;
        }
        var i = y * this.width + x;
        if (depth === undefined || depth > this.depth[i]) {
            this.chars[i] = ch;
            this.depth[i] = depth;
            if (this.ids) {
                this.ids[i] = (meshId === undefined) ? -1 : meshId;
            }
            if (this.r) {
                var cr = (r === undefined) ? 1 : r;
                var cg = (g === undefined) ? 1 : g;
                var cb = (b === undefined) ? 1 : b;
                this.r[i] = Math.max(0, Math.min(255, Math.round(cr * 255)));
                this.g[i] = Math.max(0, Math.min(255, Math.round(cg * 255)));
                this.b[i] = Math.max(0, Math.min(255, Math.round(cb * 255)));
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
            return 0;
        }
        return this.depth[y * this.width + x];
    };

    // Отрисовка на canvas: строка разбивается на прогалины одинаковой пары
    // (глиф, цвет), каждый run — отдельный fillText со своим ctx.fillStyle.
    // Цвет берётся из per-cell r/g/b (по умолчанию белый); palette/meshId
    // сохраняются в ids для совместимости с тестами, но больше не определяют
    // цвет на экране. Если per-cell цвета нет (fb.r == null) — fallback на
    // старую схему по meshId из палитры.
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
        var hasCellColor = !!this.r;

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
                // стартовый цвет ячейки run'а
                var cr, cg, cb;
                if (hasCellColor) {
                    cr = this.r[offset + x];
                    cg = this.g[offset + x];
                    cb = this.b[offset + x];
                }
                while (x < w) {
                    var c2 = this.chars[offset + x];
                    if (c2 === Config.GLYPH_MAP.empty) break;
                    var id2 = (this.ids) ? this.ids[offset + x] : -1;
                    if (id2 !== id) break;
                    if (hasCellColor) {
                        if (this.r[offset + x] !== cr ||
                            this.g[offset + x] !== cg ||
                            this.b[offset + x] !== cb) break;
                    }
                    x++;
                }
                var run = '';
                for (var rIdx = runStart; rIdx < x; rIdx++) {
                    run += this.chars[offset + rIdx];
                }
                if (hasCellColor) {
                    ctx.fillStyle = 'rgb(' + cr + ',' + cg + ',' + cb + ')';
                } else {
                    ctx.fillStyle = (palette && id >= 0 && id < palette.length) ? palette[id] : baseColor;
                }
                // рисуем все прогалины, включая пустые — пробелы важны для фона
                ctx.fillText(run, runStart * charW, y * charH);
            }
        }
    };

    return FrameBuffer;
})();
