# Лужники — handoff для продолжения работы (17.05.2026)

**Читать первым.** Эталон успеха: **сектор D 230, ряд 24, места 8–11** — точки на схеме совпадают с карточкой оффера (после `interpolatePbiletSeatGeodesy`, коммит `8e8e7eb8`).

Связанные файлы: [LUZHNIKI_STADIUM_MAP_WORKLOG.md](./LUZHNIKI_STADIUM_MAP_WORKLOG.md) (пилот D230), [LUZHNIKI_SVG_VIEWBOX_COORDINATE_PLAN.md](./LUZHNIKI_SVG_VIEWBOX_COORDINATE_PLAN.md).

---

## 1. Симптом на проде (после деплоя `21b3a971`)

- API: `svgCircleMatched: 454`, `luzhnikiPilotGeodesyActive: true`, `omitLayoutSeatSellableFallback: true` — бэкенд ок.
- UI: в **идеальном D 230** видны точки от **D 229**, зелёные/оранжевые кластеры не на рядах 24 / 8–11, «всё не на местах».

**Это не случайный хаос** — три повторяющихся класса ошибок (ниже).

---

## 2. Закономерности ошибок (обязательно понять)

### A. Три источника координат — разная точность

| Источник | Откуда | Точность | Когда использовать |
|----------|--------|----------|-------------------|
| **tickets.json (pbilet)** | `sectors[].r[].s[]` с `x`,`y` | ✅ Эталон | Сектора с ≥2 рядами в файле |
| **интерполяция pbilet** | `interpolatePbiletSeatGeodesy()` между рядами tickets | ✅ Хорошо для отсутствующих рядов (пример D230 ряд 24) | Оффер есть, ряда нет в tickets |
| **layout.seats (fieldGrid)** | Сид ~130k мест в БД | ❌ Систематический **сдвиг рядов** (~4 ряда на овале) | **Не использовать** для sellable, кроме крайнего fallback с пометкой |
| **layout-grid в bundle** | `build-luzhniki-stadium-pilot-geodesy.js` для секторов без tickets | ❌ Те же сдвиги | Временно дало +281 матч, визуально ломает соседние сектора |

**Правило:** sellable на карте = только `geodesySource: svgCircle` из кругов, чьи координаты из **tickets ± интерполяция**. Никакого `layout.seats` для привязки ряд/место.

**Доказательство сдвига:** координаты `layout.seats` для D230 `ряд 24 место 8` совпадали с pbilet **ряд 28 место 2** (`xPct/yPct` идентичны с погрешностью).

### B. «Чужие» сектора внутри выбранного D 230 (баг фронта)

`TicketHallInteractiveBlock.tsx` → `visibleNativePlacements` для `luzhnikiCheckout`:

```text
byLabel = точки с sectorLabel === d230
byBbox  = ВСЕ sellable, чьи (xPct,yPct) попали в полигон path сектора D 230
merged  = byLabel ∪ byBbox
```

Сосед **D 229** с координатами из layout-grid часто геометрически попадает в polygon D 230 → **на экране точки D 229 в карточке D 230**.

**Исправление (в работе):** при `omitLayoutSeatSellableFallback` / пилоте — **только `byLabel`**, без `byBbox`.

### C. Частичный `tickets.json` (~6k / 81k)

- В репо не все сектора/ряды.
- `build:luzhniki-stadium-pilot` пропускает сектора с `<2` рядов в tickets (или добирает layout-grid).
- **49** секторов в офферах суперфинала, **~25** с pbilet-рядами, **~20** только layout-grid, **4** без координат вообще.

**Следствие:** `svgCircleMatched` 454 из 536 — потолок без полного pbilet-export.

### D. Два слоя отрисовки

- **Серая чаша:** `allSeatCoordinates` (~77k) на canvas — не трогать.
- **Цветные sellable:** `layout_json.sellableSeats` с API + фронт `buildLuzhnikiMapSellablePlacements`.
- До `21b3a971` фронт **дописывал** непромапленные офферы из `layout.seats` → сотни кривых точек. Флаг `omitLayoutSeatSellableFallback` это отключает — **нужен rebuild фронта на проде**.

### E. Git на VPS

После `enrich` на сервере ломается `git pull` (локальные правки `hand/bundle-*.json`). Всегда:

```bash
git checkout -- backend/data/luzhniki-geodesy/hand/
git pull origin main
```

---

## 3. Что уже сделано (коммиты)

| Коммит | Суть |
|--------|------|
| `e6ccbd8f` | Пилот D230, svgCircle на /map |
| `bd35cb30` | Невидимые круги, merge SVG, без рамки сектора |
| `8e8e7eb8` | Ряд 24 из tickets.json, не layout.seats |
| `c694d97d` | Stadium bundle 2075 кругов, 25 секторов |
| `21b3a971` | +20 секторов layout-grid, флаг omit layout fallback, bundle 2356 |

**Ключевые файлы:**

- `backend/scripts/build-luzhniki-stadium-pilot-geodesy.js` — сборка всех секторов
- `backend/scripts/apply-luzhniki-sector-pilot-svg.js` — merge `#luzhniki-pilot-seats` в БД
- `backend/utils/luzhnikiPbiletGeodesyExtract.js` — `interpolatePbiletSeatGeodesy`
- `backend/services/luzhnikiFootballStageMap.js` — sellable из svgCircle, `svgOnlyMatched`
- `frontend/.../svgNativeSeatLayout.ts` — `omitLayoutFallback`
- `frontend/.../TicketHallInteractiveBlock.tsx` — чекаут, canvas, sector filter

