window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

var Rasterizer = (A3D.modules.Rasterizer = (function () {
    'use strict';

    var Vec3 = A3D.modules.Vec3;
    var Projection = A3D.modules.Projection;
    var GlyphMap = A3D.modules.GlyphMap;

    // Draws one screen-space polygon (2-4 pts with invW) into the frame buffer.
    // Depth = interpolated 1/w (perspective-correct). Writes only where the
    // depth is closer than what's already stored (z-buffer test in setCell).
    function fillPoly(fb, pts, ch) {
        var n = pts.length;
        if (n < 3) return;

        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (var i = 0; i < n; i++) {
            var x = pts[i].x, y = pts[i].y;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }

        var x0 = Math.max(0, Math.floor(minX));
        var y0 = Math.max(0, Math.floor(minY));
        var x1 = Math.min(fb.width - 1, Math.ceil(maxX));
        var y1 = Math.min(fb.height - 1, Math.ceil(maxY));

        if (x1 < x0 || y1 < y0) return;

        // gradient of invW across the polygon: invW = A*x + B*y + C
        var grad = computeInvWGradient(pts);

        for (var py = y0; py <= y1; py++) {
            var yc = py + 0.5;
            var xs = [];

            // edge table: x intersections of each polygon edge with this scanline
            for (var e = 0; e < n; e++) {
                var a = pts[e];
                var b = pts[(e + 1) % n];
                var ay = a.y, by = b.y;
                if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) {
                    var t = (yc - ay) / (by - ay);
                    xs.push(a.x + (b.x - a.x) * t);
                }
            }

            if (xs.length < 2) continue;

            // sort and take pairs -> spans
            xs.sort(function (p, q) { return p - q; });
            for (var s = 0; s + 1 < xs.length; s += 2) {
                var sx0 = xs[s];
                var sx1 = xs[s + 1];
                var cx0 = Math.max(x0, Math.ceil(sx0 - 0.5));
                var cx1 = Math.min(x1, Math.floor(sx1 - 0.5));

                for (var px = cx0; px <= cx1; px++) {
                    var xc = px + 0.5;
                    var invW = grad.A * xc + grad.B * yc + grad.C;
                    if (invW > 0) {
                        fb.setCell(px, py, ch, invW);
                    }
                }
            }
        }
    }

    // Fits invW = A*x + B*y + C to the polygon's first three vertices.
    function computeInvWGradient(pts) {
        var x0 = pts[0].x, y0 = pts[0].y, w0 = pts[0].invW;
        var x1 = pts[1].x, y1 = pts[1].y, w1 = pts[1].invW;
        var x2 = pts[2].x, y2 = pts[2].y, w2 = pts[2].invW;

        // solve:
        //   A*x0 + B*y0 + C = w0
        //   A*x1 + B*y1 + C = w1
        //   A*x2 + B*y2 + C = w2
        var d = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
        if (Math.abs(d) < 1e-9) {
            // degenerate (collinear / off-screen sliver): constant depth
            return { A: 0, B: 0, C: w0 };
        }
        var A = ((w1 - w0) * (y2 - y0) - (w2 - w0) * (y1 - y0)) / d;
        var B = ((x1 - x0) * (w2 - w0) - (x2 - x0) * (w1 - w0)) / d;
        var C = w0 - A * x0 - B * y0;
        return { A: A, B: B, C: C };
    }

    // Draws a screen-space line segment with the given glyph, z-tested.
    function drawLine(fb, p0, p1, ch) {
        var dx = p1.x - p0.x;
        var dy = p1.y - p0.y;
        var steps = Math.max(Math.abs(dx), Math.abs(dy));
        if (steps <= 0) {
            fb.setCell(Math.round(p0.x), Math.round(p0.y), ch, p0.invW);
            return;
        }
        for (var i = 0; i <= steps; i++) {
            var t = i / steps;
            var x = p0.x + dx * t;
            var y = p0.y + dy * t;
            var invW = p0.invW + (p1.invW - p0.invW) * t;
            fb.setCell(Math.round(x), Math.round(y), ch, invW);
        }
    }

    // Full render: scene -> frame buffer.
    //   scene      - A3D Scene (objects with world matrices updated)
    //   camera     - A3D Camera
    //   fb         - FrameBuffer (already cleared)
    //   viewMatrix, projMatrix - precomputed by the caller
    //   aspect     - cellH / cellW correction factor for screen y
    function render(scene, camera, fb, viewMatrix, projMatrix, aspect) {
        var width = fb.width;
        var height = fb.height;
        var polyChar = GlyphMap.polygon();
        var edgeChar = GlyphMap.edge();

        // gather meshes (depth sort back-to-front as a cheap heuristic so the
        // ascii z-buffer behaves nicely with sparse cells)
        var meshes = [];
        scene.objects.forEach(function (root) {
            root.traverse(function (node) {
                if (node.isMesh) meshes.push(node);
            });
        });

        // sort by camera-space distance, far first
        var p = viewMatrix.elements;
        meshes.sort(function (a, b) {
            var wa = a.worldMatrix.elements;
            var wb = b.worldMatrix.elements;
            var ax = p[0] * wa[12] + p[4] * wa[13] + p[8] * wa[14] + p[12];
            var ay = p[1] * wa[12] + p[5] * wa[13] + p[9] * wa[14] + p[13];
            var az = p[2] * wa[12] + p[6] * wa[13] + p[10] * wa[14] + p[14];
            var bx = p[0] * wb[12] + p[4] * wb[13] + p[8] * wb[14] + p[12];
            var by = p[1] * wb[12] + p[5] * wb[13] + p[9] * wb[14] + p[13];
            var bz = p[2] * wb[12] + p[6] * wb[13] + p[10] * wb[14] + p[14];
            return (bx * bx + by * by + bz * bz) - (ax * ax + ay * ay + az * az);
        });

        // pass 1: polygon fill
        for (var i = 0; i < meshes.length; i++) {
            var mesh = meshes[i];
            var wm = mesh.worldMatrix.elements;
            var verts = mesh.vertices;
            var faces = mesh.faces;

            // transform vertices to world space once
            var worldVerts = new Array(verts.length);
            for (var vi = 0; vi < verts.length; vi++) {
                var v = verts[vi];
                worldVerts[vi] = new Vec3(
                    wm[0] * v.x + wm[4] * v.y + wm[8] * v.z + wm[12],
                    wm[1] * v.x + wm[5] * v.y + wm[9] * v.z + wm[13],
                    wm[2] * v.x + wm[6] * v.y + wm[10] * v.z + wm[14]
                );
            }

            for (var fi = 0; fi < faces.length; fi++) {
                var f = faces[fi];
                var tri = [worldVerts[f.indices[0]], worldVerts[f.indices[1]], worldVerts[f.indices[2]]];

                // face normal in camera space (for back-face cull)
                var normalCam = Projection.normalToCamera(f.normal, viewMatrix);

                var proj = Projection.projectFace(tri, normalCam, viewMatrix, projMatrix, width, height, aspect);
                if (proj) {
                    fillPoly(fb, proj.pts, polyChar);
                }
            }
        }

        // pass 2: edges (outlines) — drawn on top with a stronger glyph
        for (var mi = 0; mi < meshes.length; mi++) {
            var m2 = meshes[mi];
            var wm2 = m2.worldMatrix.elements;
            var v2 = m2.vertices;

            // world-space vertices
            var wv = new Array(v2.length);
            for (var wi = 0; wi < v2.length; wi++) {
                var vv = v2[wi];
                wv[wi] = new Vec3(
                    wm2[0] * vv.x + wm2[4] * vv.y + wm2[8] * vv.z + wm2[12],
                    wm2[1] * vv.x + wm2[5] * vv.y + wm2[9] * vv.z + wm2[13],
                    wm2[2] * vv.x + wm2[6] * vv.y + wm2[10] * vv.z + wm2[14]
                );
            }

            var edges = m2.getEdges();
            for (var ei = 0; ei < edges.length; ei++) {
                var seg = Projection.projectEdge(wv[edges[ei][0]], wv[edges[ei][1]], viewMatrix, projMatrix, width, height, aspect);
                if (seg) {
                    drawLine(fb, seg[0], seg[1], edgeChar);
                }
            }
        }
    }

    return {
        render: render,
        fillPoly: fillPoly,
        drawLine: drawLine,
        computeInvWGradient: computeInvWGradient
    };
})());
