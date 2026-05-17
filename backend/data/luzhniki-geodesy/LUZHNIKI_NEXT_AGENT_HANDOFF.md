# Лужники — handoff для следующего агента (май 2026)

**Читать первым.** Предыдущий handoff: [LUZHNIKI_AGENT_HANDOFF.md](./LUZHNIKI_AGENT_HANDOFF.md), хронология: [LUZHNIKI_STADIUM_MAP_WORKLOG.md](./LUZHNIKI_STADIUM_MAP_WORKLOG.md).

---

## 0. Не путать: 6132 ≠ весь стадион

| Число | Что это | Точность ряд/место |
|-------|---------|-------------------|
| **~77 415** | Точки в `luzhniki.txt` (`coordinates`) → серая чаша, **без** подписи sector/row/seat | Только x,y |
| **6 132** | Места в `tickets.json` с `sectors[].r[].s[]` и координатами `x`,`y` | ✅ Эталон pbilet |
| **~80 637** | Слой `#luzhniki-pilot-seats` из `npm run build:luzhniki-stadium-pilot` (режим **full**) | 6 132 strict + **~74 286 fieldGrid** (эвристика по облаку) |
| **240** | Секторов в `tickets.json` (`sector.i`) | |

**Цель проекта (как формулировал заказчик):** geodesy-круги на **все места / все сектора** стадиона в одной подложке viewBox `0 0 11413 9676`, плюс **точные** sellable для брони.

**Ошибка в последних ответах ассистента:** скрипт `export:luzhniki-pbilet-geodesy-svg` экспортирует **только 6 132 strict** — это **не** полное покрытие стадиона. Полный слой — `build:luzhniki-stadium-pilot` → **~80 637** кругов. Не подменять одно другим.

---

## 1. Хронология (факты, без выдумок)

### Фаза A — пилот D230 и офферы (~2,5k кругов, ~47 секторов с офферами)

- Слой `#luzhniki-pilot-seats`: невидимые `<circle place-name row place>`.
- Координаты: `tickets.json` + `interpolatePbiletSeatGeodesy` (пример: D230 ряд 24).
- Скрипты: `generate/enrich/apply-luzhniki-sector-pilot`, bundle `bundle-luzhniki-stadium-pilot.json` в режиме **offers**.
- Sellable на API: `buildSellableSeatGeodesyFromSvgCircles`, `svgOnlyMatched`.

### Фаза B — full stadium build (май 2026)

- `npm run build:luzhniki-stadium-pilot` (default `LUZHNIKI_PILOT_MODE=full`):
  - `tickets` strict + **fieldGrid** по `luzhniki.txt` + enrich офферов суперфинала.
  - Результат: **80 637** кругов, **240** секторов (`bundle-luzhniki-stadium-pilot.json`).
  - Sidecar: `hand/bundle-luzhniki-stadium-pilot-seats.json` (не в git, в `.gitignore`).
- `apply:luzhniki-sector-pilot`: при **>6000** кругов **не** вшивает их в `svg_markup` (тяжело), пишет флаги + sidecar; **80k `layout.seats` убраны из БД** (`strip:luzhniki-layout-seats-db`).

### Фаза C — калибровка / warp (откатили по качеству)

- `sector-row-anchors.json` (240 секторов автоген), `luzhnikiSeatWarp.js` (bilinear, polarGrid, tribune affine).
- На sellable и fieldGrid применялась калибровка → точки **разъехались**, хуже чем до warp.
- **Текущее состояние кода (коммит `e7d4fe45`):** sellable = `buildSellableSeatGeodesyPbiletAccurate` — **strict + интерполяция по якорям**, **без** warp и **без** lookup в 80k fieldGrid как финальных координат.

### Фаза D — перфоманс API

- `slimLuzhnikiStageMapForClient`: клиенту **не** отдаются 80k `layout.seats` и **не** отдаётся 77k `allSeatCoordinates` (чаша = SVG-подложка pbilet).
- Sellable только в `layout_json.sellableSeats` (~500 мест на суперфинале).
- In-memory index из sidecar для старого пути; **активный sellable-путь сейчас pbilet-accurate**, не index 80k.

### Фаза E — `export:luzhniki-pbilet-geodesy-svg` (вспомогательный, не full)

- Только **6 132** круга из strict tickets.
- Файлы: `hand/luzhniki-pbilet-strict-seats.svg`, `hand/bundle-luzhniki-pbilet-strict-seats.json`.
- **Не закрывает** задачу «SVG на все места стадиона».

---

## 2. Архитектура слоёв (канон)

