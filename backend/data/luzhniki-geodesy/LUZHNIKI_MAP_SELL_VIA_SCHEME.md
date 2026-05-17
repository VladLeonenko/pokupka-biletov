# Лужники — продажа через схему (без полного pbilet tickets)

Цель: **sellable GetBilet на карте в правильных местах**, удобно с **мобилки**. Визуал: **`luzhniki.txt`** (77k серая чаша) + **`tickets.json`** (геодезия).

## Данные

| Файл | Роль |
|------|------|
| `luzhniki.txt` | `coordinates` → `layout_json.allSeatCoordinates` (~77415 точек, серая чаша) |
| `tickets.json` | `sectors` + частичные `r[].s[]` (~6132) → seed `layout.seats` (эталонные x/y) |
| GetBilet live | `sellableSeats` на API карты после сида |

Полный `tickets.json` на 81k pbilet **не отдаёт** для сеанса — лимит API.

## Визуал (зафиксировано, май 2026)

- Canvas: **`allSeatCoordinates`** из luzhniki.txt — полная серая чаша.
- Цветные точки: только офферы GetBilet с **доверенной** геодезией.
- Мобилка: bottom sheet, крупные touch-targets, зум с учётом панели.

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
| 1 | `layout.seats` / `layoutBaseSeats` (tickets.json) | Да, приоритет |
| 2 | `geodesySource: strict` | Да |
| 3 | `geodesySource: svgRow` | Да — **приоритет** для секторов без r[]: Y ряда с подписи на SVG pbilet |
| 4 | `geodesySource: cloud` | Да — fallback: точка на серой точке + калибровка ориентации |
| 5 | `geodesySource: dot` | Да — частичный tickets + облако |
| 6 | `geodesySource: cloudSnap` | Да — **все** оставшиеся sellable с точкой на чаше |
| 7 | `geodesySource: anchor` | **Нет** (только env) |
| 8 | `dotOnly` / без `geodesySource` | **Нет** |
| 9 | Grid в bbox | **Нет** |

### `svgRow` — подписи рядов на подложке pbilet (май 2026)

В `coordinates.bg` (SVG ~1MB) ~**4900** `<tspan>11</tspan>` и т.д. с координатами в системе зала.

1. Парсим все номера рядов → `parseSvgHallRowLabels(svg_markup)`.
2. В bbox сектора — «айлы» подписей (несколько колонок рядов).
3. Для оффера «ряд 11» берём **Y с подписи 11** на SVG (не индекс полосы).
4. Ближайшая полоса точек `luzhniki.txt` + место по X в ряду.

Файл: `hallSeatGeodesyFromSvgRows.js`. Нужен `svg_markup` в `getbilet_stage_maps` (уже есть после сида).

### `cloud` — fallback без подписи ряда на SVG

1. Точки сектора из `allSeatCoordinates` (то же облако, что серая чаша).
2. Кластер в полосы рядов (`clusterDotsByRow`).
3. **Ориентация** ряд↑Y и место↑X — от **ближайшего подписанного сектора той же трибуны** (`buildLabeledSectorOrientationIndex`, для B 147 — обычно B 258).
4. Номер ряда → полоса по шкале **1 … max(офферы, число полос)** — не `min` из офферов (иначе ряд 11 оказывался на подписи «ряд 1» на SVG).
5. Номер места → позиция в полосе по **min/max мест в этом ряду** из офферов.
6. Финал: `pickDotNearRowSeat` — координаты строго на точке чаши.

Проверка B 147 (3 оффера ряды 3/11/20): ΔY(11 vs 3) ≈ **2.07%** (раньше dotOnly давал **0**).

**Фронт:** `strict` + `cloud` + `dot` в `buildLuzhnikiMapSellablePlacements`.

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

# VPS
cd /var/pokupka-biletov && git pull
cd backend && npm ci
LUZHNIKI_PBILET_TICKETS_JSON=/var/pokupka-biletov/tickets.json \
LUZHNIKI_PBILET_COORDINATES_JSON=/var/pokupka-biletov/luzhniki.txt \
npm run seed:luzhniki-football-map
cd ../frontend && npm ci && npm run build
pm2 restart all --update-env
```

## Ключевые файлы

- `backend/utils/hallSeatGeodesyFromDots.js` — strict-only по умолчанию; anchor/dot за env
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
| май 2026 | **`cloudSnap`** + снят блокировки `anchors<2` + fillMissingSectorDots | На карте **все** sellable из GetBilet, точность сохраняем через svgRow |
| май 2026 | ~~strict-only~~ — откатили: убирал цветные точки, визуал трогать нельзя | — |
