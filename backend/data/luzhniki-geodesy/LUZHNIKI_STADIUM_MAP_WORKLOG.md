# Лужники — интерактивная схема зала (worklog)

**Продажа через схему (без 81k pbilet):** см. [LUZHNIKI_MAP_SELL_VIA_SCHEME.md](./LUZHNIKI_MAP_SELL_VIA_SCHEME.md)

---

## 17.05.2026 — ось сектора + подписи рядов на SVG + мобильный оверлей

### Симптомы
1. **Мобильная версия:** на обзоре стадиона цветные точки колоннами через всё поле (все sellable сразу).
2. **Сектор:** кружки не на серых точках; ряд 11 визуально у подписи 25–30 (A101); логика «ряд 1 = у поля» не совпадает с цифрой **1** на схеме (D121).

### Правило заказчика (канон)
У **каждого сектора своя** система координат:
- **Ряд N** — полоса точек у подписи «N» на схеме (не «ряд 1 у поля» и не интерполяция 22 полос → 40 подписей).
- В секторе несколько колонок цифр на SVG — берём колонку, где номера рядов **монотонно** идут по Y (`pickSectorRowLabelAisle`).
- **Место 1** — у подписи ряда; **место 2, 3…** — вдоль ряда в направлении от подписи ряда R к R+1 (или R−1), не всегда «слева».
- Горизонтальные трибуны (A101): полосы по Y; боковые (D121, B147): полосы вдоль оси поле→сектор.

### Исправление (код)
| Модуль | Что сделано |
|--------|-------------|
| `hallSeatGeodesyFromDots.js` | `clusterDotsByRowAlongAxis` — полосы вдоль оси «поле → сектор» |
| `hallSeatGeodesySectorNative.js` | `labelSectorBandsWithSvgRowNumbers` — полоса ↔ номер ряда с подписи SVG; `findBandIndexForRowNum`; места слева направо |
| `hallSeatGeodesyLuzhnikiGrid.js` | grid `layout.seats` с теми же номерами рядов/мест |
| `hallSeatGeodesyFromSvgRows.js` | `pickSectorRowLabelAisle`, `getRowLabelYPctInSector`, `sortDotsInSectorRow` |
| `TicketHallInteractiveBlock.tsx` | sellable **только в выбранном секторе** (DOM + canvas на обзоре пусто) |
| CSS / hitbox | диаметр клика ≈ точка на canvas |

### Деплой VPS (`/var/pokupka-biletov`)

```bash
cd /var/pokupka-biletov && git pull origin main
cd backend
LUZHNIKI_PBILET_TICKETS_JSON=/var/pokupka-biletov/tickets.json \
LUZHNIKI_PBILET_COORDINATES_JSON=/var/pokupka-biletov/luzhniki.txt \
npm run seed:luzhniki-football-map
cd .. && ./scripts/deploy-via-git.sh main
```

Проверка: обзор без сектора — **нет** цветных точек на поле; клик сектор → ряд/место на серых точках у цифр рядов.

---

## Май 2026 — история геодезии sellable и вывод: эвристики нестабильны

### Что хотим

| Слой | Источник | Требование |
|------|----------|------------|
| Серая чаша | `luzhniki.txt` (~77k точек) | Не трогать — визуал ок |
| Цветные sellable | GetBilet офферы | **Сектор + ряд + место** = та же точка, что на portalbilet / подписи на схеме |

Правило от заказчика (зафиксировано): в ряду считать точки **слева направо**, место 1 = первая точка; ряд 1 — у поля при взгляде с арены. На практике это **не выводится** надёжно из облака без подписи каждого места.

### Почему точки «скачут» (корневая причина)

1. **Два разных датасета pbilet**
   - `luzhniki.txt` — 77k координат **без** sector/row/seat.
   - `tickets.json` — ~6k мест **с** подписью (частичный снимок API, не весь стадион).
   - У большинства секторов в tickets `r: []` (пример: D 121, B 147) — **ноль** strict-координат.

