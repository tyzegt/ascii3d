# ASCII 3D

3D-движок на чистом HTML + JavaScript. Вся графика — ASCII-символы, отрисованные
на `<canvas>`. Никаких зависимостей, веб-глиз или билдов: открывается как обычный
`index.html` (двойной клик) или через любой статический сервер. Адаптивен под
размер окна и hiDPI (`devicePixelRatio`).

Каждый символ в терминальной сетке — «пиксель». Разрешение = размер canvas,
делённый на ширину/высоту ascii-ячейки (замер через `ctx.measureText`).

## Запуск

Просто откройте `index.html` в браузере. Для загрузки внешних JSON-сцен через
URL (необязательно) поднимите любой статический сервер:

```
python -m http.server
# или
npx serve
```

Встроенные сцены и загрузка из файла (`<input type="file">`) работают и на
`file://`.

## Управление

| Клавиша | Действие |
|---|---|
| `W A S D` | движение вперёд/влево/назад/вправо (strafe) |
| `Q` / `E` | вниз / вверх |
| Стрелки | альтернатива: ↑/↓ — вперёд/назад, ←/→ — поворот (yaw) |
| `Z` / `X` | наклон камеры вверх / вниз (pitch), обзор без мыши |
| Мышь (клик по canvas) | обзор через Pointer Lock; повторный клик после ESC возвращает lock |
| `1`–`5` | добавить объект перед камерой: 1 куб, 2 сфера, 3 пирамида, 4 плоскость, 5 персонаж |
| `Tab` | меню сцен (↑/↓ — выбор, Enter — загрузить, Esc — закрыть) |
| `R` | сброс камеры |
| `H` | показать/скрыть HUD |
| `S` | сохранить текущую сцену в JSON-файл (Blob download) |

Скорость, чувствительность, FOV, near/far — константы в `js/core/Config.js`
(дефолты: FOV 70°, near 0.1, far 500, speed 8, sensitivity 0.003).

## Сцены

Встроенные сцены регистрируются в реестре (`scenes/*.js`) и доступны из меню (Tab)
или по URL-параметру `?scene=<имя>`:

- `empty` — пустая сцена;
- `city_block` — городок: здания, купол, пирамида, персонаж, сфера;
- `desert` — пустыня: пирамиды, камни, бегун, оазис;
- `character_demo` — три персонажа разного масштаба + декор.

Загрузка внешней сцены: меню (Tab) → «Load from file…» → выбрать `.json`.
Сохранение: клавиша `S` скачивает текущую сцену как `<имя>.json`
(`Scene.toJSON()` round-trip совместима с `SceneLoader.load`).

Формат сцены — JSON: `name`, `camera {position, yaw, pitch}`, `objects[]`
(рекурсивно, `type` + `position/rotation/scale` + `children`). Пример —
`scenes/city_block.js`.

## Архитектура

Все модули вешают себя на глобальный namespace `window.A3D.modules` (классические
`<script>` без ES-модулей — надёжно работает из двойного клика по `index.html`).
Порядок подключения: `utils → core → scene → render → ui → scenes → main`.

