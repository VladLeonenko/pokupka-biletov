# Лужники — интерактивная схема зала (worklog)

**Продажа через схему (без 81k pbilet):** см. [LUZHNIKI_MAP_SELL_VIA_SCHEME.md](./LUZHNIKI_MAP_SELL_VIA_SCHEME.md)

**Векторная подложка вручную (viewBox 11413×9676, Method Draw / Inkscape):** [LUZHNIKI_SVG_VIEWBOX_COORDINATE_PLAN.md](./LUZHNIKI_SVG_VIEWBOX_COORDINATE_PLAN.md) — **основной путь**, без strict-only.

---

## HANDOFF для второго агента (17.05.2026, ~9ч без стабильного прода)

### Цели заказчика (все четыре обязательны)

| # | Требование | Статус на проде |
|---|------------|-----------------|
| 1 | **Визуал** — серая чаша как сейчас (`luzhniki.txt` ~77k), не ломать | Часто ок; не подменять чашу `layout.seats` grid |
| 2 | **Каждое sellable GetBilet** — цветная точка **на своей** серой точке (сектор+ряд+место) | **Не ок** (~2% на карте, ряды «прыгают», 35 ряд у подписи «1») |
| 3 | **Без полного `tickets.json`** (~81k) — API pbilet не отдаёт | Жёсткое ограничение |
| 4 | **Мобилка** — убрать **вторую карту поверх нашей** (дубль подложки) | **Не ок** у пользователя |

### Единственный канон геометрии (не путать с цифрами на SVG pbilet)

Взгляд **с зелёного поля** (центр схемы) на сектор:

- **API ряд N** = N-я полоса точек **от поля к дальнему краю** сектора (`sortSectorRowBandsFromField` → `rowNumToBandIndex`).
- **НЕ** привязывать API row к цифре `<tspan>N</tspan>` на SVG — на A101/B156 подпись «1» часто на **противоположном** крае от поля → симптом «35 ряд на первом ряду схемы».
- **Место N** = N-я точка в полосе вдоль `seatLeftAxisFromSector` (не всегда «слева на экране»).
- **Проход между блоками** — не ряд: точки в центральном зазоре отфильтровать (`filterCentralAisleDots`), кластер только `clusterDotsByRowAlongAxis` (не `clusterDotsByRow` по глобальной Y).

**Устарело / отменить в коде и в голове:** `getRowLabelYPctInSector`, `pickSectorRowLabelAisle` как источник номера API-ряда, `labelSectorBandsWithSvgRowNumbers` для sellable.

### Почему «не работает» после многих итераций

1. **Данные:** `tickets.json` в репо ≈ **6132** мест с x,y; у B147, D121 и др. `r: []` — strict = 0. Остальное только эвристика grid/cloud.
2. **Эвристика ≠ точность:** 20–35 полос на 35+ рядов → ряды 19/20/35 сливаются; на проде без **пересида** в БД остаётся старый `layout.seats` / старый `/map`.
3. **Два пайплайна:** `buildSellableSeatGeodesyLuzhniki` (grid) и `buildSellableSeatGeodesyWithDots` (svgRow/cloud) — фронт доверяет `geodesySource` из `TRUSTED_SERVER_GEODESY` в `svgNativeSeatLayout.ts`; если с `/map` приходит мусор — рисуется мусор.
4. **Мобильный дубль:** `stadiumCanvasEnabled` рисует SVG в **canvas** + в DOM остаётся `svgLayer` (класс `svgLayerCanvasBacked { opacity: 0 }`). На части iOS/Safari при гонке загрузки видны **оба** слоя или смещённые transform → «карта поверх карты».
5. **Локальные фиксы field-based** уже в `hallSeatGeodesySectorNative.js` / `hallSeatGeodesyLuzhnikiGrid.js` (main), но **бесполезны без seed + deploy + build фронта**.

### Решение (прагматичное, без полного tickets)

#### Слой A — визуал (не трогать)

