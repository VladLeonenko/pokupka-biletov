# Лужники — axisGrid (сетка по осям X/Y сектора)

**Для следующего агента.** Handoff: [LUZHNIKI_NEXT_AGENT_HANDOFF.md](./LUZHNIKI_NEXT_AGENT_HANDOFF.md).

## Когда нужен

- В `tickets.json` / `layout.seats` **нет ряда** (прорезь между блоками), но оффер есть — пример **B154 ряд 17** (между 16 и 27).
- `polarGrid` / `pbiletLerp` дают диагональ или плоскую линию не по дуге трибуны.
- Эталон «как надо» для линейного ряда: **D124 ряд 10** → `pbiletLerp` + constant X (все места ряда в layout).

## Код (единственный модуль)

| Файл | Роль |
|------|------|
| `backend/utils/luzhnikiSectorAxisGridPlacement.js` | API: model + resolve sellable |
| `backend/utils/luzhnikiPbiletSellableGeodesy.js` | Вызов после strict, до polarGrid |
| `backend/data/luzhniki-geodesy/sector-row-anchors.json` | 4 угла сектора (rows 1,6,19,26 для b154) |
| `backend/tests/luzhnikiSectorAxisGridPlacement.test.js` | Юнит-тесты |
| `backend/tests/luzhnikiPbiletSellableGeodesy.test.js` | B154 р.17 → `geodesySource: axisGrid` |

## API (кратко)

```js
import {
  buildSectorAxisGridModel,
  resolveSeatOnSectorAxisGrid,
  resolveSellableOnSectorAxisGrid,
} from '../utils/luzhnikiSectorAxisGridPlacement.js';

const model = buildSectorAxisGridModel(anchors, 'b154');
const pt = resolveSeatOnSectorAxisGrid(model, 17, 5, { min: 4, max: 12 });
// → { xPct, yPct }

const hit = resolveSellableOnSectorAxisGrid({
  anchors,
  sectorLabel: 'b154',
  row: 17,
  seat: 5,
  seatRangeInRow: { min: 4, max: 12 },
});
// → { xPct, yPct, geodesySource: 'axisGrid' }
```

**Прорезь рядов:** если `rowNum` между `rowLo` и `rowHi`, но в якорях нет этого ряда и разрыв > 1 — позиция = `rowLo + (rowNum - rowLo) * rowStep`, не интерполяция к дальнему блоку.

## Порядок в sellable (`buildSellableSeatGeodesyPbiletAccurate`)

1. strict из tickets  
2. layout-anchors: fieldGrid snap → **axisGrid если ряда нет в layout** → pbiletLerp → svgRow → polarGrid (B/C)  
3. `mode: none`: axisGrid из `sector-row-anchors.json` + manual anchors  

Счётчик в ответе map: `layout_json.offerSeatGeodesy.axisGridMatched`.

## Почему B154 «пустой» на UI (май 2026)

**Не баг axisGrid.** На суперфинале `repertoireId=6a05d17b46a4d000309ecf4e` в **живом GetBilet сейчас 0 офферов** по B154 (147 офферов всего, сектор с «154» не встречается).

**Откуда «9 мест»:** в тестах/ручной проверке — **ряд 17, места 4–12** (9 позиций; в `luzhnikiPbiletSellableGeodesy.test.js` в mock только 8, без места 11). В `tickets.json` у «Сектор B 154» поле **`r: []`** — strict-рядов нет. Когда GetBilet снова отдаст офферы по B154, после деплоя axisGrid точки появятся на `/map`.

Проверка:

```bash
curl -sS ".../api/bilet/repertoire/6a05d17b46a4d000309ecf4e/offers" | jq '[.[]|select(.sector|test("154";"i"))]|length'
```

Когда офферы по B154 появятся — нужен деплой с коммитом axisGrid (`luzhnikiSectorAxisGridPlacement.js` + правки в `luzhnikiPbiletSellableGeodesy.js`).

## Диагностика после деплоя

```bash
curl -sS ".../map?repertoireId=6a05d17b46a4d000309ecf4e" \
  | jq '.layout_json | {sellable: (.sellableSeats|length), axis: .offerSeatGeodesy.axisGridMatched, b154: [.sellableSeats[]|select(.sector|test("154";"i"))]}'
```

Тесты:

```bash
cd backend && node --test tests/luzhnikiSectorAxisGridPlacement.test.js tests/luzhnikiPbiletSellableGeodesy.test.js
```

## TODO (не закрыто)

- 8 угловых якорей пользователя в `sector-row-anchors.json` (сейчас 4).
- Согласование подписей мест внизу схемы (5…40) с `seatNum` оффера.
- Дуга трибуны: axisGrid даёт **прямую линию ряда** в % viewBox; для сильной кривизны — отдельная модель (не polarGrid по 4 углам).
