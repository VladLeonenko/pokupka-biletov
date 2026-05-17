# Лужники — продажа через схему (без полного pbilet tickets)

> **Handoff агенту 2:** полный план, мобилка, критерии приёмки — [LUZHNIKI_STADIUM_MAP_WORKLOG.md](./LUZHNIKI_STADIUM_MAP_WORKLOG.md) (блок **HANDOFF**).

Цель: **sellable GetBilet на карте в правильных местах**, удобно с **мобилки**. Визуал: **`luzhniki.txt`** (77k серая чаша) + **`tickets.json`** (геодезия, частичный ~6k strict).

## Данные

| Файл | Роль |
|------|------|
| `luzhniki.txt` | `coordinates` → `layout_json.allSeatCoordinates` (~77415 точек, серая чаша) |
| `tickets.json` | `sectors` + частичные `r[].s[]` (~6132) → seed `layout.seats` (эталонные x/y) |
| GetBilet live | `sellableSeats` на API карты после сида |

Полный `tickets.json` на 81k pbilet **не отдаёт** для сеанса — лимит API.

## Визуал (зафиксировано, май 2026)

- Canvas: **`allSeatCoordinates`** из luzhniki.txt — полная серая чаша.
- Цветные точки: **все** sellable GetBilet на карте — **зафиксировано как истина** (полное покрытие офферов).
- Мобилка: bottom sheet, крупные touch-targets, зум с учётом панели.

## Нативная раскладка ряд/место в секторе (май 2026)

Серая геометрия сектора (`sectorPath` + облако точек) **идеальна**. Подпись оффера (ряд/место) мапится на точки так:

| Правило | Смысл |
|---------|--------|
| **Ряд 1 (API)** | Ближе всего к **зелёному полю** (центр схемы), не цифра «1» на SVG pbilet |
| **Ряд N** | `rowNumToBandIndex(N, maxRow, bandCount)` по полосам `sortSectorRowBandsFromField` |
| **Место N** | N-я точка в полосе вдоль `seatLeftAxisFromSector` (не всегда слева на экране) |
| **Подписи `<tspan>`** | Только ориентир для `maxRow`, **не** координата API-ряда |

Реализация: `backend/utils/hallSeatGeodesySectorNative.js` + `hallSeatGeodesyLuzhnikiGrid.js`  
**Прод:** `strict` → `fieldGrid` (grid). **Не использовать** привязку ряда к Y подписи SVG. `cloud`/`cloudSnap` — выключить для luzhniki-football (см. worklog HANDOFF).

**Не меняем:** отрисовку серой чаши, только координаты цветных sellable.

## Проблема: цветные точки «уезжали»

Причины (все давали координаты «куда-то в сектор», не на место):

1. **Экстраполяция рядов** за пределы известных якорей в `hallSeatGeodesyFromDots.js`.
2. **dot / dotOnly** — привязка к облаку 77k точек овала без подписи места.
3. **Grid на фронте** — `buildSellableGeodesyPlacementsWithSectorGridFallback`: сетка в bbox полигона сектора.
4. **anchor** между разреженными рядами в `tickets.json` — X/Y «между» якорями, но не совпадают с реальной геометрией ряда.
5. **Секторы с `r: []` в tickets.json** (пример: **Сектор B 147**, 814 мест в `all`, 0 подписанных рядов) — единственный источник координат был **dotOnly**: ряды мапились на полосы облака **линейно по min/max ряда из офферов**, часто с **одинаковым Y** для разных рядов (ряд 11 и ряд 3 в одной полосе → «ряд 11 место 6» визуально на «ряд 3 место 1»).
6. **Старые `sellableSeats` без `geodesySource`** на фронте считались доверенными и тянули dot/anchor с прошлого сида.

Визуал чаши при этом был верным — ломались только sellable-маркеры.

### Диагностика B 147 (май 2026)

```bash
cd backend
node -e "
import fs from 'fs';
import { extractPbiletTicketsSeatGeodesy } from './utils/luzhnikiPbiletGeodesyExtract.js';
const t=JSON.parse(fs.readFileSync('../tickets.json','utf8'));
const seats=extractPbiletTicketsSeatGeodesy(t,11413,9676);
console.log('B147 labeled seats:', seats.filter(s=>/b147/i.test(s.sector)).length);
const sec=t.sectors.find(s=>s.i==='Сектор B 147');
console.log('B147 r[] length:', sec?.r?.length ?? 0, 'all:', sec?.all);
"
# B147 labeled seats: 0 , r[] length: 0
```

Strict-координаты для секторов **с** `r[].s[]` совпадают с облаком `luzhniki.txt` (расстояние до ближайшей точки ≈ 0). Проблема не в двух системах координат, а в **отсутствии подписи** + эвристиках.

