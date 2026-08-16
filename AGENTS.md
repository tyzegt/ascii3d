# AGENTS.md

Zero-dependency ASCII 3D engine: plain HTML + ES5 JavaScript rendered to a `<canvas>` as ASCII glyphs. No build, no package.json, no CI. Docs (`README.md`, `PLAN.md`, `ROADMAP.md`) are in Russian.

## Run & verify

- App: run it via IIS — the working directory is mapped as a site with caching disabled at `http://ascii3d.local.int/` (see `web.config`). Do NOT use `file://` or ad-hoc static servers; always verify through that URL.
- Tests are browser HTML pages, not a test runner — open each and check the summary line in-page/console:
  - `test/test.html` — Vec3/Mat4 core math
  - `test/scene_test.html` — scene graph, primitives, registry, loader round-trip
  - `test/render_test.html` — projection, near-clip, rasterization
- There is no lint/typecheck/codegen.

## Module & load-order rules (easy to break)

- No ES modules: every file is an IIFE that attaches to `window.A3D.modules` (registry on `A3D.SceneRegistry`).
- Script order in `index.html` is load-bearing: `utils → core → scene → render → ui → scenes → main`. New scripts go into `index.html` in the right position.
- `js/main.js:26` has an `expected` module list — add any new module name there or boot aborts with "missing modules".
- The test pages load their own script lists via `document.write` (`test/*_test.html`) — extend those lists when a test should cover a new module.

## Extension points

- New primitive: create `js/scene/primitives/X.js`, register one line in `registerPrimitiveTypes()` at `js/main.js:100`, add to the `expected` list and to `index.html`.
- New built-in scene: `scenes/x.js` calling `A3D.SceneRegistry.registerScene(name, data)`, plus a `<script>` tag in `index.html`. Scenes are JSON-like (`name`, `camera {position,yaw,pitch}`, recursive `objects[]` with `type` + `position/rotation/scale` + `children`).

## Gotchas

- `Object3D` matrices are lazy: mutate transforms only via `setTransform()` (or call `markDirty()`); don't assign `position`/`rotation`/`scale` directly.
- Rasterizer depth is `1/w` (perspective-correct interpolation is the only correct option here); screen projection compensates for the ~1:2 ASCII cell aspect — keep that correction when touching `Projection.js`.
- Tunables (FOV, near/far, speed, sensitivity) live in `js/core/Config.js`, not in code.
