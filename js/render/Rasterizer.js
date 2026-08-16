window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

var Rasterizer = (A3D.modules.Rasterizer = (function () {
    'use strict';

    var Vec3 = A3D.modules.Vec3;
    var Projection = A3D.modules.Projection;
    var GlyphMap = A3D.modules.GlyphMap;
    var Config = A3D.modules.Config;
    var Lighting = A3D.modules.Lighting;
    var Texture = A3D.modules.Texture;

    // 'r,g,b' (0..1, допустимо >1) → [R,G,B] 0..255.
    function rgbTo255(c) {
        if (!c || c.length < 3) return [255, 255, 255];
        function q(v) {
            v = Math.round(v * 255);
            return v < 0 ? 0 : (v > 255 ? 255 : v);
        }
        return [q(c[0]), q(c[1]), q(c[2])];
    }

    // Draws one screen-space polygon (2-4 pts with invW) into the frame buffer.
    // Depth = interpolated 1/w (perspective-correct). Writes only where the
    // depth is closer than what's already stored (z-buffer test in setCell).
    //
    // uvs (опц.) — number[], по 2 на вершину (u0,v0, u1,v1, ...). Если заданы,
    // вычисляются перспективно-корректные градиенты u/w и v/w (вместе с 1/w),
    // и из них в каждой ячейке восстанавливаются u,v.
    //
    // color (опц.) — [r,g,b] 0..1: записывается per-cell через setCellColor
    // (освещение, этап B). Без color — setCell (старое поведение, белый цвет).
    //
    // tex (опц., этап C) — текстура из Texture.get(): глиф ячейки = символ из
    // текстуры по восстановленным u,v; без tex — константный ch.
    function fillPoly(fb, pts, ch, meshId, uvs, color, tex) {
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

        // перспективно-корректные UV: если переданы uvs, строим градиенты u/w и v/w.
        var hasUV = !!(uvs && uvs.length >= n * 2);
        var uvGrads = hasUV ? buildUVGradients(pts, uvs) : null;

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
                        var cellCh = ch;
                        if (tex && uvGrads) {
                            // перспективно-корректные u,v → символ текстуры
                            var uvPt = sampleUV(uvGrads, grad, xc, yc);
                            if (uvPt) {
                                cellCh = textureGlyph(tex, uvPt.u, uvPt.v);
                            }
                        }
                        if (color) {
                            fb.setCellColor(px, py, cellCh, invW, meshId, color[0], color[1], color[2]);
                        } else {
                            fb.setCell(px, py, cellCh, invW, meshId);
                        }
                    }
                }
            }
        }
    }

    // Символ текстуры по (u,v): bilinear-интенсивность → глиф из RAMP.
    function textureGlyph(tex, u, v) {
        var intensity = Texture.sample(tex, u, v);
        return GlyphMap.byIntensity(intensity);
    }

    // Строит перспективно-корректные градиенты u/w и v/w для полигона.
    // Возвращает { uw: grad, vw: grad }, где каждый grad = {A,B,C} — линейная
    // функция по экранным координатам (x,y). В ячейке восстанавливается через
    // sampleUV: u = (u/w)/(1/w), v = (v/w)/(1/w) — корректно для плоской грани.
    function buildUVGradients(pts, uvs) {
        var n = pts.length;
        var uwPts = new Array(n), vwPts = new Array(n);
        for (var i = 0; i < n; i++) {
            var uVal = uvs[i * 2], vVal = uvs[i * 2 + 1];
            var iW = pts[i].invW || 0;
            uwPts[i] = { x: pts[i].x, y: pts[i].y, val: uVal * iW };
            vwPts[i] = { x: pts[i].x, y: pts[i].y, val: vVal * iW };
        }
        return { uw: solveGradient3(uwPts), vw: solveGradient3(vwPts) };
    }

    // Восстанавливает u,v в точке (xc,yc) экрана по градиентам 1/w, u/w, v/w.
    // Возвращает {u, v} или null, если invW <= 0 (точка за near plane).
    function sampleUV(uvGrads, invWGrad, xc, yc) {
        if (!uvGrads) return null;
        var invW = invWGrad.A * xc + invWGrad.B * yc + invWGrad.C;
        if (invW <= 0) return null;
        var uw = uvGrads.uw.A * xc + uvGrads.uw.B * yc + uvGrads.uw.C;
        var vw = uvGrads.vw.A * xc + uvGrads.vw.B * yc + uvGrads.vw.C;
        return { u: uw / invW, v: vw / invW };
    }

    // Fits val = A*x + B*y + C to the first three points of pts (each with .x,.y,.val).
    function solveGradient3(pts) {
        var x0 = pts[0].x, y0 = pts[0].y, w0 = pts[0].val;
        var x1 = pts[1].x, y1 = pts[1].y, w1 = pts[1].val;
        var x2 = pts[2].x, y2 = pts[2].y, w2 = pts[2].val;

        // solve:
        //   A*x0 + B*y0 + C = w0
        //   A*x1 + B*y1 + C = w1
        //   A*x2 + B*y2 + C = w2
        var d = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
        if (Math.abs(d) < 1e-9) {
            // degenerate (collinear / off-screen sliver): constant value
            return { A: 0, B: 0, C: w0 };
        }
        var A = ((w1 - w0) * (y2 - y0) - (w2 - w0) * (y1 - y0)) / d;
        var B = ((x1 - x0) * (w2 - w0) - (x2 - x0) * (w1 - w0)) / d;
        var C = w0 - A * x0 - B * y0;
        return { A: A, B: B, C: C };
    }

    // Fits invW = A*x + B*y + C to the polygon's first three vertices.
    function computeInvWGradient(pts) {
        var tmp = new Array(3);
        for (var i = 0; i < 3; i++) {
            tmp[i] = { x: pts[i].x, y: pts[i].y, val: pts[i].invW };
        }
        return solveGradient3(tmp);
    }

    // Draws a screen-space line segment with the given glyph, z-tested.
    // color (опц.) — [r,g,b] 0..1: per-cell цвет через setCellColor.
    function drawLine(fb, p0, p1, ch, meshId, color) {
        var dx = p1.x - p0.x;
        var dy = p1.y - p0.y;
        var steps = Math.max(Math.abs(dx), Math.abs(dy));
        if (steps <= 0) {
            if (color) {
                fb.setCellColor(Math.round(p0.x), Math.round(p0.y), ch, p0.invW, meshId, color[0], color[1], color[2]);
            } else {
                fb.setCell(Math.round(p0.x), Math.round(p0.y), ch, p0.invW, meshId);
            }
            return;
        }
        for (var i = 0; i <= steps; i++) {
            var t = i / steps;
            var x = p0.x + dx * t;
            var y = p0.y + dy * t;
            var invW = p0.invW + (p1.invW - p0.invW) * t;
            if (color) {
                fb.setCellColor(Math.round(x), Math.round(y), ch, invW, meshId, color[0], color[1], color[2]);
            } else {
                fb.setCell(Math.round(x), Math.round(y), ch, invW, meshId);
            }
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

    // Мировая нормаль грани: локальная f.normal × 3×3 из worldMatrix.
    // Без inverse-transpose — при неоднородном масштабе это приближение
    // (приемлемо для ascii, см. FEATURES_PLAN §5). Возвращает Vec3 или null.
    function faceWorldNormal(f, wm) {
        var n = f.normal;
        if (!n) return null;
        var nx = wm[0] * n.x + wm[4] * n.y + wm[8] * n.z;
        var ny = wm[1] * n.x + wm[5] * n.y + wm[9] * n.z;
        var nz = wm[2] * n.x + wm[6] * n.y + wm[10] * n.z;
        var v = new Vec3(nx, ny, nz);
        if (v.length() < 1e-8) return null;
        return v.normalize();
    }

    // Цвет материала меша: mesh.material.color → [r,g,b] 0..1, иначе палитра.
    function materialColor(mesh) {
        var mat = mesh && mesh.material;
        if (mat && Array.isArray(mat.color) && mat.color.length >= 3) {
            return rgbTo255([mat.color[0], mat.color[1], mat.color[2]]);
        }
        var id = (mesh && mesh.meshId !== undefined) ? mesh.meshId : 0;
        var hex = Config.MESH_PALETTE[((id % Config.MESH_PALETTE.length) + Config.MESH_PALETTE.length) % Config.MESH_PALETTE.length];
        return [
            parseInt(hex.substring(1, 3), 16),
            parseInt(hex.substring(3, 5), 16),
            parseInt(hex.substring(5, 7), 16)
        ];
    }

    // Full render: scene -> frame buffer.
    //   scene      - A3D Scene (objects with world matrices updated; scene.lights — источники)
    //   camera     - A3D Camera
    //   fb         - FrameBuffer (already cleared)
    //   viewMatrix, projMatrix - precomputed by the caller
    //   aspect     - cellH / cellW correction factor for screen y
    function render(scene, camera, fb, viewMatrix, projMatrix, aspect) {
        var width = fb.width;
        var height = fb.height;
        var edgeChar = GlyphMap.edge();
        var lights = (scene && scene.lights) ? scene.lights : [];
        // цвет рёбер: Config.EDGE_COLOR × свет на центроиде меша (этап B)
        var edgeColor = rgbTo255(Config.EDGE_COLOR || [0.35, 0.35, 0.35]);

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

        // pass 1: polygon fill (освещение, этап B): мировая нормаль грани +
        // центроид → Lighting.computeFaceLight; без текстуры глиф =
        // GlyphMap.byIntensity(luminance), цвет = материал × свет (per-cell).
        for (var i = 0; i < meshes.length; i++) {
            var mesh = meshes[i];
            var wm = mesh.worldMatrix.elements;
            var verts = mesh.vertices;
            var faces = mesh.faces;

            // ленивая генерация UV (этап C): Texture.js грузится после примитивов,
            // поэтому f.uv вычисляется здесь на первом рендере и кэшируется.
            if (!mesh._uvGenerated && Texture && Texture.generateFaceUVs) {
                Texture.generateFaceUVs(mesh);
                mesh._uvGenerated = true;
            }

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

            // цвет материала меша (палитра или mesh.material.color) в 0..1
            var matRGB = materialColor(mesh);

            // кэш текстур по имени (этап C): имя → объект текстуры
            var texCache = {};

            for (var fi = 0; fi < faces.length; fi++) {
                var f = faces[fi];
                var i0 = f.indices[0], i1 = f.indices[1], i2 = f.indices[2];
                var tri = [worldVerts[i0], worldVerts[i1], worldVerts[i2]];

                // face normal in camera space (for back-face cull)
                var normalCam = Projection.normalToCamera(f.normal, viewMatrix);

                // UV угла грани (этап C: примитивы генерируют f.uv)
                var faceUVs = (f && f.uv) ? f.uv : null;
                var proj = Projection.projectFace(tri, faceUVs, normalCam, viewMatrix, projMatrix, width, height, aspect);
                if (proj) {
                    // мировая нормаль + центроид грани → свет на грань
                    var nWorld = faceWorldNormal(f, wm);
                    var centroid = new Vec3(
                        (tri[0].x + tri[1].x + tri[2].x) / 3,
                        (tri[0].y + tri[1].y + tri[2].y) / 3,
                        (tri[0].z + tri[1].z + tri[2].z) / 3
                    );
                    var light = Lighting.computeFaceLight(nWorld || f.normal, centroid, lights);

                    // текстура грани (этап C): имя из material → объект
                    var faceTex = null;
                    if (mesh.getFaceTextureName) {
                        var texName = mesh.getFaceTextureName(f);
                        if (texName) {
                            if (!texCache.hasOwnProperty(texName)) {
                                texCache[texName] = Texture ? Texture.get(texName) : null;
                            }
                            faceTex = texCache[texName];
                        }
                    }

                    // глиф: с текстурой — символ текстуры (per-cell в fillPoly),
                    // без — по яркости света (градиент символов).
                    var baseGlyph = GlyphMap.byIntensity(Lighting.luminance(light));
                    fillPoly(fb, proj.pts, baseGlyph, mesh.meshId || 0, faceUVs, [
                        matRGB[0] / 255 * light.r,
                        matRGB[1] / 255 * light.g,
                        matRGB[2] / 255 * light.b
                    ], faceTex);
                }
            }
        }

        // pass 2: edges (outlines) — drawn on top with a stronger glyph;
        // цвет = Config.EDGE_COLOR × свет на центроиде меша.
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
            var bb = getBoundingBox(m2);
            var meshCentroid = new Vec3(
                (bb.minX + bb.maxX) / 2, (bb.minY + bb.maxY) / 2, (bb.minZ + bb.maxZ) / 2
            );
            // мировая позиция центроида bbox: local → world
            var centroidW = new Vec3(
                wm2[0] * meshCentroid.x + wm2[4] * meshCentroid.y + wm2[8] * meshCentroid.z + wm2[12],
                wm2[1] * meshCentroid.x + wm2[5] * meshCentroid.y + wm2[9] * meshCentroid.z + wm2[13],
                wm2[2] * meshCentroid.x + wm2[6] * meshCentroid.y + wm2[10] * meshCentroid.z + wm2[14]
            );
            // нормаль для света на центроид: любая грань (ориентация не важна —
            // берём среднюю мировую нормаль всех граней меша)
            var avgN = new Vec3(0, 0, 0);
            for (var fmi = 0; fmi < m2.faces.length; fmi++) {
                var fn = faceWorldNormal(m2.faces[fmi], wm2);
                if (fn) avgN = avgN.add(fn);
            }
            var edgeLight = Lighting.computeFaceLight(avgN.normalize(), centroidW, lights);

            var edges = m2.getEdges();
            for (var ei = 0; ei < edges.length; ei++) {
                var seg = Projection.projectEdge(wv[edges[ei][0]], wv[edges[ei][1]], viewMatrix, projMatrix, width, height, aspect);
                if (seg) {
                    drawLine(fb, seg[0], seg[1], edgeChar, m2.meshId || 0, [
                        edgeColor[0] / 255 * edgeLight.r,
                        edgeColor[1] / 255 * edgeLight.g,
                        edgeColor[2] / 255 * edgeLight.b
                    ]);
                }
            }
        }
    }

    return {
        render: render,
        fillPoly: fillPoly,
        drawLine: drawLine,
        computeInvWGradient: computeInvWGradient,
        buildUVGradients: buildUVGradients,
        sampleUV: sampleUV,
        boxInFrustum: boxInFrustum,
        getBoundingBox: getBoundingBox
    };
})());
