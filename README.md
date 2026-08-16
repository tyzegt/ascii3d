# ASCII 3D

A 3D engine built with plain HTML + JavaScript (ES5, no ES modules). All graphics
are ASCII characters drawn on a `<canvas>`: every character in the terminal grid is
a "pixel", and each mesh is rendered in its own color from a palette
(`Config.MESH_PALETTE`). No dependencies, no build. Adapts to the window size and
hiDPI (`devicePixelRatio`).

Each character in the terminal grid is a "pixel". Resolution = canvas size divided
by the ASCII cell width/height (measured via `ctx.measureText`).

## Running

The app is hosted on IIS: the working directory is mapped as a site with caching
disabled (`web.config`) — open it at `http://ascii3d.local.int/`. Do not use
`file://` or ad-hoc static servers for verification.

Built-in scenes, loading from file (`<input type="file">`) and saving to JSON work
regardless; the IIS address is the canonical way to run and verify.

## Controls

| Key | Action |
|---|---|
| `W A S D` | move forward/left/back/right (strafe) |
| `Q` / `E` | down / up |
| Arrow keys | alternative: ↑/↓ — forward/back, ←/→ — turn camera (yaw), accelerated |
| `Z` / `X` | tilt camera up / down (pitch) — mouse-free look |
| Mouse (click on canvas) | look around via Pointer Lock; click again after ESC to re-lock |
| `1`–`5` | add an object in front of the camera: 1 cube, 2 sphere, 3 pyramid, 4 plane, 5 character |
| `Tab` | scene menu (↑/↓ — select, Enter — load, Esc — close) |
| `R` | reset camera |
| `H` | show/hide HUD |
| `P` | save the current scene to a JSON file (Blob download) |

Speed, sensitivity, FOV, near/far are constants in `js/core/Config.js`
(defaults: FOV 70°, near 0.1, far 500, speed 8, sensitivity 0.003; plus
`TURN_SPEED`/`LOOK_SPEED` for keyboard turning and `DEFAULT_SCENE`).

## Scenes

Built-in scenes are registered in the registry (`scenes/*.js`) and available from
the menu (Tab) or via the URL parameter `?scene=<name>`:

- `empty` — an empty scene;
- `city_block` — a small town: buildings, dome, pyramid, character, sphere
  (**the default scene**, `Config.DEFAULT_SCENE`);
- `desert` — a desert: pyramids, rocks, a runner, an oasis;
- `character_demo` — three characters of different scales + decor.

Loading an external scene: menu (Tab) → "Load from file…" → pick a `.json`.
Saving: the `P` key downloads the current scene as `<name>.json`
(`Scene.toJSON()` round-trip is compatible with `SceneLoader.load`).

Scene format — JSON: `name`, `camera {position, yaw, pitch}`, `objects[]`
(recursively, `type` + `position/rotation/scale` + `children`). Example —
`scenes/city_block.js`.

## Architecture

All modules are IIFEs that attach themselves to the global namespace
`window.A3D.modules` (classic `<script>` tags, no ES modules). Load order:
`utils → core → scene → render → ui → scenes → main`.

At startup `js/main.js` checks the list of loaded modules against an internal
`expected` list — any new module must be added there too, otherwise boot aborts
with a "missing modules" error. Scenes are registered in the registry via
`A3D.SceneRegistry`.