```
pbilet SVG подложка (GetBilet / seed)     — художественная чаша, viewBox 11413×9676
    +
#luzhniki-pilot-seats (до 80k circle)     — геодезия: place-name, row, place [, id — TODO]
    → API /map: sellableSeats (~500)      — только места с офферами, координаты pbilet-логики
    → UI: цветные точки из sellableSeats
    → UI: серая чаша = SVG ИЛИ allSeatCoordinates (сейчас на клиенте cloud отключён ради скорости)
```

**Правило точности для брони (зафиксировано заказчиком после регресса):**

1. **strict** из `tickets.json` — приоритет.
2. **интерполяция** `interpolatePbiletSeatGeodesy` между рядами tickets / layout-якорями (+ `layoutAnchorLookupRow` +4 на левой трибуне).
2b. **axisGrid** — если ряда нет в layout (прорезь 16…27): `luzhnikiSectorAxisGridPlacement.js`, см. [LUZHNIKI_SECTOR_AXIS_GRID.md](./LUZHNIKI_SECTOR_AXIS_GRID.md).
3. **НЕ** использовать координаты fieldGrid 80k как «истину» для sellable.
4. **НЕ** применять `luzhnikiSeatWarp` / tribune affine к sellable (разъезжает).

**fieldGrid 80k** — подписи ряд/место для ~74k точек вне strict. **До мая 2026** ряды были сдвинуты (~4 на овале, до ~10 на боковых) из‑за `rowNumToBandIndex` (один pbilet-ряд = несколько band-кластеров). **Фикс в коде:** §9 — калибровка по strict; **bundle/БД ещё нужно пересобрать**.

---

## 3. Файлы и скрипты

| Путь / npm | Назначение |
|------------|------------|
| `tickets.json` (корень репо) | Частичный pbilet: **6132** подписанных мест, **240** секторов |
| `luzhniki.txt` | **77415** точек x,y, width/height 11413×9676 |
| `hand/bundle-luzhniki-stadium-pilot.json` | Full build metadata + svgMarkup (**~80k** кругов, mode `full`) |
| `hand/bundle-luzhniki-stadium-pilot-seats.json` | Массив seats для sidecar (**gitignore**, создаётся при build) |
| `hand/luzhniki-pbilet-strict-seats.svg` | Только **6132** strict (вспомогательный экспорт) |
| `data/luzhniki-geodesy/sector-row-anchors.json` | Якоря 240 секторов (автоген); polarGrid для лож |
| `npm run build:luzhniki-stadium-pilot` | **Full** ~80k кругов |
| `npm run apply:luzhniki-sector-pilot` | Merge / флаги в БД |
| `npm run export:luzhniki-pbilet-geodesy-svg` | Только strict 6132 — **не full** |
| `npm run generate:luzhniki-sector-anchors` | Пересобрать sector-row-anchors.json |
| `npm run strip:luzhniki-layout-seats-db` | Убрать 80k из `layout_json` в Postgres |

**Код sellable (актуальный):**

- `backend/utils/luzhnikiPbiletSellableGeodesy.js` — `buildSellableSeatGeodesyPbiletAccurate`
- **`backend/utils/luzhnikiSectorAxisGridPlacement.js`** — **axisGrid** (эталон **A101**, прорезь **B154**); гайд: [LUZHNIKI_SECTOR_AXIS_GRID.md](./LUZHNIKI_SECTOR_AXIS_GRID.md)
- `backend/services/luzhnikiFootballStageMap.js` — `adaptLuzhnikiStageMapForLiveOffers` + `slimLuzhnikiStageMapForClient`
- `backend/utils/luzhnikiPilotSeatSvg.js` — разметка circle, strip тяжёлого слоя с клиента

**Код full build:**

- `backend/scripts/build-luzhniki-stadium-pilot-geodesy.js`
- `backend/utils/luzhnikiStadiumFullGeodesy.js` — merge strict + fieldGrid (калибровка отключена в build)

---

## 4. Открытые задачи (приоритет для следующего агента)

### 4.1. SVG на все места с **id** на каждом круге

**Требование заказчика:** каждый круг должен иметь **id** (уникальный).

**Сейчас (B, 2026-05-17):** `pilotSeatCircleMarkup()` — `id="seat-{norm}-r{row}-s{seat}"` + `place-name`, `row`, `place`.

```xml
<circle id="seat-{normSector}-r{row}-s{seat}" ... place-name="..." row="..." place="..." />
```

Нормализация id: без пробелов, латиница, `strictSeatKey` или hash.