```
ascii3d/
├── index.html          # точка входа, canvas, подключение скриптов
├── css/style.css       # полноэкранный canvas, monospace, overflow:hidden
├── scenes/             # встроенные сцены (регистрируют себя в реестре)
│   ├── empty.js
│   ├── city_block.js
│   ├── desert.js
│   └── character_demo.js
└── js/
    ├── main.js         # инициализация, game loop, связка модулей
    ├── core/
    │   ├── Vec3.js     # вектор: add/sub/scale/dot/cross/normalize/length/transform
    │   ├── Mat4.js     # 4x4 (column-major): perspective, lookAt, translate, rotate, scale, multiply, invert
    │   ├── Camera.js   # position/yaw/pitch/fov; move*, rotate, lookAt, getViewMatrix
    │   ├── Input.js    # клавиатура + мышь (Pointer Lock), onKeydown-хендлеры
    │   ├── MathUtils.js# clamp, lerp, degToRad
    │   └── Config.js   # константы: FOV, near/far, speed, sensitivity, GlyphMap
    ├── scene/
    │   ├── Scene.js        # список объектов, update(dt), toJSON (round-trip)
    │   ├── Object3D.js     # position/rotation/scale, children, worldMatrix (lazy по dirty)
    │   ├── SceneLoader.js  # JSON → объекты через реестр типов; обработка ошибок
    │   ├── SceneRegistry.js# реестр типов примитивов + готовых сцен
    │   └── primitives/
    │       ├── Mesh.js     # vertices/faces, computeNormals (CCW), getEdges
    │       ├── Cube.js     # 8 вершин, 12 треугольников
    │       ├── Plane.js    # сетка quad'ов-земли, нормаль +y
    │       ├── Sphere.js   # UV-сетка rings×segments
    │       ├── Pyramid.js  # 5 вершин, 5 граней
    │       ├── Group.js    # контейнер для составных объектов
    │       └── Character.js# пример: Group → Cube (тело) + Sphere (голова)
    ├── render/
    │   ├── Projection.js   # world → camera → near-clip (Sutherland–Hodgman) → ndc → screen
    │   ├── Rasterizer.js   # scanline, интерполяция 1/w, z-buffer, frustum culling, проход рёбер
    │   ├── GlyphMap.js     # символы по интенсивности (RAMP), base/edge/empty
    │   └── FrameBuffer.js  # 2D-массив chars + depth (1/w), clear/setCell/flush
    ├── ui/
    │   ├── HUD.js          # оверлей: FPS, позиция, сцена, grid, подсказки
    │   └── SceneMenu.js    # Tab-меню сцен + «Load from file…»
    └── utils/
        ├── Colors.js       # заготовка под освещение (Ламберт + ambient)
        └── Debug.js        # console.log с тегами, вкл/выкл
```

### Конвейер рендеринга

1. **FrameBuffer** — 2D-массив символов + глубина (`Float32Array`, `Infinity` = пусто),
   очистка каждый кадр.
2. **Projection** — для каждой грани: мировые вершины → камера → near-clip
   (Sutherland–Hodgman) → перспективное деление (`1/w`) → экран с коррекцией
   аспекта ascii-ячейки (~1:2).
3. **Rasterizer** — обход по сканлайнам, интерполяция `1/w` (единственный
   корректный вариант для перспективы), z-buffer; back-face culling по нормали в
   camera-space; frustum culling по bounding-sphere меша; отдельный проход рёбер
   (`@`) для читаемости форм.
4. **flush** — строки из буфера выводятся на canvas `fillText` построчно (меньше
   вызовов).

### Контракты между модулями (стабильные интерфейсы)

- `Primitive` → `{ vertices: Vec3[], faces: {indices:[i0,i1,i2], normal}[] , computeNormals() }`
- `Renderer.render(scene, camera, frameBuffer, viewMatrix, projMatrix, aspect)`
- `Object3D.getWorldMatrix()` — единый источник трансформаций
- `SceneLoader.load(jsonData) → Scene`, `Scene.toJSON()` — round-trip

### Расширяемость (заготовки под будущие фичи)

- **Освещение** — `utils/Colors.js`: Ламберт + ambient; в будущем Rasterizer будет
  выбирать символ из `GlyphMap.RAMP` по интенсивности грани.
- **Прозрачность** — флаг `transparent` + сортировка back-to-front, смешивание символов.
- **Текстуры** — UV-координаты вершин → выбор символа из 2D-текстуры.
- **Кватернионы / LOD / пикер объектов (raycast)** — см. `PLAN.md`, раздел 7.

## Тесты

Юнит-проверки в `test/` (assert-функции, результат — в консоли и на странице):

- `test/test.html` — математическое ядро (Vec3, Mat4);
- `test/scene_test.html` — сцена, примитивы, нормали, реестр, лоадер, round-trip;
- `test/render_test.html` — проекция, near-clip, растеризация.

## Статус

MVP завершён (этапы 0–6 из `ROADMAP.md`): движение, обзор, несколько сцен,
добавление объектов, сохранение/загрузка сцены, оптимизации (back-face, frustum).
