# Лужники — геодезия sellable по секторам

Handoff: [LUZHNIKI_NEXT_AGENT_HANDOFF.md](./LUZHNIKI_NEXT_AGENT_HANDOFF.md).

---

## СТРОГИЕ ПРАВИЛА ДЛЯ АГЕНТОВ (читать первым)

**Не импровизировать.** Менять только whitelist + `sector-row-anchors.json` + тесты. Не трогать fieldGrid/strict без задачи.

### 1. Выбор режима (один на сектор)

| Геометрия | Режим | Whitelist | Файл |
|-----------|--------|-----------|------|
| **Угловой клин** (дуги рядов) | `radialGrid+d124step` | `SECTOR_RADIAL_PRIORITY_NORMS` | `luzhnikiPbiletGridSpacing.js` + `luzhnikiSectorPolarGrid.js` |
| **Прямоугольник + прорезь** рядов | `axisGrid` | `SECTOR_AXIS_GRID_PRIORITY_NORMS` | `luzhnikiSectorAxisGridPlacement.js` |
| Остальные B/C, D с `r[]` | `fieldGrid` / strict / cloud | — | не эта дока |

**Запрещено:** axisGrid на A101/B155/B156; radialGrid+d124step на B154; bilinear вместо d124step для whitelist-угловых.

### 2. Ориентация (взгляд с поля)

```
        Y ↑  ряды от поля вглубь
          │
    ┌─────┴──────────────┐
    │  ●───●───●  ряд N  │   места: слева → направо от поля
поле└────────────────────→ X
```

- **Ряд 1 место 1** = якорь `nearLeft` (нижний угол клина у поля).
- **Чёрная линия на схеме** = правый край сектора, подписи рядов 1…40. **Место 1** у этой линии (`seatEndPt` / nearR), номера растут **влево** → `seatCountFromLeft: true` ⇒ `seatT = 1 − (M−1)/(местВРяду−1)`.
- **Не** поднимать верх `rowLiftPct` / `rowRadialDepthBoost` без просьбы — ломает глубину рядов.

### 3. Математика углового сектора (`resolveCornerSectorPbiletStepGrid`)

**Ряд (глубина клина):**

```
rowT = clamp01((rowN − originRow) × rowStepPct × rowStepMultiplier / dist(nearL → farL))
seat1Pt = lerp(nearL, farL, rowT)    // левый конец хорды
seatEndPt = lerp(nearR, farR, rowT)   // правый конец = чёрная линия рядов
```

**Нельзя:** `rowDepthT = rowT²` или `rowRadialDepthBoost > 0` без калибровки — ряды уезжают вверх.

**Ширина хорды (веер):** только если `fanWidthT = rowT^radialFan > rowT` — расширить концы хорды от центра. Если `fanWidthT ≤ rowT` — **не сужать** (иначе слипание).

**Место в ряду:**

```
seatsInRow = round(minSeatPerRow + rowT × (maxSeatPerRow − minSeatPerRow))  // 4→39 по вееру
seatT = 1 − (seatN − 1) / (seatsInRow − 1)   // seatCountFromLeft: место 1 у чёрной линии
pt = lerp(seat1Pt, seatEndPt, seatT)
```

**Нельзя:** делитель только `maxSeatPerRow` (39) — на ряду 11 место 21 окажется между 14 и 15 визуально неверно; слипание при gap/chord clamp.

**Дуга ряда:** `rowCurve` + `rowBendExtraDeg` на `seat1Pt` и `seatEndPt`, потом lerp места.

**Верх:** `rowLiftPct` (0.06–0.10) при `rowT > rowLiftFromRowT` (0.35) — `yPct -= rowLiftPct × liftT`.

### 4. Параметры углового — как подбирать (±)

| Параметр | Смысл | Как крутить |
|----------|--------|-------------|
| `rowStepMultiplier` | глубина ряда N | ряд 11 не на подписи «4»/«33» → ±0.02–0.05 |
| `rowLiftPct` | верхние ряды чуть выше | не хватает 3–8 px → +0.01–0.02 |
| `rowRadialDepthBoost` | дуга глубины верха | 0.04–0.08 |
| `radialFanExponent` | ширина верхних рядов | только ширина; 1.5–2.5 |
| `maxSeatPerRow` | делитель мест (обычно 39) | = реальный макс мест в верхнем ряду сектора |
| `minSeatPerRow` | мест у поля (обычно 4) | = nearRight.seat в ряду 1 |
| `seatCountFromLeft` | **true** для A101 | не менять без проверки diagnostic |
| `rowCurve` / `rowBendExtraDeg` | изгиб дуги | 0.35–0.45 / 3–8° |