2. **Любая додумка = интерполяция**
   - Привязка «ряд N → полоса точек» / «место M → M-я точка в полосе» / «ось с поля» / «Y с `<tspan>`» работает **по-разному** в каждом клине (A101 низ, D121 бок, углы у ворот).
   - Подписи рядов на SVG (`<tspan>`) и геометрия облака **не всегда согласованы** (ряд 11 на подписи ≠ ряд 11 по fieldScore; после фикса SVG-Y — место в ряду всё ещё эвристика).

3. **Противоречие в требованиях продукта**
   - «Все sellable на карте» (полное покрытие GetBilet) ↔ «только честные координаты» (strict-only).
   - Покрытие достигали через `cloud` / `svgRow` / `cloudSnap` — ценой точности.

4. **Деплой / кэш** (вторично)
   - Координаты считаются в `adaptLuzhnikiStageMapForLiveOffers` на каждый `/map`, но фронт должен брать `sellableSeats` с API, не старый `layout.seats` из сида.

### Хронология попыток (кратко)

| Этап | Подход | Результат |
|------|--------|-----------|
| 1 | Интерполяция по 77k облаку, grid в bbox | Боковые сектора «летают», ряд 32 у ряда 29 |
| 2 | Только `layout.seats` strict | Чаша ок, **половина офферов без точки** (рядов нет в снимке tickets) |
| 3 | `anchor` между якорями tickets | Между рядами — неверный Y/X на овале |
| 4 | `cloud` + ориентация от соседнего сектора (B258→B147) | Покрытие↑, ряды 3/11 на одной полосе → сняли |
| 5 | `inferCloudSectorRowRange` с 1, не с min оффера | Ряд 11 не на подписи «1», но места всё ещё мимо |
| 6 | `svgRow` / Y с `<tspan>` напрямую | Часть секторов ок, A101 — ряд 11 внизу чаши |
| 7 | **sector-native**: ряд 1 = полоса к полю, место = слева направо | Ряд/место зеркалятся на D121, A101 |
| 8 | Фикс оси мест `(vy,-vx)` для Y-down | Места в ряду лучше на боковых, **ряды** всё ещё мимо |
| 9 | `maxRow` сектора из офферов, не `rowNum` | Ряды 21/22/28 не схлопываются в одну полосу |
| 10 | Ряд → Y из SVG `<tspan>` → ближайшая полоса точек | На тестах A101 ряд 11 ≈ подпись 81%; **на проде точки всё ещё скачут** — значит либо нет SVG на VPS, либо место в ряду/полоса/сектор dots всё ещё неверны |

**Итог сессии:** чинить очередную формулу в `hallSeatGeodesy*.js` — **низкий потолок**. Нужен источник координат **покомпонентно** (sector, row, seat), а не вывод из облака.

### Кардинальные альтернативы (что делать дальше)

#### A. Strict-only на карте (рекомендуется как быстрый честный режим)

- Цветные точки **только** где есть запись в `tickets.json` / полном pbilet export (`r[].s[]` с x,y).
- Остальные офферы — **только список слева**, без точки на карте.
- Плюсы: не врём; серая чаша без изменений. Минусы: ~6k/81k покрытие сейчас.

**Шаги:** `sellableSeatsLabeledOnly: true`, отключить `cloud`/`svgRow`/`cloudSnap` в `buildSellableSeatGeodesyWithDots`; UI: «место на схеме недоступно — выберите из списка».

#### B. Полный `tickets.json` с pbilet (стратегически правильно)

- В Network сеанса найти URL tickets с **всеми** секторами и `r[].s[]` (цель ~81k мест).
- `npm run fetch:pbilet-luzhniki` → пересид `seed:luzhniki-football-map`.
- Sellable = только `strict` match по ключу — **без эвристик**.

**Блокер:** API без `event_source_id` / `event_date_id` отдаёт ~6k мест; D121, B147 с `r: []`.

#### C. Координаты из SVG `circle[place-name][row][place]` (выбрано, май 2026)

**Проверка pbilet `coordinates.bg`:** в SVG Лужников **0** `<circle place-name>`, **5137** `<tspan>` (номера рядов), **18** path (чаша). Нативных кругов мест нет.

