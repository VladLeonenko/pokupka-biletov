# Лужники — геодезия sellable по секторам

Handoff: [LUZHNIKI_NEXT_AGENT_HANDOFF.md](./LUZHNIKI_NEXT_AGENT_HANDOFF.md).

## Ориентация (договорённость со схемы)

Стоишь **на поле**, смотришь в сектор (зелёное поле на диагностике — **снизу**).

```
        Y ↑  (ряды 1 → 39+, от поля вглубь трибуны)
          │
    ┌─────┴──────────────────┐
    │  ●───●───●  ряд N      │  ← ряд = линия (axisGrid) или дуга (radialGrid)
    │                        │
поле└────────────────────────→ X  (места слева направо в ряду)
   origin = нижний-левый угол блока мест сектора
```

- **Y** — номер ряда растёт от поля вверх по трибуне.
- **X** — места вдоль ряда (слева направо на схеме при взгляде с поля).
- **Якоря** — крайние точки сетки (углы блока; при прорези — ещё углы выреза).

Диагностика: `frontend/public/tools/luzhniki-grid-diagnostic.html` (масштаб 1000%+ на проблемном ряду).

---

## Константы шага сетки (эталон D 124)

Измерено по strict `tickets.json`, сектор **«Сектор D 124»** (ряды с полными `x`,`y`; в файле нет ряда 10, есть 9 — для офферов ряд 10 считается интерполяцией).

| Константа | Значение (% viewBox) | В D124 физически |
|-----------|---------------------|------------------|
| `seatStepPct` | **0.206697** | соседние места в ряду (у D124 X постоянен, шаг по Y) |
| `rowStepPct` | **0.192763** | соседние ряды (у D124 Y постоянен, шаг по X) |

Код: `backend/utils/luzhnikiPbiletGridSpacing.js` — `getPbiletGridSpacing()`, `measurePbiletGridSpacingFromTickets()`.

Масштаб UI только zoom — шаги в `xPct`/`yPct` не меняются.

---

## Дерево выбора режима

```
Сектор + оффер (sector, row, seat)
        │
        ├─ strict pbilet / labeled hit? ──► strict
        │
        ├─ угловой A, ряды-дуги (клин)?
        │     └─ да → radialGrid+d124step (4 угла + rowCurve + rowStep/seatStep)
        │              whitelist: SECTOR_RADIAL_PRIORITY_NORMS (сейчас a101)
        │
        ├─ прямоугольник, в layout нет ряда (прорезь 16…27)?
        │     └─ да → axisGrid (линия ряда + шаг от ближнего якорного ряда)
        │              whitelist: SECTOR_AXIS_GRID_PRIORITY_NORMS (сейчас b154)
        │
        └─ иначе → fieldGrid / pbiletLerp / polarGrid B–C / svgRow
```

| Тип сектора | Модуль | Пример |
|-------------|--------|--------|
| **Прямоугольный**, прорезь рядов | `luzhnikiSectorAxisGridPlacement.js` — **axisGrid** | **B154** р.17 между 16 и 27 |
| **Угловой**, радиальные ряды | `luzhnikiSectorPolarGrid.js` — **radialGrid+d124step** | **A101** р.11 — дуга |

**A101 — не эталон axisGrid.** Линейный axisGrid давал ряд 11 у подписи «33».

---

## A101 — угловой сектор (`radialGrid+d124step`)

**Скрин-эталон:** клин, origin внизу-слева (ряд 1 место 1), **X** → места вправо, **Y** → ряды вверх от поля.

- **Не axisGrid** (линейный X/Y ломает угол).
- 4 угла: `sector-row-anchors.json` → `nearLeft` / `nearRight` / `farLeft` / `farRight`.
- **Взгляд с поля:** origin **ряд 1 место 1** (`nearLeft`) — нижний-левый угол клина.
- **Ряд N:** доля `rowT` вдоль nearL→farL (шаг `rowStepPct × rowStepMultiplier`, сейчас **1.1**).
- **Место M в ряду:** доля вдоль хорды ряда, **слева направо от поля** (место 1 = `nearLeft`).
- **Шаг мест:** `seatSpreadMultiplier: 2` — визуальный зазор между точками в 2× (делитель `(местВРяду−1)/2`).
- **Мест в ряду растёт с рядом:** ряд 1 ≈ **4** места, верхние ≈ **39** (`minSeatPerRow` / `maxSeatPerRow`) — веер, не прямоугольник.
- Точка **всегда внутри четырёхугольника** якорей (не «шаг X» за край клина).
- Дуга: `rowCurve` + `rowBendExtraDeg` на оба конца хорды ряда, затем lerp места.
- Дополнительно: clamp bbox `tickets.json`.