**Full export:** пересобрать слой из `bundle-luzhniki-stadium-pilot` / sidecar **80 637** мест с id; merge в подложку отдельным скриптом (осторожно с размером DOM — на клиенте слой всё равно strip >6k).

### 4.2. Не путать «точность» и «полноту»

| Задача | Инструмент |
|--------|------------|
| Полнота (~80k подписей) | `build:luzhniki-stadium-pilot` + sidecar |
| Точность sellable | `luzhnikiPbiletSellableGeodesy` (strict + interpolate) |
| Точность strict-only SVG | `export:luzhniki-pbilet-geodesy-svg` (6132) |

Полный pbilet API на 81k **нет в репо** — в worklog зафиксировано: pbilet не отдаёт полный export на сеанс.

### 4.3. Геометрически правильная сетка

**Диагностика (агент A, май 2026):** «зигзаг» линий рядов в `grid-diagnostic.html` — не баг отрисовки, а **один API-ряд pbilet пересекает несколько band** при кластеризации `luzhniki.txt`. На **strict 6132** сетка должна быть `grid_ok`; кривая сетка на fieldGrid = старый алгоритм.

**Фикс fieldGrid (в коде, §9):** `luzhnikiFieldGridRowCalibration.js` + `ticketsSeats` в `buildStadiumLayoutSeatsFromDotGrid`. Тест: `backend/tests/luzhnikiFieldGridRowCalibration.test.js`. **Не в проде**, пока не `build:luzhniki-stadium-pilot`.

**Sellable на biletvsem.com сейчас:** `pbiletStrict` — **не** fieldGrid, **не** cloud-grid-snap (см. §9.4).

### 4.4. Вернуть сераую чашу на клиенте без лагов

Сейчас `omitClientSeatCoordinateCloud: true` (~77k не в JSON). Варианты: отдельный lazy endpoint, тайлы, или рисовать только из SVG при zoom.

### 4.5. Фронт: D229 в карточке D230

При `omitLayoutSeatSellableFallback` — фильтр sellable **только byLabel**, без merge по bbox (`LUZHNIKI_AGENT_HANDOFF.md` §2B). Проверить актуальность в `TicketHallInteractiveBlock.tsx`.

---

## 5. Деплой (шаблон)

```bash
# локально
git pull origin main

# на VPS
cd /var/www/pokupka-biletov   # путь на сервере
git pull origin main
cd backend
npm run build:luzhniki-stadium-pilot
npm run apply:luzhniki-sector-pilot
npm run strip:luzhniki-layout-seats-db   # если в БД снова появились 80k seats в layout_json
pm2 restart bilet-backend --update-env
cd ../frontend && npm ci && npm run build
```

Проверка:

```bash
curl -sS "http://127.0.0.1:${PORT}/api/bilet/stage/luzhniki-football/map?repertoireId=6a05d17b46a4d000309ecf4e" \
  | jq '{sellable: .layout_json.sellableSeats|length, matched: .layout_json.offerSeatGeodesy.matched, mode: .layout_json.sellableGeodesyMode, seats: .layout_json.seats, cloud: .layout_json.allSeatCoordinates}'
```

Ожидание сейчас: `sellableGeodesyMode: "pbiletStrict"`, `matched` ≈ 502/503, `seats` и `cloud` отсутствуют в ответе.

---

## 6. Env-переключатели

| Переменная | Значение | Эффект |
|------------|----------|--------|
| `LUZHNIKI_USE_FIELDGRID_SELLABLE=1` | вкл | Старый путь lookup 80k (не рекомендуется) |
| `LUZHNIKI_SKIP_SEAT_CALIBRATION=1` | по сути уже не используется на sellable | warp отключён в коде |
| `LUZHNIKI_OMIT_CLIENT_SEAT_CLOUD=0` | вернуть 77k на клиент | тяжёлый JSON |
| `LUZHNIKI_MAX_PILOT_CIRCLES_IN_SVG` | default 6000 | порог merge кругов в svg_markup |
| `LUZHNIKI_PILOT_MODE=offers` | build только оффер-сектора | старый пилот |

---

## 7. Коммиты (ориентиры)

| Коммит | Суть |
|--------|------|
| `869af11f` / пилот | D230 mapping, ~47 секторов офферов |
| `0d5d4422` | Якоря 240 секторов, warp (потом откатили для sellable) |
| `83df980b` | Перфоманс: sidecar, slim API |
| `e7d4fe45` | Sellable pbilet-accurate, без warp |

---

## 8. Эталон приёмки (не снимать)