`seatSpreadMultiplier: 0.206697` — справочно (шаг D124 м5–м6); **не** использовать как делитель span (см. формулу выше).

### 5. Прямоугольный сектор (axisGrid) — проще

**B154:** 8 якорей, ряд = линия, места = шаг `seatStepPct` по X или Y.

- Ряд в прорези (нет в layout): от **ближнего** якорного ряда `rowLo + (target−rowLo)×rowStep`, не lerp к дальнему блоку.
- Whitelist: только `b154` в `SECTOR_AXIS_GRID_PRIORITY_NORMS`.
- Крутить: якоря из layout, не выдуманные %.

### 6. Подключение нового сектора

1. Классифицировать: угол / прямоугольник / обычный.
2. Добавить norm в **один** whitelist.
3. Заполнить `sector-row-anchors.json` (4 угла + роли `nearLeft`…`farRight`).
4. Тест `luzhnikiPbiletGridSpacing.test.js` или `luzhnikiSectorAxisGridPlacement.test.js`.
5. Diagnostic 1000% на проблемный ряд/места.
6. **Не** копировать JSON A101 в B155/B156 без проверки `seatCountFromLeft` и якорей.

### 7. Чеклист перед коммитом

```bash
cd backend && node --test \
  tests/luzhnikiPbiletGridSpacing.test.js \
  tests/luzhnikiSectorAxisGridPlacement.test.js \
  tests/luzhnikiPbiletSellableGeodesy.test.js
```

- [ ] A101 ряд 11: места 7–9 **разные** x
- [ ] A101 ряд 38: места 22–25 **четыре точки**, не 30–32
- [ ] A101 ряд 35: места 1–4 **четыре точки**
- [ ] Не менялся `rowT²` для глубины ряда

---

## Константы D124

| Константа | Значение (% viewBox) |
|-----------|---------------------|
| `seatStepPct` | **0.206697** |
| `rowStepPct` | **0.192763** |

Код: `getPbiletGridSpacing()`, `measureD124SeatGapPct()` (ряд 10 → fallback ряд 9).

---

## A101 — эталон углового (`radialGrid+d124step`)

```json
{
  "rowCurve": 0.42,
  "rowStepMultiplier": 1.12,
  "rowLiftPct": 0,
  "rowRadialDepthBoost": 0,
  "seatCountFromLeft": true,
  "radialFanExponent": 2,
  "rowBendExtraDeg": 5,
  "originRow": 1,
  "originSeat": 1,
  "minSeatPerRow": 4,
  "maxSeatPerRow": 39
}
```

| Симптом | Причина | Действие |
|---------|---------|----------|
| Все места в одной точке | `seatSpan` от `seatsInRow` или gap/chord clamp | `seatSpan = maxSeatPerRow − 1` |
| Нумерация справа налево | убран `seatCountFromLeft` mirror | `seatCountFromLeft: true` |
| Ряд 11 на ряду 4 | `rowT²` на глубину | только `rowT` + `rowRadialDepthBoost` |
| Места 22–25 на 30–32 | неверный span / зеркало | см. формулы §3 |

---

## B154 — axisGrid

`SECTOR_AXIS_GRID_PRIORITY_NORMS = ['b154']`. Прорезь ряд 17: шаг от ряда 16. См. старый § B154 в handoff.

---

## B155 / B156 — угловые

Whitelist `b155`, `b156`. Та же математика §3; **свои** якоря и `maxSeatPerRow` (29 / 62). Калибровка отдельно на diagnostic.

---

## Sellable-порядок

1. strict (`tickets.json` sector+row+seat)  
2. **pbiletLabeled** — exact `lookupLabeledSeat` в `layout.seats` / prod pilot bundle  
3. **cloudRowSeat** (пока **a101**): облако в path → ряд по SVG/якорям + место вдоль хорды (`luzhnikiSectorCloudRowSeat.js`)  
4. cloudMaster (если `LUZHNIKI_CLOUD_MASTER=1`)  
5. **a101, b155, b156** → radialGrid+d124step (`seatSpacingScale`)  
3. **b154** → axisGrid  
4. fieldGrid / svgRow  

---

## Тесты

```bash
cd backend && node --test \
  tests/luzhnikiPbiletGridSpacing.test.js \
  tests/luzhnikiSectorAxisGridPlacement.test.js \
  tests/luzhnikiPbiletSellableGeodesy.test.js
```