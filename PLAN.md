# План: ASCII 3D-движок

3D-движок на чистом HTML + JS. Вся графика — ASCII-символы на `<canvas>`.
Открывается как обычный `index.html` без сервера. Адаптивный под размер окна.
Перемещение в 3D, обзор вверх/вниз, добавление объектов из примитивов,
составные объекты, загрузка разных сцен. Модульная и расширяемая архитектура.

> **Статус (актуально):** MVP завершён — этапы 0–6 из `ROADMAP.md` ✅
> (движение/обзор, 4 встроенные сцены, добавление объектов хоткеями 1–5,
> сохранение/загрузка сцены, frustum culling, документация). Следующий —
> **этап 7**: освещение, прозрачность, текстуры и прочие расширения (раздел 7 ниже).

---

## 1. Архитектура и структура файлов

```
ascii3d/
├── index.html          # точка входа, canvas, подключение скриптов
├── css/
│   └── style.css       # полноэкранный canvas, monospace шрифт, отключить скролл
├── scenes/             # встроенные сцены (JS, регистрируют себя в реестре)
│   ├── city_block.js
│   ├── desert.js
│   ├── character_demo.js
│   └── empty.js
└── js/
    ├── main.js         # инициализация, game loop, связка модулей
    ├── core/
    │   ├── Vec3.js     # вектор: add, sub, scale, normalize, dot, cross, length
    │   ├── Mat4.js     # матрица 4x4: perspective, lookAt, translate, rotate, scale, multiply, invert, transformPoint
    │   ├── Camera.js   # позиция, yaw, pitch, FOV, near/far; moveForward/Back/Left/Right, rotate, getViewMatrix
    │   ├── Input.js    # клавиатура (WASD, стрелки, Q/E — вверх/вниз, мышь через Pointer Lock)
    │   ├── Renderer.js # оркестратор: scene → проекция → растеризация → canvas
    │   ├── MathUtils.js# clamp, lerp, degToRad
    │   └── Config.js   # константы: FOV, near/far, скорость, чувствительность, символы GlyphMap
    ├── scene/
    │   ├── Scene.js        # список объектов, add/remove, update(dt), loadFromData, toJSON
    │   ├── Object3D.js     # базовый: position, rotation, scale, children, worldMatrix
    │   ├── Group.js        # составной объект (контейнер для children)
    │   ├── SceneLoader.js  # parse JSON-данных → объекты (через реестр типов)
    │   ├── SceneRegistry.js# реестр типов примитивов + реестр готовых сцен
    │   └── primitives/
    │       ├── Mesh.js       # базовый меш: vertices (Vec3[]), faces, computeNormals
    │       ├── Cube.js       # параллелепипед
    │       ├── Sphere.js     # сфера (UV-сетка: segments x rings)
    │       ├── Pyramid.js    # пирамида
    │       ├── Plane.js      # плоскость-земля (сетка quad'ов)
    │       ├── Cylinder.js   # цилиндр (на будущее)
    │       └── Character.js  # пример составного: Cube (тело) + Sphere (голова)
    ├── render/
    │   ├── Projection.js   # world → camera → near-clip → ndc → screen (с учётом aspect ячейки)
    │   ├── Rasterizer.js   # рисует треугольники/линии в ascii-буфер с z-buffer (1/w)
    │   ├── GlyphMap.js     # карта символов: уровни яркости/заполнения
    │   └── FrameBuffer.js  # 2D-массив символов + глубина (1/w), очистка, flush на canvas
    ├── ui/
    │   ├── HUD.js          # оверлей: FPS, координаты камеры, подсказки, имя сцены
    │   └── SceneMenu.js    # UI выбора/загрузки сцены
    └── utils/
        ├── Colors.js       # (заготовка под освещение) интенсивность на грани
        └── Debug.js        # console.log с тегами, отладочные вкл/выкл
```