**Сектор D 230, ряд 24, места 8–11** — координаты sellable совпадают с карточкой оффера (`interpolatePbiletSeatGeodesy` + tickets, коммит `8e8e7eb8`).

**Не считать успехом:** 6132 кругов в отдельном SVG как «весь стадион»; fieldGrid 80k как точные ряды; sellable после bilinear/tribune warp.

---

---

## 9. Координация двух агентов (единый источник правды — **этот файл**)

**Правило:** любые изменения по Лужникам — сначала читать §9, потом править код; после сессии — дописать строку в таблицу «Статус» ниже.

### 9.1. Статус на 2026-05-17

| Область | Агент | Статус | Файлы |
|---------|-------|--------|-------|
| fieldGrid: сдвиг рядов ~4 | **A** | ✅ код; **B:** bundle+sidecar пересобраны, apply в dev-БД | `luzhnikiFieldGridRowCalibration.js`, `hallSeatGeodesyLuzhnikiGrid.js`, `luzhnikiStadiumFullGeodesy.js` |
| Диагностика strict vs fieldGrid | **A** | ✅ | `/test/luzhniki-seat-grid`, `GET /api/bilet/dev/luzhniki-seat-grid-diagnostic`, `luzhnikiGeodesyGridDiagnostic.js` |
| `/tools/luzhniki-grid-diagnostic.html` | **B** | ✅ **Master Grid** (`FORCE_FULL_GRID=1`): 1..maxRow из SVG+облака, виртуальные дуги, snap sellable; D230 ≈32 ряда | `luzhnikiMasterGridGapFill.js`, `luzhnikiLocalMagneticResonance.js` |
| Sellable `/map` | **B** | ✅ **pbiletStrict** (откат cloud-grid default); snap — только `LUZHNIKI_SELLABLE_GEODESY=cloud-grid` после OK | `luzhnikiFootballStageMap.js`, `luzhnikiPbiletSellableGeodesy.js` |
| Sellable cloud-grid-snap | **B** | черновик, **не в /map** | `luzhnikiCloudGridSeatIndex.js` |
| `id` на pilot circle | **B** | ✅ `seat-{norm}-r{row}-s{seat}` | `luzhnikiPilotSeatSvg.js` |
| VIP C138 polarGrid | **B** | черновик в cloud-модуле; sellable VIP — через pbilet/anchors | `sector-row-anchors.json`, `luzhnikiCloudGridSeatIndex.js` |
| Production build + apply | **B** | ✅ локально; прод — после `git push` + deploy §9.5 | `bundle-luzhniki-stadium-pilot.json`, sidecar seats |

### 9.2. Корневая причина «сдвиг ~4 ряда» (не offset вручную)

Старый `buildStadiumLayoutSeatsFromDotGrid`:

```text
sortSectorRowBandsFromField → N полос
for rowNum 1..maxRow: emitBand(bands[rowNumToBandIndex(...)], rowNum)
```

**Ошибка:** pbilet-ряд (дуга) лежит в **2–4 полосах** точек. Пример `Сектор A 103` strict ряд 6: места 4–6 в band 3, 7–12 в band 4 → на тех же XY fieldGrid давал **row 4**.

**Фикс A:** для секторов с ≥2 рядами в `tickets.json` — ряд каждой точки чаши по интерполяции `rowCoord` между strict-центроидами + snap к strict (радиус 0.22% viewBox). Fallback: SVG `<tspan>` ряды → старый `rowNumToBandIndex`.

### 9.3. Эталон D230 ряд 24 места 8–11 — **НЕ fieldGrid**

| | |
|--|--|
| **Для чего** | Приёмка **sellable** на чекауте (цветные точки) |
| **Путь** | `buildSellableSeatGeodesyPbiletAccurate` → `interpolatePbiletSeatGeodesy` |
| **НЕ использовать** | калибровку fieldGrid, snap на 80k, `layout.seats` fieldGrid |

В `tickets.json` у **Сектор D 230** strict только ряды **26, 28, 30, 32** (87 мест). **Ряда 24 в strict нет** — координаты ряда 24 для оффера идут **только интерполяцией** между якорями tickets/layout, не из облака 77k.

Проверка sellable (не diagnostic API):

```bash
curl -sS "http://127.0.0.1:${PORT}/api/bilet/stage/luzhniki-football/map?repertoireId=6a05d17b46a4d000309ecf4e" \
  | jq '.layout_json.sellableGeodesyMode, (.layout_json.sellableSeats[] | select(.row=="24" and .sector|test("230")))'
```

Ожидание: `sellableGeodesyMode: "pbiletStrict"`.

