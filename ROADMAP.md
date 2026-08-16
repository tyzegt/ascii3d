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

## Этап 2 — Камера + ввод
**Цель:** свободное перемещение, координаты в HUD.

- `core/Camera.js` — `position, yaw, pitch, fov, aspect, near, far`;
  `moveForward/back/left/right`, `rotate`, `lookAt`; view-матрица по yaw/pitch;
  clamp pitch ±89°.
- `core/Input.js` — WASD, Q/E, стрелки, мышь (Pointer Lock + re-request),
  R/H/Tab/1–9.
- `ui/HUD.js` (заглушка) — вывод позиции камеры.

**Приёмка:** WASD/мышь двигают камеру, HUD показывает координаты, pitch не
переворачивается.

---

## Этап 3 — FrameBuffer + адаптивный canvas
**Цель:** вывод ascii-текста, размер сетки под окно.

- `render/FrameBuffer.js` — 2D-массив `chars` + `depth` (1/w, `Infinity`),
  `clear()`, `setCell()`, `flush(ctx)` построчно.
- `render/GlyphMap.js` — символы по интенсивности.
- `main.js` — resize: `canvas.width/height × devicePixelRatio`,
  `measureText('M')` → charW/charH, пересчёт размера буфера.

**Приёмка:** на весь экран рисуется ascii-сетка (напр. рамка/заливка), при resize
перестраивается, на hiDPI чётко.

---

## Этап 4 — Сцена, примитивы, лоадер
**Цель:** данные сцены и их загрузка.

- `scene/Object3D.js` — transform, children, `worldMatrix` (lazy по dirty).
- `scene/Scene.js` — список объектов, `update(dt)`, `toJSON()` (round-trip).
- `scene/SceneRegistry.js` — единый реестр `types` + `scenes`.
- `scene/SceneLoader.js` — рекурсивный парсер + обработка ошибок.
- `primitives/`: `Mesh.js` (computeNormals CCW), `Cube`, `Plane`, `Sphere`
  (rings×segments), `Pyramid`, `Group`, `Character`.
- `scenes/empty.js`, `scenes/city_block.js` — встроенные.

**Приёмка:** из консоли `SceneLoader.load(data)` строит сцену; `toJSON()→load()`
даёт эквивалент; битый JSON/неизвестный type не роняют приложение.

---

## Этап 5 — Рендеринг
**Цель:** видимая ascii-3D сцена.

- `render/Projection.js` — world→camera→near-clip (Sutherland–Hodgman)→ndc→screen
  + коррекция аспекта ячейки.
- `render/Rasterizer.js` — scanline, интерполяция `1/w`, z-buffer, символ из
  GlyphMap; отдельный проход рёбер (`@`).
- `main.js` — game loop: `dt` с clamp ≈0.1с, `requestAnimationFrame`.

**Приёмка:** земля + куб видны без искажений форм, корректная взаимная скрытость,
движение плавное.

---

## Этап 6 — UI, полировка, документация
**Цель:** завершённый MVP.

- `ui/SceneMenu.js` — Tab-меню, список сцен, «Load from file…», URL `?scene=`.
- `ui/HUD.js` — FPS, позиция, имя сцены, подсказки; горячие клавиши 1–9.
- Оптимизации: back-face (CCW), frustum, `min(dt,maxDt)`.
- `Scene.toJSON()` + «Save scene» (Blob download) + round-trip проверка.
- `scenes/desert.js`, `scenes/character_demo.js`.
- `README.md` — управление, архитектура; заготовки `utils/Colors.js` (освещение).

**Приёмка:** полный сценарий — открыть, переключать сцены, двигаться, добавить
объект, сохранить/загрузить сцену.

---

## Зависимости и параллелизм

- Этапы 0→1→2→3→4→5→6 — основная последовательность.
- Этап 4 частично можно вести параллельно с Этапом 3 (не зависят друг от друга,
  но оба зависят от Этапа 1).
- Этап 5 (рендеринг) — ядро: сосредоточить на нём основное тестирование.

## Статус

| Этап | Статус |
|---|---|
| 0 — Скаффолдинг | ✅ выполнено |
| 1 — Математическое ядро | ⏳ следующий |
| 2 — Камера + ввод | ⬜ |
| 3 — FrameBuffer + адаптивный canvas | ⬜ |
| 4 — Сцена, примитивы, лоадер | ⬜ |
| 5 — Рендеринг | ⬜ |
| 6 — UI, полировка, документация | ⬜ |