- Сид: `layout_json.allSeatCoordinates` ← массив из `luzhniki.txt` / `coordinates.coordinates` (~77415).
- Фронт: `parseBackgroundSeatCoordinates` для Лужников при `cloud.length >= 5000` **всегда** берёт `allSeatCoordinates` (см. `TicketHallInteractiveBlock.tsx`).
- В `luzhnikiFootballStageMap.js` **не ставить** `hallBackgroundFromLabeledSeats: true` если это заставит рисовать 133k grid-мест вместо чаши — для прода лучше **`hallBackgroundFromLabeledSeats: false`** (или убрать флаг).
- Canvas: серые точки только из `backgroundSeatCoordinates`, sellable — отдельным слоем.

#### Слой B — sellable на правильной точке (без 81k tickets)

**Вариант B1 (минимум кода, честный UX):**

- На карте только места с **`geodesySource: strict`** (есть x,y в частичном `tickets.json`).
- Остальные офферы — **только список слева** + текст «на схеме недоступно».
- `adaptLuzhnikiStageMapForLiveOffers`: **не** вызывать grid-fallback для unmatched; `sellableSeatsLabeledOnly: true`.
- Покрытие ~6k/все sellable, но **без лжи** на карте.

**Вариант B2 (нужно покрытие всех sellable — основной запрос заказчика):**

Комбинация трёх источников по приоритету:

1. `strict` — из `tickets.json` / `layout.seats` где есть sector+row+seat+xPct+yPct.
2. **`fieldGrid`** — `resolveOfferSeatSectorNativeLayout` + `buildStadiumLayoutSeatsFromDotGrid` (только от поля, см. канон выше); переименовать `geodesySource` с `svgRow`/`grid` для ясности.
3. **Калибровка сектора** — файл `backend/data/luzhniki-geodesy/sector-row-anchors.json` (ручные или полуавтоматические якоря):

```json
{
  "a101": {
    "anchors": [
      { "row": 1, "seat": 1, "xPct": 21.2, "yPct": 78.5 },
      { "row": 35, "seat": 30, "xPct": 20.1, "yPct": 85.2 }
    ]
  },
  "b156": { "anchors": [ ... ] }
}
```

Интерполяция ряда/места **внутри сектора** между 2–4 якорями — стабильнее, чем глобальная формула на весь стадион. Заполнять якоря:

- админ-инструмент: клик по серой точке → привязать к выбранному офферу (сохранить JSON);
- или выгрузка **по одному сектору** из pbilet (не весь stadium), если API отдаёт `r[]` для сектора.

**Отключить на проде:** `cloud`, `cloudSnap`, `dot`, `anchor` в `buildSellableSeatGeodesyWithDots` для `luzhniki-football`.

#### Слой C — мобилка: убрать дубль карты

Проверить на iPhone/Android в DevTools / remote debugging:

1. **Canvas + DOM SVG:** в `TicketHallInteractiveBlock.module.css` для `.svgLayerCanvasBacked` добавить не только `opacity: 0`, но `visibility: hidden; height: 0; overflow: hidden` **или** на coarse pointer (`isCoarsePointerDevice`) ставить `disableStadiumCanvas: true` в `layout_json` из `luzhnikiFootballStageMap.js`.
2. **Два инстанса карты:** на странице inline `primaryHallMap` + `Dialog` fullscreen — при открытии диалога inline можно `display: none` (опционально).
3. **Фоновый SVG-слой точек** (`backgroundSeatLayer`, если `<= 4000` точек) **+** canvas — не должны показываться вместе с полной чашой на canvas; при `stadiumCanvasEnabled` не рисовать `backgroundSeatLayer`.
4. **Внешний план:** `externalPlanUrl` / iframe pbilet — если где-то подключён, отключить для `luzhniki-football`.

Файлы: `TicketHallInteractiveBlock.tsx` (766–821, 1492–1507), `TicketHallInteractiveBlock.module.css` (136–233), `TicketCheckoutPage.tsx` (map Dialog).

#### Слой D — фронт: только доверенные координаты

`frontend/src/utils/svgNativeSeatLayout.ts`:

