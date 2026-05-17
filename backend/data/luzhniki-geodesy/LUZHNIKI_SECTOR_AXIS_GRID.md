# Лужники — axisGrid (сетка по осям X/Y сектора)

**Для следующего агента.** Handoff: [LUZHNIKI_NEXT_AGENT_HANDOFF.md](./LUZHNIKI_NEXT_AGENT_HANDOFF.md).

## Эталонный сектор: **A 101** (`a101`)

- В `tickets.json`: **`r: []`** — strict-рядов нет.
- Якоря: `sector-row-anchors.json` → rows **1 / 42** × seats **1 / 4 / 16**.
- На суперфинале есть живые офферы (ряды 11, 28, 32, 35, 38…).
- **Приоритет axisGrid** (`prefersSectorAxisGrid`): sellable **не** через fieldGrid (там ряд 11 уезжал на подпись «ряд 1»).

Второй эталон с прорезью рядов: **B 154** (`b154`) — ряд 17 между 16 и 27.

## Когда нужен

- В `tickets.json` / `layout.seats` **нет ряда** (прорезь или `r: []`), но оффер есть.
- `polarGrid` / `pbiletLerp` / **fieldGrid** дают диагональ или сдвиг ряда.
- Линейный ряд с полным layout: **D124 ряд 10** → `pbiletLerp` (не axisGrid).

## Код

| Файл | Роль |
|------|------|
| `backend/utils/luzhnikiSectorAxisGridPlacement.js` | model, resolve, `prefersSectorAxisGrid`, `SECTOR_AXIS_GRID_PRIORITY_NORMS` |
| `backend/utils/luzhnikiPbiletSellableGeodesy.js` | axisGrid **до** fieldGrid для `a101` / `b154` |
| `backend/data/luzhniki-geodesy/sector-row-anchors.json` | 4 угла сектора |
| `backend/tests/luzhnikiSectorAxisGridPlacement.test.js` | Юнит-тесты |
| `backend/tests/luzhnikiPbiletSellableGeodesy.test.js` | A101 / B154 sellable |

## API (кратко)

```js
import {
  buildSectorAxisGridModel,
  resolveSeatOnSectorAxisGrid,
  resolveSellableOnSectorAxisGrid,
  prefersSectorAxisGrid,
} from '../utils/luzhnikiSectorAxisGridPlacement.js';

prefersSectorAxisGrid('a101', ticketsPayload); // true

const model = buildSectorAxisGridModel(anchors, 'a101');
const pt = resolveSeatOnSectorAxisGrid(model, 11, 7, { min: 7, max: 9 });

const hit = resolveSellableOnSectorAxisGrid({
  anchors,
  sectorLabel: 'a101',
  row: 11,
  seat: 7,
  seatRangeInRow: { min: 7, max: 9 },
});
// → { xPct, yPct, geodesySource: 'axisGrid' }
```

**Прорезь рядов (B154):** ряд между блоками → `rowLo + (target − rowLo) * rowStep`, не lerp к дальнему блоку.

## Порядок в sellable

1. strict из tickets  
2. для **`a101` / `b154`** (и `r:[]` + 4 manual anchors): **axisGrid сразу**, fieldGrid пропускается  
3. иначе layout-anchors: fieldGrid → axisGrid если ряда нет → pbiletLerp → svgRow → polarGrid  
4. `mode: none`: axisGrid из manual anchors  

Счётчик: `layout_json.offerSeatGeodesy.axisGridMatched`.

## Проверка A101

```bash
cd backend && node --test tests/luzhnikiPbiletSellableGeodesy.test.js

curl -sS ".../map?repertoireId=6a05d17b46a4d000309ecf4e" \
  | jq '[.layout_json.sellableSeats[]|select(.sector|test("101";"i"))|{row,seat,src:.geodesySource}]'
```

Ожидание: все точки A101 с `geodesySource` содержащим `axisGrid`.

## TODO

- 8 угловых якорей в `sector-row-anchors.json`.
- Дуга трибуны: axisGrid = прямая линия ряда в % viewBox.
