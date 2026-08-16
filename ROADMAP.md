# Поэтапный план реализации

Проект открывается из двойного клика по `index.html`. Каждый этап завершается
рабочим, проверяемым результатом.

---

## Этап 0 — Скаффолдинг ✅
**Цель:** каркас проекта, который открывается из двойного клика.

- [x] Создать структуру каталогов: `css/`, `scenes/`, `js/core/`, `js/scene/primitives/`,
  `js/render/`, `js/ui/`, `js/utils/`, `test/`.
- [x] `index.html` — canvas + `<script>`-теги (классические, без `type="module"`) в
  правильном порядке: `utils → core → scene → render → ui → scenes → main.js`.
- [x] `css/style.css` — `canvas{position:fixed;inset:0;width:100vw;height:100vh}`
  + `overflow:hidden`.
- [x] `Config.js` — константы (FOV 70°, near 0.1, far 500, speed 8, sensitivity 0.003,
  символы GlyphMap).
- [x] `utils/Debug.js` — логирование с тегами, вкл/выкл.
- [x] `main.js` — пустой `A3D`-namespace, проверка загрузки всех модулей.

**Приёмка:** открытие `index.html` из двойного клика, в консоли список загруженных
модулей без ошибок, canvas на весь экран. ✅ (проверено через локальный сервер:
консоль чиста, canvas растянут на всё окно)

---

## Этап 1 — Математическое ядро ✅
**Цель:** Vec3, Mat4, юнит-проверки.

- `core/Vec3.js` — `add/sub/scale/dot/cross/normalize/length/transform`.
- `core/MathUtils.js` — `clamp/lerp/degToRad`.
- `core/Mat4.js` (column-major, `Float32Array` 16) —
  `perspective(fovY,aspect,near,far)`, `lookAt`, `translation`, `rotationX/Y/Z`
  (порядок `Rz·Ry·Rx`), `scaling`, `multiply`, `invert`, `transformPoint`,
  `transformDirection`.
- `test/test.html` — assert-функции, проверки: ортогональность, инверсия
  `M·M⁻¹=I`, `perspective` крайних точек, поворот точки на 90°.

**Приёмка:** все assert зелёные в консоли `test.html`.

---

## Этап 2 — Камера + ввод ✅
**Цель:** свободное перемещение, координаты в HUD.

- [x] `core/Camera.js` — `position, yaw, pitch, fov, aspect, near, far`;
  `moveForward/back/left/right`, `moveUp/Down`, `rotate`, `lookAt`, `reset`;
  view-матрица по yaw/pitch; clamp pitch ±89°.
- [x] `core/Input.js` — WASD, Q/E, стрелки (альтернатива), мышь
  (Pointer Lock + re-request по клику), R (сброс камеры), H (HUD),
  1–9 (заглушка под добавление примитивов).
- [x] `ui/HUD.js` (заглушка) — FPS, позиция камеры, имя сцены, подсказки.
- [x] `main.js` — game loop (`requestAnimationFrame`, dt с clamp), resize,
  связка Input → Camera → HUD.

**Приёмка:** WASD/QE/стрелки двигают камеру, мышь — обзор (Pointer Lock),
HUD показывает координаты и FPS, pitch не переворачивается. ✅ (проверено
через локальный сервер: консоль чиста, WASD/QE/R/H работают, координаты
в HUD корректны, FPS стабильный)

---

## Этап 3 — FrameBuffer + адаптивный canvas ✅
**Цель:** вывод ascii-текста, размер сетки под окно.

- [x] `render/FrameBuffer.js` — 2D-массив `chars` + `depth` (1/w, `Infinity`),
  `clear()`, `setCell()` (z-buffer), `getChar/getDepth`, `flush(ctx)` построчно.
- [x] `render/GlyphMap.js` — символы по интенсивности (`byIntensity`), base/edge/empty.
- [x] `main.js` — resize: `canvas.width/height × devicePixelRatio`,
  `measureText('M')` → charW/charH, пересчёт размера буфера; тестовый паттерн
  (рамка + шахматная заливка + крест в центре).

**Приёмка:** на весь экран рисуется ascii-сетка (напр. рамка/заливка), при resize
перестраивается, на hiDPI чётко. ✅ (проверено через http://ascii3d.local.int/:
консоль чиста, сетка 214x72 @ dpr=1.5 → 72x30 @ 640x480 → 181x75 @ dpr=2,
z-buffer в setCell работает — ближний символ вытесняет дальний)

---

## Этап 4 — Сцена, примитивы, лоадер ✅
**Цель:** данные сцены и их загрузка.

- [x] `scene/Object3D.js` — transform, children, `worldMatrix` (lazy по dirty).
- [x] `scene/Scene.js` — список объектов, `update(dt)`, `toJSON()` (round-trip).
- [x] `scene/SceneRegistry.js` — единый реестр `types` + `scenes`.
- [x] `scene/SceneLoader.js` — рекурсивный парсер + обработка ошибок.
- [x] `primitives/`: `Mesh.js` (computeNormals CCW), `Cube`, `Plane`, `Sphere`
  (rings×segments), `Pyramid`, `Group`, `Character`.
- [x] `scenes/empty.js`, `scenes/city_block.js` — встроенные.

**Приёмка:** из консоли `SceneLoader.load(data)` строит сцену; `toJSON()→load()`
даёт эквивалент; битый JSON/неизвестный type не роняют приложение. ✅ (проверено
через http://ascii3d.local.int/test/scene_test.html: 48 assert зелёные — Object3D
world-matrix, наружные нормали всех примитивов, реестр, лоадер с обработкой ошибок,
round-trip toJSON→load; main.js грузит city_block через ?scene= без ошибок)