```ts
const TRUSTED_SERVER_GEODESY = new Set(['strict', 'svgCircle', 'fieldGrid', 'grid']);
```

- `buildLuzhnikiMapSellablePlacements`: live `sellableSeats` с `/map` **строго выше** `layout.seats` из контекста (уже так; проверить что `/map` всегда fetch для `luzhniki-football`).
- `visibleNativePlacements`: цветные **только в выбранном секторе** (`luzhnikiCheckout && selectedSectorSummary`) — иначе на мобилке «колонны» через стадион.
- Hitbox ≈ диаметр canvas-точки (`luzhnikiSeatHitDiameterPct`).

### План работ для агента 2 (порядок)

```
□ 1. git pull; убедиться что field-based код в hallSeatGeodesySectorNative.js (resolveOfferSeatSectorNativeLayout без SVG-Y).
□ 2. backend/tests — npm test (82 теста).
□ 3. seed на VPS с luzhniki.txt + tickets.json (частичный); в логе: layout seats grid ~130k, offerSeatGeodesy matched/total.
□ 4. curl /api/bilet/stage/luzhniki-football/map?repertoireId=… → jq offerSeatGeodesy, group_by geodesySource.
□ 5. Если matched << totalSellable — включить B1 (strict-only) ИЛИ стартовать sector-row-anchors.json для топ-20 секторов по продажам.
□ 6. Фронт: фикс мобильного дубля (disableStadiumCanvas на touch ИЛИ visibility hidden).
□ 7. npm run build frontend; deploy-via-git.sh main.
□ 8. Приёмка: A101 ряд 1 ближе к полю чем 35; B156 ряд 20 ниже/дальше 19; нет ряда точек в проходе; мобилка — одна подложка.
```

### Деплой VPS (путь `/var/pokupka-biletov`)

```bash
cd /var/pokupka-biletov && git pull origin main
cd backend
LUZHNIKI_PBILET_TICKETS_JSON=/var/pokupka-biletov/tickets.json \
LUZHNIKI_PBILET_COORDINATES_JSON=/var/pokupka-biletov/luzhniki.txt \
npm run seed:luzhniki-football-map
cd ../frontend && npm ci && npm run build && chown -R www-data:www-data dist
cd .. && ./scripts/deploy-via-git.sh main
```

**Без seed после pull координаты в PostgreSQL не меняются** — это частая причина «на проде как было».

### Диагностика (скопировать в тикет)

```bash
# API
curl -sS 'https://biletvsem.com/api/bilet/stage/luzhniki-football/map?repertoireId=REPERTOIRE_ID' | jq '{
  sellable: (.layout_json.sellableSeats | length),
  bySource: (.layout_json.sellableSeats | group_by(.geodesySource) | map({s:.[0].geodesySource,n:length})),
  geodesy: .layout_json.offerSeatGeodesy,
  cloud: (.layout_json.allSeatCoordinates | length),
  layoutSeats: (.layout_json.seats | length)
}'

# Локально: один сектор
cd backend && node --input-type=module -e "
import fs from 'fs';
import { extractPbiletCoordinatesSeatDots, extractPbiletTicketSectorPaths } from './utils/luzhnikiPbiletGeodesyExtract.js';
import { buildSectorDotIndex } from './utils/hallSeatGeodesyFromDots.js';
import { resolveOfferSeatSectorNativeLayout, computeFieldCenterPct } from './utils/hallSeatGeodesySectorNative.js';
import { parseSvgHallRowLabels } from './utils/hallSeatGeodesyFromSvgRows.js';
import { normalizeSectorLabel } from './utils/ticketHallSectorNormalize.js';
const t=JSON.parse(fs.readFileSync('../tickets.json'));
const l=JSON.parse(fs.readFileSync('../luzhniki.txt'));
const sec=t.sectors.find(s=>/a101/i.test(s.i));
const coords=JSON.parse(fs.readFileSync('../luzhniki-pbilet-coordinates-fetched.json'));
const svg=await(await fetch(coords.bg)).text();
const cloud=extractPbiletCoordinatesSeatDots(l,11413,9676);
const dots=buildSectorDotIndex(cloud,extractPbiletTicketSectorPaths(t),11413,9676).get(normalizeSectorLabel('a101'));
const field=computeFieldCenterPct(cloud);
const labels=parseSvgHallRowLabels(svg,11413,9676);
for (const r of [1,11,19,20,35]) {
  const p=resolveOfferSeatSectorNativeLayout(r,5,dots,sec.o,labels,11413,9676,field,40);
  console.log('row',r,'y',p?.yPct?.toFixed(2));
}
"
# Ожидание: y(1) < y(11) < y(35) (если поле «выше» по Y) или монотонно по dist до field
```