## Политика координат (текущая, май 2026)

**Серая чаша не меняется:** `allSeatCoordinates` из `luzhniki.txt` — как сейчас на UI.

| Слой | Источник | На карте |
|------|----------|----------|
| 1 | `sellableSeats` с API `/map` (`adaptLuzhniki…`) | **Приоритет на фронте** |
| 2 | `layout.seats` / strict из tickets.json | Fallback, если нет live sellable |
| 3 | `geodesySource: strict` | Да |
| 3 | `geodesySource: svgRow` | Да — sector-native: ряд 1 у поля, места слева→направо |
| 4 | `geodesySource: cloud` | Да — fallback: точка на серой точке + калибровка ориентации |
| 5 | `geodesySource: dot` | Да — частичный tickets + облако |
| 6 | `geodesySource: cloudSnap` | Да — **все** оставшиеся sellable с точкой на чаше |
| 7 | `geodesySource: anchor` | **Нет** (только env) |
| 8 | `dotOnly` / без `geodesySource` | **Нет** |
| 9 | Grid в bbox | **Нет** |

### `svgRow` / sector-native (май 2026)

1. `parseSvgHallRowLabels` — ~4900 `<tspan>` на `coordinates.bg`.
2. `buildSectorSvgRowAisles` — подписи в bbox сектора.
3. `sortSectorRowBandsFromField` — кластер точек → полосы, сортировка по близости к центру арены.
4. Ряд N → полоса `round((N-1)/(maxRow-1)*(bands-1))`; место M → M-я точка слева по оси «с поля».

Файлы: `hallSeatGeodesySectorNative.js`, `hallSeatGeodesyFromSvgRows.js`.

### `cloud` — fallback без подписи ряда на SVG

1. Точки сектора из `allSeatCoordinates` (то же облако, что серая чаша).
2. Кластер в полосы рядов (`clusterDotsByRow`).
3. **Ориентация** ряд↑Y и место↑X — от **ближайшего подписанного сектора той же трибуны** (`buildLabeledSectorOrientationIndex`, для B 147 — обычно B 258).
4. Номер ряда → полоса по шкале **1 … max(офферы, число полос)** — не `min` из офферов (иначе ряд 11 оказывался на подписи «ряд 1» на SVG).
5. Номер места → позиция в полосе по **min/max мест в этом ряду** из офферов.
6. Финал: `pickDotNearRowSeat` — координаты строго на точке чаши.

Проверка B 147 (3 оффера ряды 3/11/20): ΔY(11 vs 3) ≈ **2.07%** (раньше dotOnly давал **0**).

**Фронт:** `buildLuzhnikiMapSellablePlacements` — сначала `sellableSeats` с бэка, потом `layout.seats`.

## Поток данных (end-to-end)

```
GetBilet offers (repertoire)
    → GET /api/bilet/stage/luzhniki-football/map?repertoireId=…
    → adaptLuzhnikiStageMapForLiveOffers(row, offerRows)
    → buildSellableSeatGeodesyWithDots( layout.seats, allSeatCoordinates, sectorPaths, offers, svg_markup )
         strict → svgRow (sector-native) → cloud → cloudSnap
    → layout_json.sellableSeats[]  { sector, row, seat, xPct, yPct, geodesySource }
    → TicketCheckoutPage: merge map + context (sellable из /map)
    → buildLuzhnikiMapSellablePlacements(sellable first, layout.seats fallback)
    → TicketHallInteractiveBlock: все sellable на карте при пане (luzhnikiCheckout)
```

### sector-native (алгоритм)

1. `buildSectorDotIndex` — точки чаши в bbox сектора (`allSeatCoordinates`).
2. `clusterDotsByRow` → полосы.
3. `sortSectorRowBandsFromField` — сортировка полос **к центру арены** (больше dot·(field−center) = ближе к полю = ряд 1).
4. `maxRow` — max номер ряда из `<tspan>` в bbox сектора (`coordinates.bg`).
5. `rowIdx = round((rowNum−1)/(maxRow−1)·(bands−1))`.
6. `seatLeftAxisFromSector` — слева направо с поля; место M = M-я точка в полосе.

**A101 пример:** ряд 11 место 6 → y≈**79.7** (не верхний клин y≈76 и не низ y≈86).

### UI: панорамирование при зуме

Раньше при выборе сектора `visibleNativePlacements` фильтровался по bbox — при пане виден только выбранный сектор.  
**Сейчас:** при `luzhnikiCheckout` на карте **всегда все** sellable; панель слева — офферы выбранного сектора.

### Частые причины «деплой backend, на сайте старое»