**Подключение без сервера:** классические `<script src="js/core/Vec3.js"></script>` …
Каждый модуль вешает себя на глобальный namespace `window.A3D = {}`
(например `A3D.Vec3 = ...`). ES-модули (`type="module"`) через `file://`
имеют ограничения CORS, поэтому классические скрипты с namespace — надёжный вариант.

---

## 2. Ядро математики

- **Vec3**: компоненты `x, y, z`; операции `add/sub/scale/dot/cross/normalize/length`,
  `transform(mat4)`.
- **Mat4** (column-major, 16 чисел в `Float32Array`):
  - `perspective(fovY, aspect, near, far)`
  - `lookAt(eye, target, up)` или view из позиции + yaw/pitch камеры
  - `translation`, `rotationX/Y/Z`, `scaling`, `multiply(a, b)`, `invert`
  - `transformPoint`, `transformDirection`
- **Camera**: `position`, `yaw`, `pitch`, `fov`, `aspect`, `near`, `far`.
  Методы: `moveForward/back/left/right(strafe, dt)`, `rotate(dx, dy)` от мыши,
  `lookAt(target)`. View-матрица = `invert(world)` или напрямую по yaw/pitch.

---

## 3. Сцена и объекты

- **Object3D** — базовый класс: `position: Vec3`, `rotation: {x,y,z}` (Euler,
  порядок применения `Rz·Ry·Rx`, column-vector; кватернионы — позже),
  `scale: Vec3`, `children: Object3D[]`, `worldMatrix` (пересчёт:
  `parent.world * local`, lazy по dirty-флагу при изменении transform).
- **Group** — Object3D без собственной геометрии, только контейнер.
  Позволяет собирать составные объекты (человек = Group → Cube тело + Sphere голова).
- **Примитивы** генерируют `vertices: Vec3[]` и `faces: [{a,b,c, normal}]`
  (нормаль грани — для будущего освещения):
  - **Cube**: 8 вершин, 12 треугольников (6 граней × 2 триангла).
  - **Sphere**: `rings × segments`, вершины на сфере, треугольные грани;
    полюса сходятся в одну точку (допустимо для ascii-разрешения).
  - **Pyramid**: 5 вершин (4 основания + вершина), 4 боковых + 1 нижняя.
  - **Plane** (земля): сетка `N×N` quad'ов (каждый = 2 треугольника), нормаль вверх.
  - **Cylinder**: для будущих объектов.
  - **Character** (пример): `Group` с `Cube` (корпус) + `Sphere` (голова),
    смещённые по Y — демонстрирует составность.

---

## 4. Рендеринг (критично — это ascii, не пиксели)

Подход: **каждый символ в терминальной сетке = "пиксель"**.
Разрешение = `canvas.width / charWidth × canvas.height / charHeight`
(символ в monospace ~1:2 по соотношению, поэтому по вертикали вдвое меньше ячеек).

1. **FrameBuffer**: 2D-массив `chars[w×h]` + `depth[w×h]` (`Float32Array`,
   `Infinity` = пусто). Очистка каждый кадр.
2. **Projection**: для каждого объекта → каждая грань (треугольник):
   - Мировые вершины: `worldMatrix × vertex`
   - Камера-координаты: `viewMatrix × worldPos`
   - Near-clip: грань, пересекающая near plane, разрезается
     (Sutherland–Hodgman); если все вершины за near — пропускаем.
   - Clip: `projMatrix × camPos` → `ndc = (x/y/z) / w` → экран:
     `sx = (ndc.x+1)/2 * width`, `sy = (1-ndc.y)/2 * height`.
   - Коррекция аспекта: ascii-ячейка выше, чем шире (~1:2), поэтому к `sy`
     применяем компенсацию (умножение на отношение ширина/высота ячейки),
     иначе формы (сферы, кубы) визуально искажаются.
3. **Rasterizer** (ascii-вариант):
   - Для каждого треугольника в экранных координатах — обход по сканлайнам.
   - Для каждой ascii-ячейки, попавшей в треугольник: интерполированная
     глубина = `1/w` (единственный корректный вариант для перспективы;
     линейная интерполяция camera-z даёт искажения).
   - **Z-buffer**: если глубина меньше сохранённой → пишем символ + глубину.
   - Символ из **GlyphMap** по «интенсивности» (пока константный `#` для
     полигонов, `@` для рёбер; в будущем по освещению). Глубина на выбор
     символа не влияет.