### Критерии «задача закрыта»

- [ ] Суперфинал 24.05.2026 18:00: **≥ 90%** sellable сеанса имеют точку на карте **или** явный UI «только в списке» (если сознательно strict-only).
- [ ] Ручная проверка **A101, B156, B147**: тултип ряд/место совпадает с положением на серой точке; нет «20 ряд выше 19».
- [ ] Нет горизонтального «ряда» точек в вертикальном проходе.
- [ ] iPhone: **одна** подложка стадиона, без наложения второй схемы.
- [ ] Серая чаша визуально как до правок (77k, плотная).

### Что НЕ делать (потолок потраченного времени)

- ❌ Очередной тюнинг `eps` / `margin` без новых якорей или strict-данных.
- ❌ Снова привязывать API row к `<tspan>` на SVG как к истине.
- ❌ Ждать полный `tickets.json` с pbilet — не выгрузить; не блокировать релиз.
- ❌ Рисовать все sellable через `cloudSnap` «куда попало» ради 100% покрытия.

### Ключевые файлы

| Область | Файл |
|---------|------|
| Канон ряд/место | `backend/utils/hallSeatGeodesySectorNative.js` |
| Grid + sellable lookup | `backend/utils/hallSeatGeodesyLuzhnikiGrid.js` |
| Live `/map` | `backend/services/luzhnikiFootballStageMap.js` |
| Сид | `backend/scripts/seed-luzhniki-football-geodesy.js` |
| Старая цепочка cloud/svgRow | `backend/utils/hallSeatGeodesyFromDots.js` — **отключить для luzhniki** |
| Фронт placements | `frontend/src/utils/svgNativeSeatLayout.ts` |
| UI карта | `frontend/src/components/tickets/TicketHallInteractiveBlock.tsx` |
| Чекаут | `frontend/src/pages/public/TicketCheckoutPage.tsx` |

---

## 17.05.2026 — field-based ряды (исправление SVG-путаницы) + мобильный оверлей

### Симптомы (репорт заказчика)
1. **~2%** sellable видно на карте после деплоя.
2. **Проход:** горизонтальный «ряд» точек между блоками (кластер по Y).
3. **B156:** ряд 20 визуально **выше** 19; фиолетовые точки не по порядку рядов.
4. **A101:** на подписи «1» на схеме — тултип **35 ряд** (привязка к SVG, а не к полю).

### Канон (актуальный, см. HANDOFF выше)
- **Ряд N от API** = N-я полоса **от зелёного поля**, не цифра на SVG.
- **Места** вдоль `seatLeftAxisFromSector`.

### Код (в main, проверить на VPS после seed)
| Модуль | Изменение |
|--------|-----------|
| `hallSeatGeodesySectorNative.js` | `filterCentralAisleDots`, adaptive eps, `rowNumToBandIndex` only |
| `hallSeatGeodesyLuzhnikiGrid.js` | grid без `getRowLabelYPctInSector` / aisle loop |
| `hallSeatGeodesyFromDots.js` | `buildSectorDotIndex` margin 0.24 |
| `TicketHallInteractiveBlock.tsx` | sellable только в выбранном секторе |

### Мобилка (ещё не закрыто)
- Дубль: canvas + `svgLayer` — см. HANDOFF слой C.

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
