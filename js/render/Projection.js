window.A3D = window.A3D || {};
A3D.modules = A3D.modules || {};

var Projection = (A3D.modules.Projection = (function () {
    'use strict';

    var Vec3 = A3D.modules.Vec3;

    // Camera-space vertex: x, y, z (camera space) + w (= -z_cam for perspective).
    // u/v — UV-координаты угла грани (опц., для текстур); интерполируются
    // линейно в camera-space при near-clip (корректно: UV линейны по плоской
    // грани в 3D).
    function CVertex(x, y, z, u, v) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = -z;
        this.u = (u === undefined) ? 0 : u;
        this.v = (v === undefined) ? 0 : v;
    }

    // Small safety margin so vertices exactly at z=0 never divide by zero.
    // Must stay >= the projection's near plane (Config.NEAR): clipping closer
    // than the matrix actually uses leaves points with w < 0 after the real
    // clip, which makes interpolated 1/w go negative across a cell and the
    // rasterizer drops those cells (visible as holes in large flat meshes).
    var NEAR_CLIP = Math.max(A3D.modules.Config.NEAR, 0.05);

    function lerpVerts(a, b, t) {
        return new CVertex(
            a.x + (b.x - a.x) * t,
            a.y + (b.y - a.y) * t,
            a.z + (b.z - a.z) * t,
            a.u + (b.u - a.u) * t,
            a.v + (b.v - a.v) * t
        );
    }

    // Clips a camera-space polygon against the near plane using
    // Sutherland-Hodgman. The camera looks down -z, so a point is in front of
    // the camera when z_cam <= -clipZ (i.e. w = -z_cam >= clipZ > 0).
    // Returns CVertex[] (3-4 verts) or null if fully behind / degenerate.
    function clipNear(verts, near) {
        var clipW = (near === undefined) ? NEAR_CLIP : Math.max(near, 1e-6);
        var out = [];
        var len = verts.length;

        for (var i = 0; i < len; i++) {
            var cur = verts[i];
            var prev = verts[(i + len - 1) % len];
            // visible when w >= clipW, i.e. z <= -clipW
            var curIn = cur.z <= -clipW;
            var prevIn = prev.z <= -clipW;

            if (curIn) {
                out.push(cur);
                if (!prevIn) {
                    // interpolate at z = -clipW
                    var t = (-clipW - prev.z) / (cur.z - prev.z);
                    out.push(lerpVerts(prev, cur, t));
                }
            } else if (prevIn) {
                var t2 = (-clipW - prev.z) / (cur.z - prev.z);
                out.push(lerpVerts(prev, cur, t2));
            }
        }

        if (out.length < 3) {
            return null;
        }
        return out;
    }

    // Projects a face into screen space.
    // Inputs:
    //   verts       - Vec3[] in WORLD space
    //   uvs         - (опц.) number[], по 2 на вершину (u0,v0, u1,v1, ...) —
    //                  UV-координаты углов грани; кладутся в CVertex и
    //                  интерполируются при near-clip.
    //   normalCam   - Vec3, face normal transformed to CAMERA space (for cull)
    //   viewMatrix  - camera view matrix
    //   projMatrix  - perspective matrix
    //   width/height- frame buffer size in ascii cells
    //   aspect      - cellH / cellW (taller-than-wide correction for sy)
    // Output: { pts: [{x, y, invW, u, v}], area } or null when culled/clipped away.
    function projectFace(verts, uvs, normalCam, viewMatrix, projMatrix, width, height, aspect) {
        var n = verts.length;
        var p = viewMatrix.elements;
        var cam = new Array(n);

        // world -> camera space (+ UV угла грани, если переданы)
        for (var i = 0; i < n; i++) {
            var v = verts[i];
            var u = (uvs && uvs.length >= n * 2) ? uvs[i * 2] : 0;
            var vv = (uvs && uvs.length >= n * 2) ? uvs[i * 2 + 1] : 0;
            cam[i] = new CVertex(
                p[0] * v.x + p[4] * v.y + p[8] * v.z + p[12],
                p[1] * v.x + p[5] * v.y + p[9] * v.z + p[13],
                p[2] * v.x + p[6] * v.y + p[10] * v.z + p[14],
                u, vv
            );
        }

        // back-face cull: visible when the normal points towards the camera,
        // i.e. dot(normalCam, toCamera) > 0 where toCamera = -centroid
        var cx = 0, cy = 0, cz = 0;
        for (var j = 0; j < n; j++) {
            cx += cam[j].x; cy += cam[j].y; cz += cam[j].z;
        }
        cx /= n; cy /= n; cz /= n;
        if (normalCam.x * (-cx) + normalCam.y * (-cy) + normalCam.z * (-cz) <= 0) {
            return null;
        }

        // Clip exactly at the projection matrix's near plane (passed by the
        // caller, which also built the matrix), so no surviving vertex can end
        // up behind that plane. Fallback NEAR_CLIP is >= Config.NEAR anyway.
        var clipped = clipNear(cam, projMatrix.near);
        if (!clipped) {
            return null;
        }

        // perspective divide -> screen cells
        var m = projMatrix.elements;
        var pts = new Array(clipped.length);
        for (var k = 0; k < clipped.length; k++) {
            var c = clipped[k];
            var w = -c.z;
            if (w <= 0) {
                return null; // safety, should not happen after clip
            }
            var invW = 1 / w;
            var ndcX = (m[0] * c.x + m[4] * c.y + m[8] * c.z + m[12]) * invW;
            var ndcY = (m[1] * c.x + m[5] * c.y + m[9] * c.z + m[13]) * invW;
            pts[k] = {
                x: (ndcX * 0.5 + 0.5) * width,
                y: (0.5 - ndcY * 0.5) * height * aspect,
                invW: invW,
                u: c.u,
                v: c.v
            };
        }

        // signed screen area (positive = CCW on screen)
        var area = 0;
        for (var a = 0; a < pts.length; a++) {
            var b = pts[(a + 1) % pts.length];
            area += pts[a].x * b.y - b.x * pts[a].y;
        }

        return { pts: pts, area: area * 0.5 };
    }

    // Projects an edge (two world vertices) to screen space with near clipping.
    // Returns [{x, y, invW}, {x, y, invW}] or null when fully behind the camera.
    function projectEdge(a, b, viewMatrix, projMatrix, width, height, aspect) {
        var p = viewMatrix.elements;

        function toCam(v) {
            return new CVertex(
                p[0] * v.x + p[4] * v.y + p[8] * v.z + p[12],
                p[1] * v.x + p[5] * v.y + p[9] * v.z + p[13],
                p[2] * v.x + p[6] * v.y + p[10] * v.z + p[14]
            );
        }

        var ca = toCam(a);
        var cb = toCam(b);

        // visible when z <= -NEAR_CLIP
        if (ca.z > -NEAR_CLIP && cb.z > -NEAR_CLIP) return null;
        if (ca.z > -NEAR_CLIP || cb.z > -NEAR_CLIP) {
            var t = (-NEAR_CLIP - ca.z) / (cb.z - ca.z);
            if (ca.z > -NEAR_CLIP) {
                ca = lerpVerts(ca, cb, t);
            } else {
                cb = lerpVerts(cb, ca, t);
            }
        }

        var m = projMatrix.elements;
        function toScreen(c) {
            var w = -c.z;
            if (w <= 0) return null;
            var invW = 1 / w;
            var ndcX = (m[0] * c.x + m[4] * c.y + m[8] * c.z + m[12]) * invW;
            var ndcY = (m[1] * c.x + m[5] * c.y + m[9] * c.z + m[13]) * invW;
            return {
                x: (ndcX * 0.5 + 0.5) * width,
                y: (0.5 - ndcY * 0.5) * height * aspect,
                invW: invW
            };
        }

        var sa = toScreen(ca);
        var sb = toScreen(cb);
        if (!sa || !sb) return null;
        return [sa, sb];
    }

    // Rotates a world-space normal into camera space (no translation).
    function normalToCamera(normalWorld, viewMatrix) {
        var p = viewMatrix.elements;
        return new Vec3(
            p[0] * normalWorld.x + p[4] * normalWorld.y + p[8] * normalWorld.z,
            p[1] * normalWorld.x + p[5] * normalWorld.y + p[9] * normalWorld.z,
            p[2] * normalWorld.x + p[6] * normalWorld.y + p[10] * normalWorld.z
        );
    }

    return {
        NEAR_CLIP: NEAR_CLIP,
        clipNear: clipNear,
        projectFace: projectFace,
        projectEdge: projectEdge,
        normalToCamera: normalToCamera
    };
})());