4. **Outline/линии** (опционально, чтобы формы читались): рендерим рёбра
   (линии между вершинами) отдельным проходом, более ярким символом.

**Производительность:** JS-циклы по ячейкам — узкое место. Оптимизации:
- Back-face culling: нормаль грани в camera-space, winding — CCW (наружу);
  `normal · viewDir > 0` → не рисуем. Нормали берутся из `computeNormals()`.
- Frustum culling по граням.
- Ограничение количества объектов/граней (для ascii достаточно).
- `requestAnimationFrame`, дельта-время.
- Отрисовка на canvas: собрать строки и `fillText` построчно (меньше вызовов).

---

## 5. Управление

- **WASD** — вперёд/назад/влево/вправо (strafe в плоскости камеры).
- **Q/E** — вверх/вниз (Space/Shift — зарезервированы как альтернатива).
- **Мышь** (Pointer Lock API) — yaw/pitch. Клик по canvas → `requestPointerLock`;
  после выхода из lock (ESC) повторный клик возвращает lock.
  Pitch ограничен ±~89° (без переворота камеры).
- **Стрелки** — альтернатива повороту (если нет мыши).
- **1–9** — добавить примитив в текущей позиции (демонстрация).
- **R** — сброс камеры. **H** — HUD. **Tab** — меню сцен.
- Скорость/чувствительность, FOV, near/far — константы в `Config.js`
  (дефолты: FOV 70°, near 0.1, far 500, speed 8, sensitivity 0.003).
- Движение со скоростью × `min(dt, maxDt)` (clamp dt ≈ 0.1 с), чтобы избежать
  рывков после замирания вкладки.

---

## 6. Адаптивный canvas

- `<canvas>` на весь окно: `position:fixed; inset:0; width:100vw; height:100vh`.
- `resize`-обработчик: `canvas.width = innerWidth * devicePixelRatio`,
  `canvas.height = innerHeight * devicePixelRatio` (резкость на hiDPI),
  пересчёт `aspect`, `charW/charH` (замер через `ctx.measureText('M')`),
  размер FrameBuffer.
- Monospace-шрифт, `ctx.font = '10px monospace'`, `overflow:hidden`.
- Отрисовка: заполнить фон, затем `fillText` построчно — собираем строки из
  FrameBuffer (построчно быстрее, чем по ячейкам).

---

## 7. Модульность и расширяемость (под будущие фичи)

- **Прозрачность**: в `GlyphMap` — символы с «прозрачностью» (пробел, `·`, `:`).
  Правило смешивания: выводится символ переднего объекта, если его непрозрачность
  выше; иначе — символ заднего. У объекта флаг `transparent` + сортировка
  back-to-front. (Позже.)
- **Освещение**: `Colors.js` — норма́ль грани × направление света → интенсивность
  → выбор символа из GlyphMap (от `.` до `@`). Точки/направленный/омни —
  переключение в новом `Lighting.js`.
- **Текстуры**: UV-координаты вершин, интерполяция UV → выбор символа
  из текстуры (2D-массив символов).
- **Кватернионы**: замена Euler в `Object3D` для сложных вращений.
- **LOD**: снижение сегментов сферы/цилиндра с расстоянием.
- **Пикер объектов**: raycast по линиям/треугольникам.

**Контракты между модулями (стабильные интерфейсы):**
- `Primitive` → `{ vertices: Vec3[], faces: Face[], computeNormals() }`
- `Face` → `{ indices: [i0,i1,i2], normal: Vec3, material?: {color?, opacity?, texture?} }`
- `Renderer.render(scene, camera, frameBuffer)` — единая точка.
- `Object3D.getWorldMatrix()` — единый источник трансформаций.

---

## 8. Хранение и загрузка сцен

### Формат сцены — JSON

