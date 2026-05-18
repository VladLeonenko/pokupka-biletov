# Лужники — геодезия sellable по секторам

Handoff: [LUZHNIKI_NEXT_AGENT_HANDOFF.md](./LUZHNIKI_NEXT_AGENT_HANDOFF.md).

## Константы шага сетки (эталон D 124)

Измерено по strict `tickets.json`, сектор **«Сектор D 124»** (ряды с полными `x`,`y`; в файле нет ряда 10, есть 9 — для офферов ряд 10 считается интерполяцией).

| Константа | Значение (% viewBox) | В D124 физически |
|-----------|---------------------|------------------|
| `seatStepPct` | **0.206697** | соседние места в ряду (у D124 X постоянен, шаг по Y) |
| `rowStepPct` | **0.192763** | соседние ряды (у D124 Y постоянен, шаг по X) |

Код: `backend/utils/luzhnikiPbiletGridSpacing.js` — `getPbiletGridSpacing()`, `measurePbiletGridSpacingFromTickets()`.

Масштаб UI только zoom — шаги в `xPct`/`yPct` не меняются.

## A101 — угловой сектор (`radialGrid+d124step`)

- **Не axisGrid** (линейный X/Y ломает угол).
- 4 угла: `sector-row-anchors.json` → `nearLeft` / `nearRight` / `farLeft` / `farRight`.
- Позиция: от `nearLeft` + `rowStepPct` вдоль рядов + `seatStepPct` вдоль места на дуге ряда + `rowCurve` 0.32.
- Модуль: `resolveCornerSectorPbiletStepGrid()` → `luzhnikiSectorPolarGrid.js` для `SECTOR_RADIAL_PRIORITY_NORMS` (`a101`).

```js
import { getPbiletGridSpacing, resolveCornerSectorPbiletStepGrid } from '../utils/luzhnikiPbiletGridSpacing.js';

getPbiletGridSpacing();
// { seatStepPct: 0.206697, rowStepPct: 0.192763, source: 'Сектор D 124' }
```

## B154 — axisGrid (прямоугольник, прорезь рядов)

`luzhnikiSectorAxisGridPlacement.js`, `SECTOR_AXIS_GRID_PRIORITY_NORMS = ['b154']`.

## Sellable-порядок

1. strict  
2. **a101**: `radialGrid+d124step` (до fieldGrid)  
3. **b154**: axisGrid  
4. fieldGrid / svgRow / polar B/C  

`offerSeatGeodesy.radialGridMatched`, `axisGridMatched`.

## Тесты

```bash
cd backend && node --test tests/luzhnikiPbiletGridSpacing.test.js tests/luzhnikiPbiletSellableGeodesy.test.js
```