```
ascii3d/
├── index.html          # entry point, canvas, script includes
├── web.config          # IIS: disable static caching (ascii3d.local.int)
├── css/style.css       # fullscreen canvas, monospace, overflow:hidden
├── scenes/             # built-in scenes (register themselves in the registry)
│   ├── empty.js
│   ├── city_block.js
│   ├── desert.js
│   └── character_demo.js
└── js/
    ├── main.js         # initialization, game loop, module wiring
    ├── core/
    │   ├── Vec3.js     # vector: add/sub/scale/dot/cross/normalize/length/transform
    │   ├── Mat4.js     # 4x4 (column-major): perspective, lookAt, translate, rotate, scale, multiply, invert
    │   ├── Camera.js   # position/yaw/pitch/fov; move*, rotate, setView, getViewMatrix
    │   ├── Input.js    # keyboard + mouse (Pointer Lock), onKeydown handlers, auto-repeat guard
    │   ├── MathUtils.js# clamp, lerp, degToRad
    │   └── Config.js   # constants: FOV, near/far, speed, sensitivity, TURN/LOOK_SPEED, DEFAULT_SCENE, GlyphMap, MESH_PALETTE
    ├── scene/
    │   ├── Scene.js        # object list, update(dt), assignMeshIds, countFaces, toJSON (round-trip)
    │   ├── Object3D.js     # position/rotation/scale, children, worldMatrix (lazy via dirty; mutate only through setTransform/markDirty)
    │   ├── SceneLoader.js  # JSON → objects via the type registry; error handling
    │   ├── SceneRegistry.js# registry of primitive types + ready-made scenes
    │   └── primitives/
    │       ├── Mesh.js     # vertices/faces, computeNormals (CCW), getEdges
    │       ├── Cube.js     # 8 vertices, 12 triangles
    │       ├── Plane.js    # ground grid of quads, normal +y
    │       ├── Sphere.js   # UV mesh rings×segments
    │       ├── Pyramid.js  # 5 vertices, 5 faces
    │       ├── Group.js    # container for composite objects
    │       └── Character.js# example: Group → Cube (body) + Sphere (head)
    ├── render/
    │   ├── Projection.js   # world → camera → near-clip (Sutherland–Hodgman) → ndc → screen
    │   ├── Rasterizer.js   # scanline, 1/w interpolation, z-buffer, frustum culling, back-to-front sort, edge pass, lighting + texture sampling
    │   ├── GlyphMap.js     # glyphs by intensity (RAMP), base/edge/empty
    │   ├── Lighting.js     # point/directional light sources, Lambert + ambient, per-face light → {r,g,b}
    │   ├── Texture.js      # named ASCII texture registry, sample (bilinear+clamp), per-face-group UV generation
    │   └── FrameBuffer.js  # 2D arrays chars + depth (1/w) + ids (meshId) + per-cell r/g/b, clear/setCell/setCellColor/flush
    ├── ui/
    │   ├── HUD.js          # overlay: FPS, position, yaw/pitch (in degrees), scene, grid+faces, hints
    │   └── SceneMenu.js    # Tab scene menu + "Load from file…"
    └── utils/
        ├── Colors.js       # stub for lighting (Lambert + ambient)
        └── Debug.js        # console.log with tags, on/off
```

### Rendering pipeline

1. **FrameBuffer** — 2D arrays of glyphs, depth (`Float32Array`) and `meshId`
   (`Int32Array`, `-1` = empty); cleared every frame.
2. **Mesh gathering** — collect all meshes in the scene, frustum cull by world
   bounding-box (clipped against the 6 view-frustum planes), sort back-to-front
   by each mesh's nearest point to the camera (a cheap heuristic for the sparse
   ASCII z-buffer).
3. **Projection** — for each face: world vertices → camera → near-clip
   (Sutherland–Hodgman) → perspective divide (`1/w`) → screen with an ASCII-cell
   aspect correction (~1:2).
4. **Rasterizer** — scanline traversal, `1/w` interpolation (the only correct
   option for perspective); the z-buffer keeps the **maximum** `1/w` (closer =
   larger `1/w`), i.e. the nearer point wins; back-face culling by the
   camera-space normal; a separate edge pass (`@`) for readable shapes. Per face:
   world normal + centroid → `Lighting.computeFaceLight` (Lambert + ambient over
   `scene.lights`); glyph = `GlyphMap.byIntensity(luminance)` or, when textured,
   the texture glyph sampled at perspective-correct `u,v`; color = material ×
   light (per-cell).