Сцена — это данные: список объектов с типом, трансформацией и параметрами.

```json
{
  "name": "city_block",
  "camera": { "position": [0, 5, 20], "yaw": 0, "pitch": -0.2 },
  "objects": [
    {
      "type": "group",
      "name": "building_1",
      "position": [0, 0, 0],
      "rotation": [0, 0, 0],
      "scale": [1, 1, 1],
      "children": [
        { "type": "cube",   "position": [0, 3, 0], "scale": [4, 6, 4] },
        { "type": "sphere", "position": [0, 7, 0], "scale": [1, 1, 1] }
      ]
    },
    { "type": "pyramid",   "position": [10, 0, -5], "scale": [2, 3, 2] },
    { "type": "character", "position": [-6, 0, 3] }
  ]
}
```

### SceneLoader (`js/scene/SceneLoader.js`)

Рекурсивный парсер: берёт JSON-объект, по `type` создаёт нужный класс из
**реестра типов**, применяет `position/rotation/scale`, рекурсивно
обрабатывает `children`.

```
SceneLoader.load(jsonData) → Scene
  - создаёт Scene
  - для каждого объекта: createObject(obj)
  - createObject: lookup type в registry → new Cube()/Sphere()/Group()...
    → set transform → рекурсия по children → scene.add(root)
  - применяет camera из JSON
  - Ошибки: неизвестный `type`, битый JSON, циклические `children`,
    некорректная трансформация — логировать в `Debug` и пропускать объект
    (или откатывать сцену), не роняя приложение.
```

**Реестр** — единый `A3D.SceneRegistry` с двумя независимыми разделами:
`types` (фабрики примитивов) и `scenes` (готовые сцены). Новый примитив =
новая запись, лоадер не трогаем:

```js
A3D.SceneRegistry = {
  types: {}, scenes: {},
  register(typeName, factory)  { this.types[typeName] = factory; },
  create(typeName, params)     { return this.types[typeName](params); },
  registerScene(name, data)    { this.scenes[name] = data; },
  getScene(name)               { return this.scenes[name]; },
  listScenes()                 { return Object.keys(this.scenes); }
};
// регистрация при загрузке скриптов:
A3D.SceneRegistry.register('cube',      (p) => new A3D.Cube(p));
A3D.SceneRegistry.register('sphere',    (p) => new A3D.Sphere(p));
A3D.SceneRegistry.register('pyramid',   (p) => new A3D.Pyramid(p));
A3D.SceneRegistry.register('group',     (p) => new A3D.Group(p));
A3D.SceneRegistry.register('character', (p) => A3D.Character.build());
```

### Проблема file:// и fetch

`fetch('scenes/x.json')` через `file://` не работает в Chrome (CORS).
Три варианта, реализуем все:

1. **Встроенные сцены (основной, надёжный)**: каждая сцена — JS-файл,
   регистрирующий себя в реестре:
   ```js
   // scenes/city_block.js
   A3D.SceneRegistry.registerScene('city_block', { /* JSON-данные */ });
   ```
   Подключаются `<script src="scenes/city_block.js">` — работает из двойного
   клика по `index.html`.
2. **JSON-файлы (если есть локальный сервер)**: `SceneLoader.loadFromURL(url)`
   через `fetch` — при `python -m http.server` / `npx serve`.
3. **Загрузка из файла через `<input type="file">`**: пользователь выбирает
   `.json` → `FileReader` → `JSON.parse` → `SceneLoader.load`. Работает на
   `file://` без сервера, позволяет загрузить любую внешнюю сцену.

### SceneRegistry (готовые сцены)

Единый реестр из раздела «Реестр» выше хранит готовые сцены в поле `scenes`
(name → JSON-данные). Доступ: `getScene(name)`, `listScenes()`.

### SceneMenu (UI выбора сцены)

- По **Tab** (или кнопке) — оверлей-меню со списком сцен (`listScenes()`).
- Стрелки вверх/вниз — выбор, **Enter** — загрузить.
- Пункт **«Load from file…»** → file-picker.
- После выбора: `SceneLoader.load(data)` → `renderer.setScene(newScene)` →
  камера из JSON. HUD показывает имя текущей сцены.