**Решение:** при сиде `injectPbiletSeatsIntoSvg` — вшить круги из `tickets.json` (x,y → place-name/row/place) в подложку pbilet. Sellable = `buildSellableSeatGeodesyFromSvgCircles` (как театр), **без cloud/svgRow**.

| Файл | Роль |
|------|------|
| `hallSeatGeodesyFromSvgCircles.js` | parse / inject / sellable по кругам |
| `seed-luzhniki-football-geodesy.js` | после сида в SVG ~6k кругов |
| `luzhnikiFootballStageMap.js` | `/map` → `svgCircle` если circles ≥ 24 |

**Ограничение:** покрытие = места в `tickets.json` (~6k), не все GetBilet. Остальное — список или `LUZHNIKI_SVG_CIRCLE_FILL_CLOUD=1`.

**Пересид обязателен:** без inject в `svg_markup` в БД фронт не увидит круги.

#### D. Ручная/полуавтоматическая калибровка секторов

- Файл `backend/data/luzhniki-geodesy/sector-calibration.json`: `{ "d121": { "rowAxis": ..., "row1Y": ..., "seat1Left": ... } }` или таблица якорей (ряд 1 место 1 → x,y; ряд 40 место 40 → x,y).
- Инструмент в админке: клик по точке чаши → привязка к офферу.
- Плюсы: 100% для продаваемых секторов. Минусы: трудозатраты, поддержка при смене схемы.

#### E. Взять логику позиционирования с portalbilet / pbilet frontend

- Reverse: как их виджет кладёт sellable на те же 77k точек (если используют тот же layout id).
- Возможен отдельный endpoint или inline JSON в странице события.

#### F. Не рисовать sellable на овале; UX «как у аэрофлота»

- Обзор: только серая чаша + клик по полигону сектора.
- Внутри сектора: **локальная сетка** из `tickets` strict для этого сектора или таблица рядов без привязки к глобальным % (отдельный viewBox сектора).

#### G. GetBilet / pbilet live API на чекаут

- Если у оффера или pbilet session API есть x,y — использовать напрямую, кэш по `repertoireId`.

### Рекомендуемый план (прагматично)

```
1. Сразу (1–2 ч): режим A — strict-only на карте + честный UI для «без координат».
2. Параллельно: B — выбить полный tickets URL (event_source_id + event_date_id) для финала.
3. Если B недоступен: C — осмотр SVG на circle с place; если нет — D для топ-30 секторов с продажами.
4. Заморозить новые эвристики в hallSeatGeodesyFromDots (не добавлять cloudSnap/svgRow без флага).
```

### Файлы (текущая реализация эвристик)

| Файл | Роль |
|------|------|
| `hallSeatGeodesyMatch.js` | strict из layout.seats |
| `hallSeatGeodesyFromDots.js` | цепочка strict → svgRow → cloud → cloudSnap |
| `hallSeatGeodesySectorNative.js` | полосы рядов, ось мест, SVG-Y → band |
| `hallSeatGeodesyFromSvgRows.js` | parse `<tspan>`, калибровка row→Y% |
| `luzhnikiFootballStageMap.js` | `adaptLuzhnikiStageMapForLiveOffers` → sellableSeats |
| `svgNativeSeatLayout.ts` | приоритет sellable с `/map` |

### Диагностика на проде (после любого деплоя)

```bash
curl -sS 'https://biletvsem.com/api/bilet/stage/luzhniki-football/map?repertoireId=REPERTOIRE_ID' | jq '{
  sellable: (.layout_json.sellableSeats | length),
  bySource: (.layout_json.sellableSeats | group_by(.geodesySource) | map({source: .[0].geodesySource, n: length})),
  sample: .layout_json.sellableSeats[0:3],
  geodesy: .layout_json.offerSeatGeodesy
}'
```

Если `bySource` почти весь `cloud`/`cloudSnap` — на карте эвристика, будут скачки. Цель для продакшена: **`strict` ≥ 95%** sellable или явный режим «без точки».

---

### Май 2026 — sellable «уезжали» при идеальной чаше