```json
{
  "rowCurve": 0.42,
  "rowStepMultiplier": 1.12,
  "seatSpreadMultiplier": 2,
  "rowBendExtraDeg": 5,
  "originRow": 1,
  "originSeat": 1,
  "minSeatPerRow": 4,
  "maxSeatPerRow": 39
}
```

| Симптом | Фикс |
|---------|------|
| Sellable за краем сектора | lerp внутри клина + bbox |
| Место 8 левее 7 | bend только на ряд, не per-seat |
| Ряд 1 узкий, верх широкий | `minSeatPerRow` / `maxSeatPerRow` |
| Ряды сжаты | `rowStepMultiplier` |

Проверка: diagnostic @ 100%, sellable внутри серого клина, ряд 11 на дуге подписи «11».

---

## B154 — axisGrid (прямоугольник + прорезь)

**Скрин-эталон:** оси X/Y от поля; ряд **17** в «дырке» между блоками **16** и **27**; на 1200% — **8 якорей**.

`luzhnikiSectorAxisGridPlacement.js`, `SECTOR_AXIS_GRID_PRIORITY_NORMS = ['b154']`.

### Роли якорей (8 точек)

| # | Роль | Где на схеме |
|---|------|----------------|
| 1–4 | **Внешние углы** | низ-лево, низ-право, верх-лево, верх-право блока (ряды 2 и 39) |
| 5–6 | **Низ выреза** | правый край ряда **16** + точка на продолжении правого края нижнего блока |
| 7–8 | **Верх выреза** | правый край ряда **29** + точка на продолжении правого края верхнего блока |

Якоря — из `layout.seats` (`collectLayoutSectorPbiletSeats`) или вручную в тесте / `sector-row-anchors.json`.

### Ряд в прорези (формула)

В layout **нет** ряда 17 → `rowAnchorForTarget`:

- если прорезь большая (`upper - lower > ~35% диапазона`) или ряд ближе к **нижнему** блоку → **от ряда 16**:  
  `centroid(16) + rowStep × (17 − 16)`;
- иначе — от верхнего якорного ряда назад.

Места в ряду: шаг `seatStep` от ближайшего известного места (`seatRangeInRow` из оффера).

Тест: ряд 17 — одна линия по Y (`max(ys)−min(ys) < 0.05`), места разведены по X.

---

## Sellable-порядок

1. strict  
2. **a101**: `radialGrid+d124step` (до fieldGrid)  
3. **b154**: axisGrid  
4. fieldGrid / svgRow / polar B–C  

Флаги: `offerSeatGeodesy.radialGridMatched`, `axisGridMatched`.

---

## Чеклист: подключить новый сектор

1. **Классифицировать** — угловой (дуги) / прямоугольник с прорезью / обычный B–C.
2. **Norm** — `normalizeSectorLabel` (`сектор b154` → `b154`).
3. **Якоря** — минимум 4 угла (radial) или плотная выборка из layout (axis); при прорези — якоря на границах выреза.
4. **Whitelist** — `SECTOR_RADIAL_PRIORITY_NORMS` или `SECTOR_AXIS_GRID_PRIORITY_NORMS`.
5. **Тест** — на проблемный `row` + `SeatList`.
6. **Diagnostic** — 1000%+, целевой ряд совпадает с серой сеткой.
7. **Не** смешивать режимы (см. антипаттерны).

---

## Антипаттерны

| Нельзя | Почему |
|--------|--------|
| axisGrid на A101 | ряды дуги → ряд 11 у подписи «33» |
| fieldGrid lerp через прорезь B154 | тянет ряд 17 к дальнему блоку 27 |
| Один polarGrid для всех A | A216 и др. — fieldGrid; только whitelist |
| Интерполировать sellable по `allSeatCoordinates` | боковые сектора овала уезжают |

---

## Тесты

```bash
cd backend && node --test \
  tests/luzhnikiPbiletGridSpacing.test.js \
  tests/luzhnikiSectorAxisGridPlacement.test.js \
  tests/luzhnikiPbiletSellableGeodesy.test.js
```