| Причина | Решение |
|---------|---------|
| Не собран **frontend** | `cd frontend && npm ci && npm run build` на VPS |
| Контекст страницы без `/map` | Для `luzhniki-football` всегда fetch `/map?repertoireId=` |
| Приоритет `layout.seats` над `sellableSeats` | Исправлено: server sellable первым |
| Кэш браузера | Hard refresh |

## Сид на VPS (обязателен после смены политики)

```bash
cd /var/pokupka-biletov/backend
LUZHNIKI_PBILET_TICKETS_JSON=/var/pokupka-biletov/tickets.json \
LUZHNIKI_PBILET_COORDINATES_JSON=/var/pokupka-biletov/luzhniki.txt \
npm run seed:luzhniki-football-map
pm2 restart all --update-env
```

Убедиться, что **не** выставлены `LUZHNIKI_ENABLE_DOT_GEODESY=1` / `LUZHNIKI_ENABLE_ANCHOR_GEODESY=1` в pm2/env.

## Проверка геодезии

```bash
cd backend
node scripts/verify-offer-seat-geodesy.js 6a05d17b46a4d000309ecf4e
```

Ожидание: `strictMatched` + `cloudMatched`; `anchorInterpolated: 0` без env.

## Проверка pbilet API

```bash
cd backend
PBILET_LAYOUT_ID=2564 npm run fetch:pbilet-luzhniki
```

## Деплой

```bash
# локально
git add -A && git status
git commit -m "fix(luzhniki): sellable только strict, без dot/anchor на карте"
git push origin main

# VPS (backend + frontend обязательны для координат sellable)
cd /var/pokupka-biletov && git pull
cd backend && npm ci && pm2 restart all --update-env
cd ../frontend && npm ci && npm run build && chown -R www-data:www-data dist
# пересид только если меняли luzhniki.txt / tickets.json в репо:
# LUZHNIKI_PBILET_TICKETS_JSON=... LUZHNIKI_PBILET_COORDINATES_JSON=... npm run seed:luzhniki-football-map
```

## Ключевые файлы

- `backend/utils/hallSeatGeodesySectorNative.js` — ряд 1 у поля, места слева→направо
- `backend/utils/hallSeatGeodesyFromDots.js` — strict + svgRow/cloud/cloudSnap
- `backend/utils/hallSeatGeodesyMatch.js` — `geodesySource: strict`
- `backend/services/luzhnikiFootballStageMap.js` — `adaptLuzhnikiStageMapForLiveOffers`
- `frontend/src/utils/svgNativeSeatLayout.ts` — `buildLuzhnikiMapSellablePlacements`
- `frontend/src/components/tickets/TicketHallInteractiveBlock.tsx` + `.module.css`
- `backend/scripts/fetch-pbilet-luzhniki-tickets.js`

## Долгосрочно

1. Полный pbilet tickets URL из Network → `fetch:pbilet-luzhniki` — если появится >6k подписанных мест (в т.ч. `r[]` для B 147), strict-покрытие вырастет без эвристик.
2. Не включать dot/anchor на проде без отдельной калибровки по секторам с пустым `r: []`.

## Журнал важных решений

| Дата | Что сделали | Зачем |
|------|-------------|--------|
| май 2026 | Серая чаша = `allSeatCoordinates`, sellable = tickets strict | Визуал portalbilet + точные подписи |
| май 2026 | Убрали grid/dot на фронте | Точки не «уезжали» в bbox |
| май 2026 | **`cloud`** — sellable на точках чаши с калибровкой ориентации от соседнего сектора | B 147 и др. с `r:[]` снова на карте; серая чаша без изменений |
| май 2026 | `inferCloudSectorRowRange`: ряды **с 1**, не с min оффера | A 101: ряд 11 больше не на подписи «ряд 1» |
| май 2026 | **`svgRow`** — Y ряда из `<tspan>` подложки pbilet | A 101 / все с `r:[]`: совпадение с напечатанными рядами на схеме |
| май 2026 | **`cloudSnap`** + снят блокировки `anchors<2` + fillMissingSectorDots | На карте **все** sellable из GetBilet — **оставляем за истину** |
| май 2026 | **sector-native** — ряд 1 у поля, места 1…N слева направо с поля | Тултип «ряд 38» на визуальном ряду 38, не на «ряд 1» сбоку |
| май 2026 | ~~strict-only~~ — откатили: убирал цветные точки, визуал трогать нельзя | — |
| май 2026 | Ось мест Y-down, maxRow сектора, ряд по SVG-Y | Частично; на проде точки всё ещё скачут — см. worklog «эвристики нестабильны» |
| май 2026 | **Вывод:** нужен strict / полный tickets / калибровка, не новые формулы cloud | [LUZHNIKI_STADIUM_MAP_WORKLOG.md](./LUZHNIKI_STADIUM_MAP_WORKLOG.md) § «кардинальные альтернативы» |