### 9.4. ⚠️ Конфликт с ТЗ «Grid-Snap для sellable»

Заказчик просил: *«Switch from interpolatePbiletSeatGeodesy to Grid-Snap»*.

**Факты в репо:**

1. Активный sellable: `luzhnikiFootballStageMap.js` → `USE_PBILET_ACCURATE` → **`buildSellableSeatGeodesyPbiletAccurate`** (`sellableGeodesyMode: pbiletStrict`). Откат после warp — **намеренный** (§1 фаза C).
2. `buildSellableSeatGeodesyCloudGridSnap` в `luzhnikiCloudGridSeatIndex.js` — **не вызывается** из `adaptLuzhnikiStageMapForLiveOffers`.
3. Handoff §2: **не** использовать fieldGrid 80k как истину для sellable.

**Рекомендация перед сменой sellable-пути:**

1. Согласовать с заказчиком: pbiletStrict vs cloud-grid-snap.
2. Если snap — сначала **пересобрать fieldGrid** с фиксом A; иначе snap унаследует старый сдвиг.
3. Не включать `LUZHNIKI_USE_FIELDGRID_SELLABLE=1` без ревью.

**Компромисс (если нужен snap только где нет strict):** strict/interpolate как сейчас; snap только при `lookup` промахе и `dist < ε` — отдельная ветка, флаг env.

### 9.5. Что делает агент B (production / snap / VIP) — чеклист

**Сделать (после pull с фиксом A):**

1. `cd backend && npm run build:luzhniki-stadium-pilot` — новый fieldGrid в bundle + sidecar.
2. `npm run apply:luzhniki-sector-pilot -- --bundle data/luzhniki-geodesy/hand/bundle-luzhniki-stadium-pilot.json`
3. `pilotSeatCircleMarkup`: добавить `id="seat-{normSector}-{row}-{seat}"` (§4.1); пересобрать pilot.
4. VIP C138: polarGrid / bbox из `sector-row-anchors.json` (`luzhnikiCloudGridSeatIndex.js` уже черновик).
5. Если подключаете cloud-grid-snap — wire в `luzhnikiFootballStageMap.js`, новый `sellableGeodesyMode`, тест D230 r24 s8–11 + A103.

**Не делать:**

- Деплой `apply` **до** `build` с актуальным кодом (старый bundle).
- Считать `grid-diagnostic.html` (серая чаша без strict-калибровки) эталоном рядов для sellable.
- Менять sellable на fieldGrid без явного OK заказчика.

**Деплой (после merge в main):**

```bash
# VPS
cd /var/www/pokupka-biletov && git pull origin main
cd backend
npm run build:luzhniki-stadium-pilot
npm run apply:luzhniki-sector-pilot -- --bundle data/luzhniki-geodesy/hand/bundle-luzhniki-stadium-pilot.json
npm run strip:luzhniki-layout-seats-db   # если снова раздули layout_json
pm2 restart bilet-backend --update-env
cd ../frontend && npm ci && npm run build
```

### 9.6. Диагностика (оба агента)

| Инструмент | Данные |
|------------|--------|
| `http://localhost:5173/test/luzhniki-seat-grid?mode=strict&sector=D+230` | strict 6132, линии рядов |
| `?mode=fieldGrid` | fieldGrid после фикса A (нужен backend) |
| `?mode=compare` | Δряд strict vs fieldGrid, гистограмма |
| `cd backend && npm run render:luzhniki-seat-grid` | офлайн HTML polar (R,φ) + D230 + cloud legacy |
| `node --test backend/tests/luzhnikiFieldGridRowCalibration.test.js` | регрессия fieldGrid |

### 9.7. Definition of Done (уточнённый)

| Критерий | Как проверить |
|----------|----------------|
| Цветные sellable на кружках pbilet | D230 r24 s8–11, B/D сектора на чекауте; mode `pbiletStrict` или согласованный snap |
| Нет зигзага **на strict 6132** | `/test/luzhniki-seat-grid?mode=strict` → verdict `grid_ok` |
| fieldGrid ряды ≈ strict | `compare.exactPct` ≥ 95% на API diagnostic для A103, D230 |
| 80k pilot с id | круги в sidecar/SVG с `id=`, build+apply |
| VIP C138 | офферы с polarGrid/bbox, не ждать tickets |

---

*Документ создан по запросу заказчика после путаницы 6132 vs 80k. Обновлять по факту, не выдумывать цифры — сверять с `bundle-luzhniki-stadium-pilot.json` и `tickets.json`.*