### Scene: сериализация назад (toJSON)

`Scene.toJSON()` генерирует JSON той же структуры: каждый примитив сериализует
свои параметры (тип, transform, сегменты сферы и т.п.) так, чтобы
`SceneLoader.load(toJSON())` давал эквивалентную сцену (round-trip).
В будущем: кнопка **«Save scene»** → `Blob` + `download` (работает на file://).
Пока — заготовка.

### Обновление main.js

- При старте: загрузить первую сцену (URL-параметр `?scene=city_block` или дефолт).
- Обработчик Tab → SceneMenu.
- Обработчик выбора сцены → смена `scene` в рендерере без перезагрузки страницы.

---

## 9. Порядок реализации

MVP (пункты 1–14) завершён — см. статус в `ROADMAP.md` (этапы 0–6 ✅).

1. ✅ **Скаффолдинг**: `index.html`, `style.css`, пустые скрипты, namespace `A3D`, `Config.js`.
2. ✅ **Vec3 + Mat4** + проверки в `test/test.html` (простые assert-функции).
3. ✅ **Camera + Input** — управление (проверить без графики: координаты в HUD).
4. ✅ **FrameBuffer + адаптивный canvas** — вывод текста (построчно, DPR).
5. ✅ **Scene + SceneRegistry (типы) + SceneLoader** + встроенные сцены
   (`empty`, `city_block`).
6. ✅ **Projection (near-clip, коррекция aspect) + FrameBuffer** — проецировать
   точки, рисовать крестик.
7. ✅ **Примитивы** (Cube, Plane) + **Rasterizer** (1/w, z-buffer) — первая
   видимая сцена (земля + куб).
8. ✅ **Sphere, Pyramid** + составной **Character**.
9. ✅ **SceneMenu** + file-picker + URL-параметр `?scene=`.
10. ✅ **HUD** (FPS, позиция, подсказки) + горячие клавиши добавления объектов (1–5).
11. ✅ **Оптимизации** (back-face, frustum culling по bounding-box) + полировка + clamp dt.
12. ✅ **Scene.toJSON()** + «Save scene» (Blob download, клавиша S) + round-trip проверка.
13. ✅ **Сцены** `desert`, `character_demo` — заполнены.
14. ✅ **Документация** (`README.md`: управление, архитектура) + заготовки
    под освещение/прозрачность (`utils/Colors.js`).

Дальше (этап 7, см. `ROADMAP.md`):

15. ⏳ **Освещение** — Rasterizer берёт символ полигона из `GlyphMap.RAMP` по
    интенсивности грани через `utils/Colors.js` (Ламберт + ambient).
16. ⏳ **Прозрачность** — флаг `transparent`, сортировка back-to-front, смешивание символов.
17. ⏳ **Текстуры** — UV-координаты вершин → выбор символа из 2D-текстуры.
18. ⏳ (опц.) **Кватернионы / LOD / пикер объектов (raycast)**.

---

## 10. Риски

- **Производительность JS-растеризации**: ограничиваем число граней,
  scanline-алгоритм, не per-pixel barycentric.
- **Читаемость формы**: без линий полигоны «плывут» — отдельный проход рёбер.
- **Искажение пропорций**: ascii-ячейка не квадратная (~1:2) — обязательна
  коррекция аспекта в Projection, иначе сферы/кубы выглядят искажёнными.
- **Near-clip**: треугольники, пересекающие near plane, режутся; иначе —
  артефакты от вершин, уходящих в бесконечность.
- **hiDPI**: без учёта `devicePixelRatio` картинка мыльная на retina-экранах.
- **file:// и скрипты**: избегаем ES-модулей, используем классические
  `<script>` + namespace — работает из двойного клика по `index.html`.
- **file:// и fetch**: JSON-сцены не грузятся через fetch — основной путь
  встроенные JS-сцены + file-picker для внешних.
