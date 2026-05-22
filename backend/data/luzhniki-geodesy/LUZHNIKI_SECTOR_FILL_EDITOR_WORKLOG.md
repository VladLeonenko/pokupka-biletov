# Лужники — редактор row/place (`luzhniki-gray-cloud-enriched-hover.html`)

**Инструмент:** `/tools/luzhniki-gray-cloud-enriched-hover.html`  
**Ветка:** `feature/luzhniki-map-perf-lite`  
**Файл кода:** `frontend/public/tools/luzhniki-gray-cloud-enriched-hover.html`

---

## Задача

Вручную и полуавтоматически проставить для каждого `circle` в SVG атрибуты **ряд** (`row` / `data-row`) и **место** (`place` / `data-seat`) по сложной геометрии стадиона (террасы, лесенки, проходы, дубли `fieldGrid` + `strict` на одном X).

Основной режим: **↕ сектор** — разметка **1-й** и **посл.** колонки на нескольких рядах → автозаполнение внутренних мест.

---

## Workflow (как пользоваться)

1. Поле **Сектор** — точный код (`C136 VIP`, `C142`, `A116`…).
2. **Тип:** «1-я колонка» / «посл. колонка» — клик по точкам на **крайних** колонках (не по центру ряда).
3. Минимум **2 ряда** с каждой колонкой; для лесенок (C142) — низ + верх + ряд на ступеньке (16–27).
4. Опционально **Ряд** / **по** — диапазон; иначе берётся из якорей.
5. **↕ сектор** → preview (бирюза) → **Применить ↕**.
6. Перед новым сектором: **⌫ ряд/место** внутри или ▢ область; якоря колонок сбрасываются вместе с row/place.
7. **Проверка** — дубли, пропуски номеров, «далеко» от оси ряда.

---

## Исправленные баги (хронология)

| Проблема | Решение |
|----------|---------|
| VIP C136 не попадал в выборку (`c136` ≠ `vipc136`) | `sectorNormsMatch` + алиасы bbox |
| Диапазон рядов 1–1 из UI | `resolveSectorFillRowSpan` из якорей колонок |
| `place=41` на всей посл. колонке | Не писать seat при apply колонки ▶ |
| Дубли fieldGrid+strict съедали место 2 | `dedupeSeatDotsByX` + запись во все members слота |
| `startSeat+i` пропускал номера | `nextSeat++` только при реальном assign |
| Последнее место пустое на якорях ▶ | `circlesForSeatAssign` + `allowLastTwin`, номер = `seatNum` |
| C136 ок, C142 — вертикальная полоса | `circleBelongsToRowBand` → **Y-полосы** + нормаль к якорям |
| C142 — проход между блоками, последние места | Привязка **по каждой точке**, `filterRowDotsBetweenAnchors`, `resolveLastSlot` fallback |

---

## Алгоритм ↕ сектор (текущий)

1. `circlesForSector` — по `data-sector` / bbox.
2. `collectColumnAnchors` — только `data-sector-edge=first|last`, min/max **X** в ряду.
3. `clusterBandsByY` → для **каждой точки** `rowNumForCircle` (Y + уточнение по нормали к оси якорей).
4. В ряду: X-отрезок от якорей + точек ряда; `filterRowDotsBetweenAnchors` (aisle, напр. C142: gap ~60px, pitch ~20).
5. `dedupeSeatDotsByX` — одна колонка = один слот (fieldGrid+strict).
6. Нумерация: место 1 на 1-й колонке (twins), interior `seatNum++`, посл. колонка в `resolveLastSlot` (+ якоря last).

---

## Сектор C142 (особенности)

- Ряды **1–15 / 16–26 / 27–39** — разная ширина (лесенка справа).
- В ряду **два блока** мест с проходом (~60px между сегментами): нумерация **сквозная** 1…N по X.
- Якоря ставить на **реальной** 1-й и посл. колонке ряда, не в центре сетки.
- Row 39: в данных до ~50 мест в одной полосе; row 16 — 4+10 в двух сегментах.

---

## Деплой

**Локально:**

```bash
git add frontend/public/tools/luzhniki-gray-cloud-enriched-hover.html backend/data/luzhniki-geodesy/LUZHNIKI_SECTOR_FILL_EDITOR_WORKLOG.md
git commit -m "fix: ↕ C142 — ряд по точке, проход между блоками, worklog"
git push origin feature/luzhniki-map-perf-lite
```

**VPS:**

```bash
ssh user@YOUR_SERVER "cd /var/www/pokupka-biletov && ./scripts/deploy-via-git.sh feature/luzhniki-map-perf-lite"
```

После деплоя — hard refresh страницы редактора.

---

## Связанные документы

- [LUZHNIKI_STADIUM_MAP_WORKLOG.md](./LUZHNIKI_STADIUM_MAP_WORKLOG.md) — прод-карта / sellable
- [LUZHNIKI_AGENT_HANDOFF.md](./LUZHNIKI_AGENT_HANDOFF.md) — handoff агента

---

*Обновлено: 22.05.2026*
