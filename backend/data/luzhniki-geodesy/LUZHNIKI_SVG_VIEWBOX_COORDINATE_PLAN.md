# Лужники — векторная SVG-подложка (viewBox 11413×9676)

**Статус:** пилот D 230 ✅ — масштабирование на весь стадион  
**Канон viewBox:** `0 0 11413 9676` (система pbilet / `luzhniki.txt`, **не** `1000×820` из `luzhniki-football-stadium.svg`)  
**Не делаем:** `strict-only`, `fieldGrid` / `cloud` как источник координат sellable на проде.

**Связанные документы:** [README](./README.md), [LUZHNIKI_STADIUM_MAP_WORKLOG.md](./LUZHNIKI_STADIUM_MAP_WORKLOG.md), [LUZHNIKI_MAP_SELL_VIA_SCHEME.md](./LUZHNIKI_MAP_SELL_VIA_SCHEME.md)

**Код:** `svgNativeSeatLayout.ts`, `hallSeatGeodesyFromSvgCircles.js`, `seed-luzhniki-football-geodesy.js`, `import-luzhniki-inkscape-stage-map.js`, `TicketHallInteractiveBlock.tsx`

---

## 1. Идея (как у SeatMap / Яндекс Афиши)

Одна координатная сетка — **внутри SVG** (`viewBox`). Место — не точка поверх JPEG, а **объект в SVG** (`<circle cx cy>` или `<g id="sector-…">` + path).

Масштаб на любых экранах: только `viewBox` + `preserveAspectRatio="xMidYMid meet"` — все `cx`/`cy` масштабируются **пропорционально**, без «скачка».

---

## 2. Решение: ручная векторная подложка

Самый простой и контролируемый путь — **нарисовать слой в SVG-редакторе**, затем загрузить в БД. Автогенерация 81k из pbilet API недоступна; `fieldGrid` даёт ~94% неверных точек (аудит 17.05.2026).

### Шаг 1 — холст и фон (Method Draw / Inkscape / Figma → SVG)