---

## Этап 5 — Рендеринг ✅
**Цель:** видимая ascii-3D сцена.

- [x] `render/Projection.js` — world→camera→near-clip (Sutherland–Hodgman)→ndc→screen
  + коррекция аспекта ячейки.
- [x] `render/Rasterizer.js` — scanline, интерполяция `1/w`, z-buffer, символ из
  GlyphMap; отдельный проход рёбер (`@`).
- [x] `main.js` — game loop: `dt` с clamp ≈0.1с, `requestAnimationFrame`.

**Приёмка:** земля + куб видны без искажений форм, корректная взаимная скрытость,
движение плавное. ✅ (проверено через http://ascii3d.local.int/?scene=city_block:
консоль чиста, здания/купол/земля видны с корректной окклюзией, 1209 граней,
60 FPS; test/render_test.html — 33 assert зелёные)

---

## Этап 6 — UI, полировка, документация ✅
**Цель:** завершённый MVP.

- [x] `ui/SceneMenu.js` — Tab-меню, список сцен, «Load from file…», URL `?scene=`.
- [x] `ui/HUD.js` — FPS, позиция, имя сцены, подсказки; горячие клавиши 1–5 (добавление объектов).
- [x] Оптимизации: back-face (CCW), frustum culling (bounding-box + центр, точное
  совпадение с отображением `projectFace`), `min(dt,maxDt)`.
- [x] `Scene.toJSON()` + «Save scene» (Blob download, клавиша S) + round-trip проверка.
- [x] Защита от автоповтора: одноразовые хоткеи (S, 1–5, Tab) срабатывают только на
  первое нажатие (`!e.repeat` + латч по состоянию клавиши в `Input.js`).
- [x] `scenes/desert.js`, `scenes/character_demo.js`.
- [x] `README.md` — управление, архитектура; заготовки `utils/Colors.js` (освещение).

**Приёмка:** полный сценарий — открыть, переключать сцены, двигаться, добавить
объект, сохранить/загрузить сцену. ✅ (проверено через http://ascii3d.local.int/:
консоль чиста; Tab-меню перечисляет 4 сцены и «Load from file…», стрелки+Enter
переключают сцену без перезагрузки; клавиши 1–5 добавляют cube/sphere/pyramid/
plane/character (faces растёт); S скачивает валидный JSON, который round-trip'ом
`SceneLoader.load` восстанавливает ту же сцену (8 объектов / 1221 faces);
desert и character_demo рендерятся; существующие тесты не сломаны:
test.html 34, scene_test.html 48, render_test.html 33 — все зелёные)

---

## Этап 7 — Освещение, прозрачность, расширения ⏳
**Цель:** визуальные фичи поверх готового MVP (см. `PLAN.md`, раздел 7).
Детальный пофайловый план — в `FEATURES_PLAN.md` (этапы A–D).

- **Подготовка рендера (Этап A из FEATURES_PLAN) ✅** — per-cell цвет в FrameBuffer
  (`r/g/b`, `setCellColor`, `flush` по (глиф,цвет)); UV в проекции (`CVertex.u/v`,
  `clipNear`/`lerpVerts` интерполируют, `projectFace(verts, uvs, ...)`);
  `Rasterizer.fillPoly` считает градиенты `u/w`,`v/w`. Без визуальных изменений —
  инфраструктура под свет и текстуры. Проверено: render_test.html 78 assert ✓.
- **Освещение** — подключить `utils/Colors.js` к рендеру: Rasterizer выбирает символ
  полигона из `GlyphMap.RAMP` по интенсивности грани (`normal · lightDir` + ambient)
  вместо константного `#`. Направленный свет; точки/омни — опционально.
- **Прозрачность** — флаг `transparent` у объекта, сортировка back-to-front, правило
  смешивания символов (передний непрозрачнее → его символ).
- **Текстуры** — UV-координаты вершин, интерполяция UV → выбор символа из 2D-текстуры.
- **Кватернионы** (опц.) — замена Euler в `Object3D` для сложных вращений.
- **LOD** (опц.) — снижение сегментов сферы/цилиндра с расстоянием.
- **Пикер объектов** (опц.) — raycast по линиям/треугольникам.

**Приёмка:** свет создаёт градиент символов на гранях (видны освещённые и теневые
стороны); прозрачные объекты корректно перекрываются; текстура отображается на грани.

---

## Зависимости и параллелизм

- Этапы 0→1→2→3→4→5→6 — основная последовательность (MVP завершён).
- Этап 7 опирается на Этап 5 (рендер) + `utils/Colors.js` (заготовка из Этапа 6);
  подфичи (свет / прозрачность / текстуры) независимы и можно вести параллельно.
- Этап 4 частично можно вести параллельно с Этапом 3 (не зависят друг от друга,
  но оба зависят от Этапа 1).
- Этап 5 (рендеринг) — ядро: сосредоточить на нём основное тестирование.

## Статус

| Этап | Статус |
|---|---|
| 0 — Скаффолдинг | ✅ выполнено |
| 1 — Математическое ядро | ✅ выполнено |
| 2 — Камера + ввод | ✅ выполнено |
| 3 — FrameBuffer + адаптивный canvas | ✅ выполнено |
| 4 — Сцена, примитивы, лоадер | ✅ выполнено |
| 5 — Рендеринг | ✅ выполнено |
| 6 — UI, полировка, документация | ✅ выполнено (MVP) |
| 7 — Освещение, прозрачность, расширения | ⏳ следующий |
