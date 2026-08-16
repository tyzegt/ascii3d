window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

var Rasterizer = (A3D.modules.Rasterizer = (function () {
    'use strict';

    var Vec3 = A3D.modules.Vec3;
    var Projection = A3D.modules.Projection;
    var GlyphMap = A3D.modules.GlyphMap;
    var Config = A3D.modules.Config;

    // Draws one screen-space polygon (2-4 pts with invW) into the frame buffer.
    // Depth = interpolated 1/w (perspective-correct). Writes only where the
    // depth is closer than what's already stored (z-buffer test in setCell).
    function fillPoly(fb, pts, ch, meshId) {
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
                        fb.setCell(px, py, ch, invW, meshId);
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
    function drawLine(fb, p0, p1, ch, meshId) {
        var dx = p1.x - p0.x;
        var dy = p1.y - p0.y;
        var steps = Math.max(Math.abs(dx), Math.abs(dy));
        if (steps <= 0) {
            fb.setCell(Math.round(p0.x), Math.round(p0.y), ch, p0.invW, meshId);
            return;
        }
        for (var i = 0; i <= steps; i++) {
            var t = i / steps;
            var x = p0.x + dx * t;
            var y = p0.y + dy * t;
            var invW = p0.invW + (p1.invW - p0.invW) * t;
            fb.setCell(Math.round(x), Math.round(y), ch, invW, meshId);
        }
    }

    // Axis-aligned bounding box of a mesh in LOCAL space, computed once and cached.
    function getBoundingBox(mesh) {
        if (mesh._bbox) return mesh._bbox;
        var minX = Infinity, minY = Infinity, minZ = Infinity;
        var maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        for (var i = 0; i < mesh.vertices.length; i++) {
            var v = mesh.vertices[i];
            if (v.x < minX) minX = v.x;
            if (v.y < minY) minY = v.y;
            if (v.z < minZ) minZ = v.z;
            if (v.x > maxX) maxX = v.x;
            if (v.y > maxY) maxY = v.y;
            if (v.z > maxZ) maxZ = v.z;
        }
        mesh._bbox = { minX: minX, minY: minY, minZ: minZ, maxX: maxX, maxY: maxY, maxZ: maxZ };
        return mesh._bbox;
    }

    // Frustum cull: is any part of the mesh's world bounding box on screen?
    // Clips the box (a convex polyhedron) against each of the 6 frustum planes
    // in view space and reports whether anything survives. This is exact for
    // perspective and handles large flat meshes (e.g. the ground plane) whose
    // 8 corners can all project off-screen while a band of the surface still
    // fills the view — testing corners/center alone misses that case.
    function boxInFrustum(mesh, wm, viewMatrix, projMatrix, width, height, cellAspect) {
        var bb = getBoundingBox(mesh);
        var m = projMatrix.elements;

        // The 6 frustum planes in VIEW space, as (normal, d) with the inside
        // half-space being dot(normal, point) + d >= 0. Near/far use the same
        // NEAR_CLIP as Projection.clipNear so culling never drops a face that
        // projectFace would keep (and vice-versa). Left/right/top/bottom are
        // derived from the exact screen mapping used by projectFace:
        //   sx = (M0*x + M4*y + M8*z) / w in [0, width]
        //   sy = (-(M1*x + M5*y + M9*z) * cellAspect) / w in [0, height]
        // with w = -z (> 0 for visible points).
        var nearZ = Projection.NEAR_CLIP;
        var farZ = Math.max(1e-4, m[10] + m[14]);
        var planes = [
            { a: 0, b: 0, c: -1, d: nearZ },                          // near:  -z >= nearZ
            { a: 0, b: 0, c: -1, d: -farZ },                          // far:   -z <= farZ
            { a: m[8] + m[0], b: m[9] + m[4], c: m[10] + m[2], d: m[14] + m[12] },  // left:  (M8+M0)x+(M9+M4)y+(M10+M2)z >= -(M14+M12)
            { a: m[8] - m[0], b: m[9] - m[4], c: m[10] - m[2], d: -(m[14] + m[12]) },  // right
            { a: (m[9] + m[5]) * cellAspect, b: (m[10] + m[6]) * cellAspect, c: (m[14] + m[13]) * cellAspect, d: height * cellAspect },  // top
            { a: -(m[9] - m[5]) * cellAspect, b: -(m[10] - m[6]) * cellAspect, c: -(m[14] - m[13]) * cellAspect, d: height * cellAspect }   // bottom
        ];

        // Transform the 8 box corners (local -> world -> camera space).
        var p = viewMatrix.elements;
        function toCam(x, y, z) {
            var wx = wm[0] * x + wm[4] * y + wm[8] * z + wm[12];
            var wy = wm[1] * x + wm[5] * y + wm[9] * z + wm[13];
            var wz = wm[2] * x + wm[6] * y + wm[10] * z + wm[14];
            return [
                p[0] * wx + p[4] * wy + p[8] * wz + p[12],
                p[1] * wx + p[5] * wy + p[9] * wz + p[13],
                p[2] * wx + p[6] * wy + p[10] * wz + p[14]
            ];
        }

        var xs = [bb.minX, bb.maxX];
        var ys = [bb.minY, bb.maxY];
        var zs = [bb.minZ, bb.maxZ];
        var poly = [];
        for (var i = 0; i < 2; i++) {
            for (var j = 0; j < 2; j++) {
                for (var k = 0; k < 2; k++) {
                    poly.push(toCam(xs[i], ys[j], zs[k]));
                }
            }
        }

        // Sutherland-Hodgman: clip the polygon against each plane in turn.
        for (var pl = 0; pl < planes.length && poly.length > 0; pl++) {
            var nrm = planes[pl];
            var out = [];
            var len = poly.length;
            for (var e = 0; e < len; e++) {
                var cur = poly[e];
                var prev = poly[(e + len - 1) % len];
                var curD = nrm.a * cur[0] + nrm.b * cur[1] + nrm.c * cur[2] + nrm.d;
                var prevD = nrm.a * prev[0] + nrm.b * prev[1] + nrm.c * prev[2] + nrm.d;
                if (curD >= 0) {
                    out.push(cur);
                    if (prevD < 0) {
                        var t = prevD / (prevD - curD);
                        out.push([
                            prev[0] + (cur[0] - prev[0]) * t,
                            prev[1] + (cur[1] - prev[1]) * t,
                            prev[2] + (cur[2] - prev[2]) * t
                        ]);
                    }
                } else if (prevD >= 0) {
                    var t2 = prevD / (prevD - curD);
                    out.push([
                        prev[0] + (cur[0] - prev[0]) * t2,
                        prev[1] + (cur[1] - prev[1]) * t2,
                        prev[2] + (cur[2] - prev[2]) * t2
                    ]);
                }
            }
            poly = out;
        }

        return poly.length >= 3;
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
        // ascii z-buffer behaves nicely with sparse cells), frustum-culled
        var meshes = [];
        scene.objects.forEach(function (root) {
            root.getWorldMatrix();
            root.traverse(function (node) {
                if (!node.isMesh) return;
                node.getWorldMatrix();
                var wm = node.worldMatrix.elements;
                if (boxInFrustum(node, wm, viewMatrix, projMatrix, width, height, aspect)) {
                    meshes.push(node);
                }
            });
        });

        // sort back-to-front. Rank each mesh by its NEAREST point to the camera:
        // max w (= -z_cam) over the 8 bounding-box corners. Sorting by the mesh
        // origin alone misorders large flat meshes (e.g. the ground plane), whose
        // origin can be far from the camera while part of the surface is near it,
        // so their faces get drawn first and then win z-tests they should lose.
        var pv = viewMatrix.elements;
        function nearestW(mesh) {
            var bb = getBoundingBox(mesh);
            var wm = mesh.worldMatrix.elements;
            var best = -Infinity;
            for (var i = 0; i < 2; i++) {
                var x = i ? bb.maxX : bb.minX;
                for (var j = 0; j < 2; j++) {
                    var y = j ? bb.maxY : bb.minY;
                    for (var k = 0; k < 2; k++) {
                        var z = k ? bb.maxZ : bb.minZ;
                        // world = wm * local, then camera space
                        var wx = wm[0] * x + wm[4] * y + wm[8] * z + wm[12];
                        var wy = wm[1] * x + wm[5] * y + wm[9] * z + wm[13];
                        var wz = wm[2] * x + wm[6] * y + wm[10] * z + wm[14];
                        var cz = pv[2] * wx + pv[6] * wy + pv[10] * wz + pv[14];
                        if (-cz > best) best = -cz;
                    }
                }
            }
            return best;
        }
        meshes.sort(function (a, b) {
            return nearestW(a) - nearestW(b);
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
                    fillPoly(fb, proj.pts, polyChar, mesh.meshId || 0);
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
                    drawLine(fb, seg[0], seg[1], edgeChar, m2.meshId || 0);
                }
            }
        }
    }

    return {
        render: render,
        fillPoly: fillPoly,
        drawLine: drawLine,
        computeInvWGradient: computeInvWGradient,
        boxInFrustum: boxInFrustum,
        getBoundingBox: getBoundingBox
    };
})());
