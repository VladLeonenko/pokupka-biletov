# Лужники — геодезия sellable по секторам

Handoff: [LUZHNIKI_NEXT_AGENT_HANDOFF.md](./LUZHNIKI_NEXT_AGENT_HANDOFF.md).

## Два режима (не путать)

| Тип сектора | Модуль | Пример |
|-------------|--------|--------|
| **Прямоугольный**, прорезь рядов | `luzhnikiSectorAxisGridPlacement.js` — **axisGrid** (линия ряда) | **B154** р.17 между 16 и 27 |
| **Угловой**, радиальные ряды | `luzhnikiSectorPolarGrid.js` — **radialGrid** (4 угла + `rowCurve`) | **A101** |

**A101 — не эталон axisGrid.** Угловой сектор: оси X/Y от поля, ряды — дуги. Линейный axisGrid давал ряд 11 у подписи «33».

## A101 — radialGrid

- `tickets.json`: `r: []`
- `sector-row-anchors.json`: 4 угла (rows 1/42 × seats 1/4/16), `rowCurve: 0.32`
- Sellable: **`prefersSectorRadialCorner`** → radial **до** fieldGrid
- Код: `interpolateSeatFromCornerAnchors` + `rowCurve` в `luzhnikiSeatWarp.js`

```js
import { prefersSectorRadialCorner, resolvePolarGridSeatFromAnchors } from '../utils/luzhnikiSectorPolarGrid.js';

prefersSectorRadialCorner('a101'); // true
resolvePolarGridSeatFromAnchors('a101', '11', '7'); // geodesySource: radialGrid
```

## B154 — axisGrid

См. `luzhnikiSectorAxisGridPlacement.js`, `SECTOR_AXIS_GRID_PRIORITY_NORMS = ['b154']`.

## Порядок в sellable

1. strict  
2. **A101**: radialGrid → (не fieldGrid)  
3. **B154**: axisGrid при прорези → fieldGrid / pbiletLerp  
4. svgRow / polarGrid B/C  

`offerSeatGeodesy.radialGridMatched` / `axisGridMatched`.

## Тесты

```bash
cd backend && node --test tests/luzhnikiSectorAxisGridPlacement.test.js tests/luzhnikiPbiletSellableGeodesy.test.js
```