**Repertoire суперфинала:** `6a05d17b46a4d000309ecf4e`  
**Stage map key:** `luzhniki-football`  
**ViewBox:** `0 0 11413 9676`  
**Прод путь:** `/var/pokupka-biletov` (не `/var/www/...`)

---

## 4. Почему API «хороший», а картинка «плохая»

```bash
curl -sS "http://127.0.0.1:3000/api/bilet/stage/luzhniki-football/map?repertoireId=6a05d17b46a4d000309ecf4e" \
  | jq '{
    matched: .layout_json.offerSeatGeodesy.svgCircleMatched,
    total: .layout_json.offerSeatGeodesy.totalSellable,
    pilot: .layout_json.luzhnikiPilotGeodesyActive,
    omit: .layout_json.omitLayoutSeatSellableFallback,
    d230: [.layout_json.sellableSeats[] | select(.sector | test("230";"i"))] | length
  }'
```

API считает матч **по ключу** sector+row+seat ↔ круг в SVG.  
UI рисует по **xPct/yPct** + фильтр сектора. Если координаты из layout-grid или bbox-merge — ключ верный, **точка не там**.

---

## 5. План работ (приоритет)

### P0 — сразу (1–2 часа)

1. **Фронт:** в `visibleNativePlacements` для Лужников с пилотом — **только `byLabel`**, убрать `byBbox` merge (см. §2B).
2. **Откат layout-grid** из stadium bundle ИЛИ пометить `geodesySource: layoutGrid` и не включать в `TRUSTED_SERVER_GEODESY` / не рисовать.
3. **Деплой:** `git pull` + `apply` + **пересборка frontend** (`deploy-via-git.sh` или `cd frontend && npm run build`).
4. **Регрессия D230:** ряд 24 места 8–11 — единственный автотест глазами + curl.

### P1 — качество покрытия (1–2 дня)

5. **Полный или расширенный `tickets.json`** с pbilet (все ряды трибун суперфинала).
6. Пересборка: `REPERTOIRE_ID=... npm run build:luzhniki-stadium-pilot` **без** layout-grid ветки (или только для секторов без офферов).
7. Скрипт валидации: для каждого sellable сравнить dist до ближайшей точки `allSeatCoordinates` в том же секторе/ряде — флаг outliers.

### P2 — архитектура

8. Один `#luzhniki-pilot-seats` vs подслои `#pilot-{norm}` — проще дебажить.
9. E2E: Playwright — клик D230 → 4 точки, sector label в popup.
10. Когда покрытие >80% sellable с pbilet-точностью — ослабить `svgOnlyMatched`, убрать canvas-дубль (план §5–6 в SVG plan).

---

## 6. Команды (копипаст)

### Локально

```bash
cd backend
REPERTOIRE_ID=6a05d17b46a4d000309ecf4e npm run build:luzhniki-stadium-pilot
npm run apply:luzhniki-sector-pilot   # нужна БД
cd ../frontend && npm run build
```

### Прод

```bash
cd /var/pokupka-biletov
git checkout -- backend/data/luzhniki-geodesy/hand/ 2>/dev/null || true
git pull origin main
cd backend
npm run apply:luzhniki-sector-pilot
pm2 restart bilet-backend --update-env
cd ..
./scripts/deploy-via-git.sh main
```

### Проверка

```bash
PORT=$(grep -E '^PORT=' /var/pokupka-biletov/backend/.env | cut -d= -f2); PORT=${PORT:-3000}
curl -sS "http://127.0.0.1:${PORT}/api/bilet/stage/luzhniki-football/map?repertoireId=6a05d17b46a4d000309ecf4e" \
  | jq '.layout_json.offerSeatGeodesy | {svgCircleMatched,totalSellable}'
```

Сайт: https://biletvsem.com — hard refresh, суперфинал, сектор D 230.

---

## 7. Антипаттерны (не повторять)

- ❌ Координаты sellable из `layout.seats` без калибровки pbilet
- ❌ `byBbox` merge при выбранном секторе на Лужниках
- ❌ Replace всего `svg_markup` bundle одного сектора
- ❌ Считать `svgCircleMatched` без проверки UI на D230 row 24
- ❌ Откат `rollback/luzhniki-e3110e15`
- ❌ Деплой только backend без rebuild `frontend/dist`

---

## 8. Диагностика для нового агента

```bash
# Сколько sellable по geodesySource
curl -sS ".../map?repertoireId=6a05d17b46a4d000309ecf4e" | \
  jq '[.layout_json.sellableSeats[].geodesySource] | group_by(.) | map({k:.[0],n:length})'

# D230 sellable coords
curl -sS ".../map?repertoireId=..." | \
  jq '[.layout_json.sellableSeats[] | select(.sector | test("230";"i"))]'

# D229 точки с coords внутри D230 path — гипотеза bbox bleed
node backend/scripts/diagnose-luzhniki-sector-bleed.js  # TODO: опционально написать
```

**Идеальный критерий готовности:** для репертуара суперфинала ≥90% `totalSellable` с координатами из pbilet/интерполяции; D230 row 24 8–11 визуально на ряду 24; при выборе сектора на карте **только** точки этого сектора (по label).

---

## 9. Открытые вопросы

1. Есть ли на pbilet полный export tickets для этого события (не 6k snapshot)?
2. Нужны ли layout-grid сектора на карте вообще, или только список без точек?
3. Отключить `filterPlacementsInSectorPath` для luzhniki навсегда?

---

*Handoff подготовлен после сессии пилота D230 и stadium rollout, 17.05.2026.*