**Симптом:** серая чаша 77k ок, цветные точки офферов не на местах.

**Фикс:** layout-first (`tickets.json` → `layoutBaseSeats`), на карте только `strict` + `anchor`; dot/dotOnly и grid bbox отключены. Anchor только внутри `[minRow..maxRow]` сектора. Детали — в scheme doc выше.

**Файлы:** `hallSeatGeodesyFromDots.js`, `svgNativeSeatLayout.ts` (`buildLuzhnikiMapSellablePlacements`), `TicketHallInteractiveBlock.tsx`. После деплоя — **пересид** `seed:luzhniki-football-map`.

### Май 2026 — точность svgRow + покрытие всех sellable

**Симптом 1:** ряд 11 на подписи «ряд 1» (A 101 и др.).  
**Причина:** cloud мапил `rowMin` из минимального ряда в офферах, а не с 1.  
**Фикс:** `inferCloudSectorRowRange` — шкала **1 … max(офферы, полосы)**.

**Симптом 2:** после svgRow на карте только часть sellable.  
**Причины:**
- `canCloud`/`canSvgRow` требовали `anchors.length < 2` → сектора с частичным `tickets.json` (D227 и др.) не получали svgRow/cloud.
- Порог `sectorDots >= 24` отсекал мелкие сектора.
- Провал `pickDotNearRowSeat` отбрасывал место целиком.

**Фикс (покрытие без потери точности):**
| Шаг | `geodesySource` | Когда |
|-----|-----------------|--------|
| 1 | `strict` | есть в `tickets.json` |
| 2 | `dot` | частичные якоря + облако |
| 3 | `svgRow` | подпись ряда на SVG pbilet + точка чаши |
| 4 | `cloud` | калибровка без подписи |
| 5 | `cloudSnap` | snap к чаше по Y (svg/cloud), если 3–4 не дали hit |

Дополнительно: `fillMissingSectorDotsFromCloud` (расширенный bbox), margin bbox 0.38, svgRow/cloud **разрешены при частичных якорях**.

**Pbilet full tickets:** повторный fetch — API без `event_source_id`/`event_date_id` по-прежнему ~6k мест; полный JSON недоступен.

**Деплой:** `git pull` + `pm2 restart` (+ `frontend build` для `cloudSnap` в trusted). Пересид не обязателен.

**Файлы:** `hallSeatGeodesyFromDots.js`, `hallSeatGeodesyFromSvgRows.js`, `luzhnikiFootballStageMap.js`, `svgNativeSeatLayout.ts`.

### Май 2026 — sector-native: ряд/место на точках сектора

**Зафиксировано:** на карте отображаются **все** sellable GetBilet (полное покрытие).

**Симптом:** тултип «ряд 38» на визуальном ряду 1 (подписи SVG с противоположной стороны от поля); место 6 не шестая точка слева.

**Правила:**
- Ряд **1** — полоса точек **ближе всего к центру арены** (взгляд с поля).
- Ряд N — `round((N-1)/(maxRow-1)*(bands-1))` по полосам, отсортированным к полю.
- Место **1** — первая точка ряда **слева направо** (`seatLeftAxisFromSector`).
- Не использовать Y подписей SVG напрямую (на A101 давало ряд 11 внизу чаши).

**Код:** `hallSeatGeodesySectorNative.js` — `svgRow` / `cloudSnap` с той же осью мест.

**Деплой:** backend `pm2 restart` + **frontend build** (иначе старые координаты из `layout.seats`).

### Май 2026 — фронт: sellable при пане + приоритет /map

**Симптом 1:** зум в сектор → панорамирование → пропали точки других секторов.  
**Фикс:** `luzhnikiCheckout` → `visibleNativePlacements` без фильтра по `selectedSector`.

**Симптом 2:** backend sector-native задеплоен, на сайте старые Y.  
**Причины:** (1) не был `npm run build` фронта; (2) `layoutJsonForStage` брал контекст без `sellableSeats` с `/map`; (3) `buildLuzhnikiMapSellablePlacements` ставил `layout.seats` **выше** live `sellableSeats`.  
**Фикс:** всегда fetch `/map` для `luzhniki-football`; merge sellable из map; server-first в placements.