1. Открыть [Method Draw](https://method.ac/) или **Inkscape** (удобнее для атрибутов и `viewBox`).
2. **Document properties** → размер холста **`11413 × 9676`** px (или импорт подложки и выставить тот же `viewBox` в корневом `<svg>`).
3. **File → Import image** — растр или SVG чаши Лужников (экспорт pbilet `coordinates.bg` / скрин с правильными пропорциями).
4. Выровнять картинку по краям холста (без искажения пропорций).

> Временный растр — только как **подсказка**. В финальном файле его не должно быть (см. шаг 4).

### Шаг 2 — вектор поверх

| Слой | Элемент SVG | Зачем |
|------|-------------|--------|
| **Секторы** | `<g id="sector-d230">` + `<path d="…">` | Клик по зоне, hover, фильтр мест |
| **Места** | `<circle cx="…" cy="…" r="…">` | Жёсткая привязка к креслу |

**Пилот:** один трибунный сектор с продажами (напр. `D 230` или `VIP C 138`), ~50–200 кружков, проверка на чекауте → потом остальные секторы.

### Шаг 3 — атрибуты мест (обязательно для нашего парсера)

Парсер бэкенда/фронта ищет круги с атрибутами (см. `hallSeatGeodesyFromSvgCircles.js`, `processHallSvgForNative`):

```xml
<circle
  cx="4521.3"
  cy="2104.8"
  r="8"
  place-name="Сектор D 230"
  row="5"
  place="12"
/>
```

| Атрибут | Значение |
|---------|----------|
| `place-name` | Как в оффере GetBilet `Sector` (после нормализации — см. worklog) |
| `row` | Номер ряда |
| `place` | Номер места |

Inkscape: XML Editor → выделить circle → дописать атрибуты.  
Method Draw: часто **нет** кастомных атрибутов → экспорт → правка в Inkscape или скриптом `inject-*` (ниже).

**Секторы (Inkscape-стиль):** группы `<g id="C248">` с path внутри — уже поддерживает `npm run import:luzhniki-inkscape-stage-map` (контуры без привязки к каждому креслу).

### Шаг 4 — финальный файл

1. Удалить **фоновую картинку** (или слой `reference-image`).
2. Проверить корень:

```xml
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 11413 9676"
     width="11413"
     height="9676">
  <!-- g#sectors, circle[place-name]… -->
</svg>
```

3. Сохранить, например:  
   `backend/data/luzhniki-geodesy/hand/luzhniki-football-vector.svg`

**Критерий:** в файле **нет** `<image href="…jpg">`, есть `viewBox="0 0 11413 9676"`, ≥2 круга с `place-name`+`row`+`place`.

---

## 3. Загрузка в проект и на прод

### Вариант A — bundle (рекомендуется для полной схемы)

JSON + SVG:

```json
{
  "hallWidth": 11413,
  "hallHeight": 9676,
  "source": "hand-vector-method-draw",
  "svgMarkup": "<svg …>…</svg>",
  "sectors": [{ "id": "d230", "label": "Сектор D 230", "path": "M … Z" }],
  "seats": [{ "sector": "Сектор D 230", "row": "5", "seat": "12", "x": 4521.3, "y": 2104.8 }]
}
```

```bash
cd backend
LUZHNIKI_GEODESY_BUNDLE_JSON=data/luzhniki-geodesy/hand/bundle-pilot-d230.json \
LUZHNIKI_GEODESY_MIN_SEATS=50 \
npm run seed:luzhniki-football-map
```

На сервере после merge в `main`:

```bash
cd /var/pokupka-biletov/backend
npm run reseed:luzhniki-from-repo   # если bundle в репо
# или отдельный bundle только для пилота
pm2 restart bilet-backend --update-env
```

### Вариант B — только контуры секторов (Inkscape)

```bash
STAGE_MAP_STAGE_ID=luzhniki-football \
STAGE_MAP_TITLE="Лужники — вектор (пилот)" \
LUZHNIKI_INKSCAPE_SVG_PATH=frontend/public/maps/luzhniki-go.svg \
npm run import:luzhniki-inkscape-stage-map
```

Места там **синтетические** по bbox — для боевых кресел нужны **круги с place-name** (шаг 2–3).

### Вариант C — донор pbilet + вшитые круги из tickets

Уже есть: `injectPbiletSeatsIntoSvg` при сиде (`LUZHNIKI_EMBED_TICKET_CIRCLES_IN_SVG`).  
Ограничение: только ~6k strict из `tickets.json`, не полный стадион.  
**Ручная подложка** закрывает секторы, где pbilet не дал координат.

---

## 4. Как офферы GetBilet красят места

После сида с кругами в `svg_markup`:

1. `layoutMode: svgNative`
2. `/map` → `buildSellableSeatGeodesyFromSvgCircles` → `geodesySource: svgCircle`
3. Фронт: `processHallSvgForNative` / `buildSvgNativePlacements` — цвет по цене

**Не использовать на проде:** `fieldGrid`, `cloud`, `cloudSnap` для `luzhniki-football` (отключить в `adaptLuzhnikiStageMapForLiveOffers` после появления достаточного числа `svgCircle`).

Оффер без круга в SVG → место **только в списке**, не на карте (честный UX).

---

## 5. Фронт (после появления векторного SVG в БД)

| Сейчас | Цель |
|--------|------|
| Canvas + 77k `allSeatCoordinates` + sellable отдельно | Один **DOM SVG** с `viewBox="0 0 11413 9676"` |
| Подложка 1000×820 в `public/` | Только `svg_markup` из БД |
| `stadiumCanvasEnabled` | `false` для luzhniki, если в SVG ≥ N кругов |

Серая чаша: либо все места как `<circle r="1" opacity="0.4">` в том же SVG (пилот — только sellable), либо упрощённый path «чаша» без 77k DOM-узлов.

---

## 6. Пошаговый roadmap

| # | Этап | Статус |
|---|------|--------|
| 0 | Backend + GetBilet probe OK | ✅ |
| 1 | Аудит: viewBox 11413×9676 в API, file 1000×820 — **расхождение** | ✅ 17.05.2026 |
| 2 | Пилот D 230: generate → 87+4 кругов, merge apply, `/map` svgCircleMatched=4 | ✅ 17.05.2026 |
| 3 | Координаты офферов из **tickets.json + интерполяция**, не layout.seats | ✅ `8e8e7eb8` |
| 4 | Визуал: без рамки сектора, невидимые geodesy-круги, чаша как раньше | ✅ |
| **5** | **Все сектора с офферами** — тот же пайплайн, что D 230 | **→ сейчас** |
| 6 | Чекаут: единый SVG / без canvas-дубля при полном покрытии | |
| 7 | Мобилка: один слой карты | |

---

## 7. Аудит 17.05.2026 (прод)

| Параметр | Значение |
|----------|----------|
| `layout_json.geodesy` | `11413 × 9676` |
| `public/…/luzhniki-football-stadium.svg` | `1000 × 820` — **не использовать** |
| sellable | 500: **469 fieldGrid**, **31 strict**, **0 svgCircle** |

**Вывод:** переходим на **векторную подложку** с `viewBox="0 0 11413 9676"`, не на strict-only.

---

## 8. Чеклист перед коммитом SVG в репо

- [ ] `viewBox="0 0 11413 9676"`
- [ ] Нет встроенного `<image>` фона
- [ ] Круги с `place-name`, `row`, `place`
- [ ] Имена секторов согласованы с GetBilet (таблица в worklog)
- [ ] Локально: `parseSvgNativeSeatCircles` / превью `/test/luzhniki` или admin stage maps
- [ ] После сида: `curl …/map` → `offerSeatGeodesy.svgCircleMatched` > 0

---

## 9. Эталон: пилот D 230 (успех)

Подробности: [LUZHNIKI_STADIUM_MAP_WORKLOG.md § Успешный пилот D 230](./LUZHNIKI_STADIUM_MAP_WORKLOG.md#успешный-пилот-d-230--канон-для-всего-стадиона-17052026).

Кратко:

- Geodesy-круги в `#luzhniki-pilot-seats` (`opacity="0"`), merge в `svg_markup`, не replace.
- Sellable: `buildSellableSeatGeodesyFromSvgCircles` + `svgOnlyMatched` пока пилот не покрывает весь стадион.
- Координаты офферов: **`interpolatePbiletSeatGeodesy(tickets.json)`** — не `layout.seats`.

## 10. Следующее действие — весь стадион

1. Список секторов с офферами (суперфинал `6a05d17b46a4d000309ecf4e`).
2. Цикл `generate` / `enrich` / `fix` по сектору (или скрипт-обёртка `enrich-all-luzhniki-pilot-sectors.js` — TODO).
3. Один merge `apply` с накопленным слоем кругов (все сектора в `#luzhniki-pilot-seats`).
4. Проверка: для каждого сектора с оффером — выборочно curl + чекаут (ряд/место = точка на схеме).

```bash
# шаблон на один сектор
cd backend
node scripts/generate-luzhniki-sector-pilot-svg.js --sector "Сектор D 231"
REPERTOIRE_ID=6a05d17b46a4d000309ecf4e PILOT_SECTOR_NORM=d231 \
  PILOT_BUNDLE=data/luzhniki-geodesy/hand/bundle-sector-d-231-pilot.json \
  node scripts/enrich-luzhniki-sector-pilot-from-offers.js
npm run apply:luzhniki-sector-pilot -- --bundle data/luzhniki-geodesy/hand/bundle-sector-d-231-pilot.json
```

После N секторов — объединять круги в один bundle или расширить `apply` для append без затирания предыдущих секторов в слое.