5. **flush** — buffer rows are drawn to the canvas with `fillText` row by row,
   grouping runs by (glyph, color) pair (per-cell RGB from lighting/textures;
   falls back to the `Config.MESH_PALETTE` palette when no per-cell color is set).

### Inter-module contracts (stable interfaces)

- `Primitive` → `{ vertices: Vec3[], faces: {indices:[i0,i1,i2], normal}[] , computeNormals() }`
- `Rasterizer.render(scene, camera, frameBuffer, viewMatrix, projMatrix, aspect)`
- `Object3D.getWorldMatrix()` — the single source of transformations
- `SceneLoader.load(jsonData) → Scene`, `Scene.toJSON()` — round-trip

### How to extend

- **New primitive** — create `js/scene/primitives/X.js`, register it with one line
  in `registerPrimitiveTypes()` (`js/main.js`), add its name to the `expected` list
  and a `<script>` tag in `index.html`.
- **New built-in scene** — `scenes/x.js` calling
  `A3D.SceneRegistry.registerScene(name, data)` + a `<script>` tag in `index.html`.

### Lighting & textures (stage 7, implemented)

- **Lighting** — `js/render/Lighting.js`: point (omni, distance attenuation) and
  directional (parallel) light sources; flat-shading Lambert + ambient
  (`Config.AMBIENT`). The Rasterizer computes a per-face world normal + centroid,
  calls `Lighting.computeFaceLight`, and picks the glyph from `GlyphMap.RAMP` by
  luminance (or a texture glyph when textured); color = material × light
  (per-cell via `FrameBuffer.setCellColor`). Sources live in `scene.lights`
  (parsed by `SceneLoader`, serialized by `Scene.toJSON()` — round-trip safe).
- **Textures** — `js/render/Texture.js`: named ASCII texture registry
  (`brick`, `checker`, `window`, `grass`, `water`), `sample(tex, u, v)` with
  bilinear intensity + clamp, per-face-group UV generation
  (`generateFaceUVs`). Each face gets `faces[i].uv` (per-corner, parallel to
  `indices`); the Rasterizer interpolates `u/w`, `v/w`, `1/w` for
  perspective-correct sampling. Assign via `"texture": "name"` (all faces) or
  `"textures": { "front": "window", ... }` (per face group) in scene JSON.
- **Transparency** — not yet: a `transparent` flag + back-to-front sorting,
  glyph blending.
- **Quaternions / LOD / object picker (raycast)** — see `PLAN.md`, section 7.

## Tests

Tests are browser HTML pages (assert functions; the summary line goes to the
console and the page), not a test runner; each includes the scripts it needs:

- `test/test.html` — the math core (Vec3, Mat4);
- `test/scene_test.html` — scene, primitives, normals, registry, loader, round-trip;
- `test/render_test.html` — projection, near-clip, rasterization.

## Status

MVP is complete (stages 0–6 of `ROADMAP.md`): movement/look (mouse + keyboard),
4 built-in scenes, adding objects via hotkeys 1–5, scene save/load, per-mesh
colored rendering by palette, optimizations (back-face, frustum culling,
back-to-front sort), and fixes to the z-test and frustum culling of flat meshes.

Stage 7 is in progress: **lighting** (point + directional sources, Lambert +
ambient, per-cell color) and **textures** (named ASCII texture registry,
per-face-group UV, perspective-correct sampling) are implemented and integrated
into the built-in scenes (`city_block`, `desert`, `character_demo`). See
`FEATURES_PLAN.md` (stages A–C ✅) for details. Remaining: transparency,
quaternions, LOD, object picker.

## AI assistance

All AI-assisted work on this project was done exclusively with LLMs running
locally — no cloud APIs were used: **Qwen 3.8 27B** for the code and
**DeepSeek v4 Flash 0731** for planning.