**Симптом 3:** инверсия SVG row→Y ставила ряд 11 вниз сектора.  
**Фикс:** `sortSectorRowBandsFromField` + `rowNumToBandIndex` (не Y с `<tspan>`).

---

Страница: [Суперфинал Кубка России — Спартак / Краснодар](https://biletvsem.com/ticket/superfinal-fonbet-kubka-rossii-spartak-krasnodar)  
Эталон UX: [portalbilet — финал Кубка России](https://portalbilet.ru/msk/final-kubka-rossii-po-futbolu)

Ключ схемы в БД: `getbilet_stage_maps.stage_external_id = luzhniki-football`

---

## Задачи от заказчика (хронология)

### 1. Места пропадают на карте при зуме / вообще нет точек

**Симптом:** на чекауте пустая или почти пустая схема; после выбора сектора точек нет.

**Причины (найденные):**

- Фильтр sellable по **названию полигона** (`Категория 2`) vs **код трибуны в GetBilet** (`сектор d227`) → 0 совпадений после клика по зоне.
- Флаги `omitClientSeatCoordinateCloud` + `disableStadiumCanvas` отключали серую чашу (~77k) и canvas.
- `visibleNativePlacements` скрывали все места до выбора сектора.

**Что сделали:**

- Фильтр мест при выбранном секторе — по **bbox path** полигона, не по строке label.
- Вернули portalbilet-визуал: canvas + `uniformHallSeatAppearance`, серая чаша без зума.
- На обзоре снова видны все sellable; при клике по зоне — только места внутри полигона.

**Файлы:** `TicketHallInteractiveBlock.tsx`, `ticketHallMapInteraction.ts`, `luzhnikiFootballStageMap.js`

---

### 2. Правила под стадион Лужники; GetBilet `D230` vs наш `d 230`

**Задача:** отдельные правила; сопоставление секторов GetBilet и подписей на схеме.

**Что сделали:**

- `.cursor/rules/luzhniki-stadium-map.mdc` — правила для агента/разработки.
- `frontend/src/utils/luzhnikiStadiumMap.ts` — флаги `stadiumMapKey`, `luzhnikiStadiumCheckout`.
- `ticketHallSectorNormalize` (фронт + бэкенд): `сектор D230`, `D-218`, `d 230` → ключ `d230`; место `08` = `8`.

---

### 3. Визуал как portalbilet: мелкие точки без зума; секторы цветом только на 100% + hover

**Задача:**

- Серые точки аккуратные, видны сразу (без зума).
- Цветные — доступные к продаже, по ценовой группе.
- Заливка секторов (категорий) **только** при масштабе 100% и наведении; иначе — только места.

**Что сделали:**

- Canvas: `drawBackgroundDots` при `bg.length >= 8000` или `hallBackgroundFromLabeledSeats`.
- CSS `sectorLayerFitOverview` + `sectorPathFitMuted` — полигоны прозрачны, цвет на `:hover`.
- Вернули отображение sellable на обзоре стадиона (не прятать до клика по сектору).

---

### 4. Sellable «не на своём месте» (ряд 32 → кружок у ряда 29)

**Симптом:** tooltip «32 ряд, 21 место», точка визуально у ряда 29; боковые трибуны «летают».

**Причина:** координаты sellable **додумывались** интерполяцией по облаку `allSeatCoordinates` (~77k точек **без** подписи ряд/место). На овале линейная калибровка X/Y ломается.

**Что сделали:**

- **Отключена** интерполяция по `allSeatCoordinates` и экстраполяция рядов.
- Sellable **только** из `layout.seats`: точное совпадение `сектор + ряд + место` → `xPct/yPct` из pbilet (`buildSellableSeatGeodesy`).
- Улучшен lookup ключей (`labeledSeatLookupKeys`, `08`/`8`, `D-218`).

**Файлы:** `hallSeatGeodesyMatch.js`, `hallSeatGeodesyFromDots.js` (обёртка без «dot»-матчинга)

---

### 5. Половина мест из списка не на карте

**Симптом:** в панели сектора 13 мест, на карте ~6 цветных точек.

**Причина (данные, не только UI):**

- В БД `layout.seats` ≈ **6132** места из снимка pbilet `tickets.json` (частичный API-снимок, не весь стадион).
- Пример **Сектор D 218** в `tickets.json`: ряды **19, 21, 23, 29, 31, 33** — рядов **15, 27, 28** в снимке **нет**, хотя они есть в GetBilet.
- Раньше для таких рядов рисовались **ложные** точки (интерполяция) → убрали; в списке остаются, на карте нет.

**Честное правило:** не рисовать место без подписи в геодезии; не врать координатой.

---

### 6. Текущая задача: все точки как места из tickets.json (не безымянное облако)

**Задача:** схема визуально верная; каждая точка на чаше должна быть **аналогом места из tickets.json** (сектор, ряд, место, координаты), а не просто пикселем из `coordinates` без смысла.

**Что сделали (код):**

- Флаг `hallBackgroundFromLabeledSeats: true` в `layout_json` (сид + `adaptLuzhnikiStageMapForLiveOffers`).
- Фронт: `parseBackgroundSeatCoordinates` **сначала** берёт `layout.seats`, потом fallback на `allSeatCoordinates`.
- Серая чаша на canvas = те же координаты, что и в `tickets.json` → `layout.seats`.
- Цветные sellable = подмножество тех же мест, совпавших с оффером GetBilet по ключу.

**Ограничение:** в репозитории `tickets.json` содержит **6132** места / **240** секторов. Это **весь** текущий файл, не 81k. Для полного стадиона нужен **полный** экспорт pbilet tickets + пересид `seed:luzhniki-football-map`.

---

## К чему пришли (архитектура)

```
┌─────────────────────────────────────────────────────────────┐
│  SVG подложка (чаша стадиона, без circle place-name на проде) │
├─────────────────────────────────────────────────────────────┤
│  Canvas: серая чаша = layout.seats (из tickets.json)         │
│          каждая точка = sector + row + seat + xPct/yPct      │
├─────────────────────────────────────────────────────────────┤
│  Canvas/DOM: цветные = sellableSeats (subset + GetBilet)     │
│              только strict match по ключу места              │
├─────────────────────────────────────────────────────────────┤
│  SVG sectorLayer: полигоны зон; цвет только 100% + hover     │
└─────────────────────────────────────────────────────────────┘
```

### Источники данных

| Поле | Источник | Назначение |
|------|----------|------------|
| `layout.seats` | pbilet `tickets.json` → `extractPbiletTicketsSeatGeodesy` | **Подписанные** места (фон + lookup sellable) |
| `allSeatCoordinates` | pbilet `coordinates.json` (~77k `{x,y}`) | Запасной фон; **не** использовать для sellable |
| `sellableSeats` | `buildSellableSeatGeodesy(layout.seats, offers)` | Цветные точки на чекауте |
| `sectorMode.sectors` | path полигонов | Клик по зоне, hover, bbox-фильтр |

### Ключевые флаги `layout_json`

| Флаг | Значение | Смысл |
|------|----------|--------|
| `stadiumMapKey` | `luzhniki-football` | Каноническая схема |
| `uniformHallSeatAppearance` | `true` | Серая чаша + цвет только у sellable |
| `hallBackgroundFromLabeledSeats` | `true` | Фон = `layout.seats`, не 77k cloud |
| `sellableSeatsLabeledOnly` | `true` | Без интерполяции координат |
| `preferLayoutSeatPositions` | `true` | Координаты с бэкенда |
| `omitClientSeatCoordinateCloud` | `false` | Не отключать фон |
| `disableStadiumCanvas` | `false` | Canvas включён |

---

## Основные файлы

| Область | Путь |
|---------|------|
| UI схемы | `frontend/src/components/tickets/TicketHallInteractiveBlock.tsx` |
| Стили | `frontend/src/components/tickets/TicketHallInteractiveBlock.module.css` |
| Правила Лужники (фронт) | `frontend/src/utils/luzhnikiStadiumMap.ts` |
| Нормализация секторов | `frontend/src/utils/ticketHallSectorNormalize.ts` |
| Bbox секторов | `frontend/src/utils/ticketHallMapInteraction.ts` |
| Адаптация под офферы | `backend/services/luzhnikiFootballStageMap.js` |
| Strict sellable | `backend/utils/hallSeatGeodesyMatch.js` |
| Извлечение из pbilet | `backend/utils/luzhnikiPbiletGeodesyExtract.js` |
| Сид геодезии | `backend/scripts/seed-luzhniki-football-geodesy.js` |
| Правила Cursor | `.cursor/rules/luzhniki-stadium-map.mdc` |
| Инструкция сидов | `backend/data/luzhniki-geodesy/README.md` |

---

## Деплой

**Код (фронт + бэкенд):**

```bash
git add -A
git commit -m "fix(luzhniki): фон чаши из layout.seats (tickets.json), worklog"
git push origin main
ssh root@91.229.9.229 "cd /var/www/pokupka-biletov && ./scripts/deploy-via-git.sh main"
```

**Порог сида:** по умолчанию `LUZHNIKI_GEODESY_MIN_SEATS=4000` (частичный `tickets.json` ~6k мест). Для полного стадиона ~81k: `LUZHNIKI_GEODESY_MIN_SEATS=80000`.

**Данные (геодезия на VPS):**

Путь на сервере часто `/var/pokupka-biletov`, не `/var/www/...`.  
`../tickets.json` из `backend/` **не работает** — скрипт резолвит от корня репо и ищет `/var/tickets.json`.

```bash
# локально — скопировать файлы на сервер
scp tickets.json luzhniki.txt root@YOUR_SERVER:/var/pokupka-biletov/

# на сервере
cd /var/pokupka-biletov/backend
LUZHNIKI_PBILET_TICKETS_JSON=/var/pokupka-biletov/tickets.json \
LUZHNIKI_PBILET_COORDINATES_JSON=/var/pokupka-biletov/luzhniki.txt \
npm run seed:luzhniki-football-map
```

Без `../` — относительно корня репо: `LUZHNIKI_PBILET_TICKETS_JSON=tickets.json` (если cwd = корень проекта).

**CORS на проде:** в `backend/.env` добавить  
`CORS_ORIGIN=https://biletvsem.com,https://www.biletvsem.com,http://localhost:5173`  
и `pm2 restart all`. Ошибки в Safari при открытии с **localhost** на прод-API — это ожидаемо; открывайте сайт с `https://biletvsem.com`.

После сида в `layout_json` окажутся актуальные `seats` (все места из файла) и при необходимости `allSeatCoordinates`.

---

## Открытые шаги (если нужно «все» места GetBilet на карте)

1. Получить **полный** `tickets.json` с pbilet (все ряды всех трибун, не только ~6k sellable snapshot).
2. Пересид `luzhniki-football` в прод-БД.
3. Проверить `GET /api/bilet/stage/luzhniki-football/map?repertoireId=...` → `layout.seats.length`, `offerSeatGeodesy.matched` / `totalSellable`.
4. Опционально: встроить в SVG `circle` с `place-name` / `row` / `place` для каждого `layout.seats` (как в `luzhnikiFootballNativeGenerator`) — запасной путь для `svgNative` без canvas.

---

## Метрики для проверки после деплоя

```bash
curl -sS 'https://biletvsem.com/api/bilet/stage/luzhniki-football/map?repertoireId=6a05d17b46a4d000309ecf4e' | jq '{
  seats: (.layout_json.seats | length),
  sellable: (.layout_json.sellableSeats | length),
  labeledBg: .layout_json.hallBackgroundFromLabeledSeats,
  geodesy: .layout_json.offerSeatGeodesy
}'
```

Ожидание: `labeledBg: true`, `sellable` ≤ `seats`, matched sellable близко к числу мест в офферах **которые есть в seats**.

---

*Документ собран по сессии доработки схемы Лужников, май 2026.*
