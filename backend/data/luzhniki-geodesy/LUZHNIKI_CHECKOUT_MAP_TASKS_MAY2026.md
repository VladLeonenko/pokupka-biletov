# Лужники — checkout карта-схема: что сделано, задачи, май 2026

**Статус:** **рабочая версия на проде** (май 2026): редактор → bundle → checkout sellable (B147 и др.), проверено.  
**Связанные документы:** [LUZHNIKI_NEXT_AGENT_HANDOFF.md](./LUZHNIKI_NEXT_AGENT_HANDOFF.md), [LUZHNIKI_STADIUM_MAP_WORKLOG.md](./LUZHNIKI_STADIUM_MAP_WORKLOG.md), [LUZHNIKI_SVG_VIEWBOX_COORDINATE_PLAN.md](./LUZHNIKI_SVG_VIEWBOX_COORDINATE_PLAN.md).

**Репертуар суперфинала (пример):** `6a05d17b46a4d000309ecf4e`  
**Ключ схемы в БД:** `luzhniki-football`  
**Прод:** `/var/pokupka-biletov`, деплой `./scripts/deploy-via-git.sh main`

---

## 1. Цель (как должно быть для пользователя)

| Область | Требование |
|---------|------------|
| **Список билетов** | Все места/офферы, которые отдаёт **GetBilet API** для выбранного сеанса (без «тихого» отсечения ценой/зоной театра). Фильтр **«Поиск сектора»** (A101, C143…) действует **только на список**, не на карту. |
| **Карта-схема** | **Серая подложка** = облако координат (`luzhniki.txt` / `allSeatCoordinates`, рисуется на canvas). **Цветные точки** = только **sellable**: место из API, для которого геодезия нашла **свою** серую точку (sector/row/seat → xPct/yPct). |
| **Интерактив** | Hover и клик по sellable: **размер зоны нажатия = размер видимой точки** (не микро-хитбокс и не невидимый слой поверх). Выбор места, тултип, панель сектора, zoom/pan — всё рабочее. |
| **Визуал при zoom** | При приближении **нет** цветной заливки секторов (path) — только серые точки чаши + sellable. Обзор стадиона — сектора кликабельны для входа в сектор. |
| **Облегчение карты** | Убрать лишние подложки, дубли DOM/canvas/SVG, «призрачные» слои, которые ломают z-index и pointer-events. |

---

## 2. Что уже сделали (хронология коммитов)

| Коммит | Суть |
|--------|------|
| `cf0ed238` … `ce49ffa1` | Редактор `luzhniki-gray-cloud-enriched-hover.html`, save API → bundle `editor-svg-extract`, rowZip (места 1..N vs API 20..31). |
| `cf4903c8` | Sellable **только** из bundle редактора (`mode: editor-svg-extract`); автоген ~75k убран из git; заглушка bundle в репо. |
| `46d37bd7` | Checkout: детект Лужников по `layout_json` (`stadiumMapKey`, `luzhnikiStadiumCheckout`), Autocomplete сектора, не театральные «Партер/Балкон». |
| `366103ed` / `b0054d36` | Hover: `sellableSeats` с `/map`, хитбоксы, `probeSeatHover` на canvas. |
| `aaff2f7f` | **Backend:** `ONLY=1` только если в bundle **есть места**; иначе fallback pbilet/cloud. **Frontend:** фильтр сектора только список; карта — все офферы сеанса; merge `sellableSeats` с `/map` всегда. |
| `a285f30b` | Скрытие заливки секторов при zoom/выборе сектора; `findNearestSellablePlacement` — клик по canvas без попадания в DOM-кнопку. |
| `scripts/deploy-via-git.sh` | Исправлен путь к `ensure-luzhniki-football-stage-map.js` (раньше сид не запускался). |
| `8eebe032` | Partial manual bundle: sellable только из coords редактора (`grayCloudLabeled-partial-manual-only`). |
| `fd7c7219` | Редактор: **▶ Применить ряд → сервер** (POST сразу), проверка sector в bundle, блок b145≠b147. |
| `53ac6122` | **Fix checkout:** `decodeHtmlEntities` + save SVG без cheerio `$.xml()` (кириллица `Сектор B 147` не ломается в `&#x421;…`). |

### Редактор координат (hand)

- **Файл:** `frontend/public/tools/luzhniki-gray-cloud-enriched-hover.html`
- **Сохранение:** POST → `backend/routes/luzhnikiGrayCloudSvg.js` → `hand/bundle-luzhniki-gray-cloud-labeled-seats.json` + SVG (`data-source=manual*`).
- **▶ Применить ряд → сервер:** после линии сразу POST; в тосте `Сектор B 147: N мест` — если 0, на checkout не попадёт.
- **Полигон сектора:** при заполненном поле «Сектор» линия/▶ только внутри `path[data-sector]` (не утащит B262 на другой конец).
- **Номера мест:** «Место с» = первое место из GetBilet в этом ряду (B262 ряд 41 → **7**, не 1).
- **SVG gzip:** при save пишется `.svg.gz`; nginx `gzip_static` + `image/svg+xml` в gzip.
- **Важно:** `git reset --hard` на деплое **стирает** bundle/SVG на VPS — `deploy-via-git.sh` бэкапит при `seatCount>0`. Иначе 💾 из редактора.
- **Починка bundle на VPS:** `cd backend && node scripts/repair-luzhniki-bundle-sector-labels.js` (после старых save с entity-кодировкой).

### Backend sellable (цепочка)

- `GET /api/bilet/stage/luzhniki-football/map?repertoireId=…` → `adaptLuzhnikiStageMapForLiveOffers` → `buildSellableSeatGeodesyPbiletAccurate` (`luzhnikiPbiletSellableGeodesy.js`).
- Приоритет координат: **bundle редактора** → strict pbilet → cloud row/seat → sector-native / polar / axis grid (см. env).
- **Env на проде (типично):**
  - `LUZHNIKI_SELLABLE_GRAY_CLOUD_LABELED=1`
  - `LUZHNIKI_SELLABLE_GRAY_CLOUD_ONLY=1` (но при **пустом** bundle код отключает ONLY — см. `aaff2f7f`)

### Frontend checkout

- `TicketCheckoutPage.tsx` — список, фильтр сектора, передача офферов/ layout в карту.
- `TicketHallInteractiveBlock.tsx` — canvas (серая чаша + sellable), sector SVG paths, DOM-хитбоксы, панель сектора.

---

## 3. Проверки на проде (май 2026)

```bash
cd /var/pokupka-biletov

# Версия кода
git log -1 --oneline

# Sellable с API (НЕ /api/bilet/map — такого роута нет)
curl -s "https://biletvsem.com/api/bilet/stage/luzhniki-football/map?repertoireId=6a05d17b46a4d000309ecf4e" \
  | jq '{sellable: (.layout_json.sellableSeats|length), mode: .layout_json.sellableGeodesyMode, b147: ([.layout_json.sellableSeats[]?|select(.sector|test("b147";"i"))]|length)}'

# Bundle + SVG manual на диске
curl -s https://biletvsem.com/api/tools/luzhniki-gray-cloud-svg/status | jq '{seats:.bundle.seatCount, b147:.bundle.sectorNormCounts.b147, svgManualAttrs}'
grep -c 'data-source="manual' backend/data/luzhniki-geodesy/hand/luzhniki-gray-cloud-enriched.svg
cd backend && node scripts/repair-luzhniki-bundle-sector-labels.js
# или: node -e "…" — см. repair-luzhniki-bundle-sector-labels.js

# Диагностика одного ряда (не весь сектор!)
cd backend && node scripts/diag-gray-cloud-bundle-sellable.js a101 34

# Фронт собран
ls -la frontend/dist/assets/js/TicketHallInteractiveBlock*.js
ls -la frontend/dist/assets/js/TicketCheckoutPage*.js
```

**Интерпретация (факт с VPS):**

- `sellable: 544` — backend **работает** (офферы матчятся в координаты).
- `bundle` 265 байт, `seatCount: 0` — **нет** разметки редактора; координаты sellable = cloud/pbilet snap, не hover-editor.
- `diag a101 34` → 4 места в **ряду 34**, `grayCloudMatched: 36` по сектору в логике облака — это **не** «показать 36 точек на карте», если в `sellableSeats` попало меньше.

---

## 4. Открытые задачи (приоритет)

### P0 — Hover и кликабельность sellable

**Симптом:** пользователи не могут навести/кликнуть по цветной точке; при zoom остаётся розовая подложка сектора (частично чинили в `a285f30b`, на проде нужен свежий dist).

**Нужно:**

1. **Хитбокс = визуальный радиус точки** на canvas:
   - Сейчас: `stadiumSeatHitboxLayerPx` + ghost-кнопки `seatDotUniformCanvas` (opacity 0) — рассинхрон с `stadiumSeatCanvasRadiusPx` при fit-zoom.
   - Сделать: один источник радиуса; `width/height` DOM = `2 * r_canvas` в **экранных** px после transform; или только canvas hit-test без ghost DOM.
2. **Hover** всегда через тот же hit-test, что и клик (`findNearestSellablePlacement`), не полагаться на невидимые `<button>`.
3. **Z-index / pointer-events:**
   - `sectorLayer` — `pointer-events: none` + прозрачный fill при `mapZoomed || selectedSector`.
   - `seatLayer` выше sector; canvas `pointer-events: none`; viewport ловит move/up для pick.
4. Проверка: E2E на секторе A101, zoom 200–1000%, клик по каждой видимой цветной точке → выбор в панели/корзине.

**Файлы:** `TicketHallInteractiveBlock.tsx`, `TicketHallInteractiveBlock.module.css`.

---

### P0 — Полнота списка (все места из GetBilet)

**Симптом:** API отдаёт больше мест (пример: A101 — 36 мест / 10 рядов), в списке и панели сектора меньше (11 мест / 4 ряда).

**Возможные причины:**

| Причина | Где смотреть |
|---------|----------------|
| `listableOffers` / `isOfferListedOnCheckout` | `TicketCheckoutPage.tsx`, фильтры витрины |
| `filterOffers` (цена, adjacent, hidePassage) | Для Лужников ослабили, но price chip на карте раньше душил `filterState` — проверить актуальный dist |
| Фильтр сеанса | `hallMapSessionKey` vs офферы в другой `EventDateTime` |
| Группировка в UI | один offer = несколько `SeatList` — считать **места**, не строки |
| Кэш GetBilet | `?refresh=1` на page API |

**Нужно:**

1. Сверить `GetOfferListByRepertoireId` raw count по сектору A101 с `listableOffers` на checkout (лог/временный debug endpoint).
2. Список: для `isLuzhnikiFootballStage` показывать **все** `listableOffers` сеанса; фильтр сектора — опционально; **не** применять театральную зону/цену по умолчанию.
3. Панель «Сектор A101» на карте: `seatCount` = сумма `SeatList.length` по всем офферам сектора из **полного** набора офферов сеанса, не из отфильтрованного списка страницы.

---

### P0 — Полнота sellable на карте

**Симптом:** на карте меньше цветных точек, чем sellable в API / мест в списке.

**Нужно:**

1. Карта рисует placements из `layout.sellableSeats` + match к `offers` (`TicketHallInteractiveBlock`); убедиться, что клиент получает актуальный `sellableSeats` (после `aaff2f7f` merge не только при `length > 0`).
2. Для сектора A101: `jq` по `/map` — сколько sellable с `sector` ~ a101; сравнить с числом цветных точек.
3. Несматченные офферы — лог `offerSeatGeodesy.unmatchedSamples` в ответе `/map`.
4. После восстановления **editor bundle** — включится `grayCloudLabeled` + rowZip; перепроверить ONLY=1.

**Не показывать на карте:**

- лишние DOM-круги из `layout.seats` / `nativeSeats` без оффера (кроме режима preview);
- дубли preview + canvas + SVG circles.

---

### P1 — Облегчить карту (убрать дубли и подложки)

**Текущие слои (стадион):**

```
viewport
  canvas (allSeatCoordinates + sellable dots)     ← основная графика
  panInner / layers
    svgLayer (pbilet SVG, opacity 0 при canvas) ← подложка-растр
    sectorLayer (path секторов)                 ← только обзор / клик сектора
    seatLayer (DOM seatDot / hitbox)            ← интерактив
  sectorPanel (список мест сектора)
```

**Задачи:**

1. Один источник серых точек: **только canvas** при `denseBackgroundHall` + `uniformHallSeatAppearance` — не рисовать `backgroundSeatLayer` SVG и не `visibleUnavailableNativeSeats` без необходимости.
2. Sellable: **только canvas** + единый hit-test; убрать ghost DOM-кнопки, если hit-test на viewport стабилен.
3. `svgLayer` с `opacity: 0` при canvas — не держать интерактивный SVG с тысячами circle в DOM.
4. Проверить `mergeGrayHallUnmatchedPlacements` / `grayHallWhenNoOffers` — не добавляет ли лишние `previewOnly` точки поверх sellable.

---

### P2 — Editor bundle на проде

1. Бэкап перед deploy:  
   `cp -a backend/data/luzhniki-geodesy/hand/bundle-luzhniki-gray-cloud-labeled-seats.json /tmp/`
2. После deploy — восстановить или пересохранить из hover-редактора (`mode: editor-svg-extract`, seats > 0).
3. Опционально: deploy **не** делать `git reset --hard` для `hand/bundle-*.json` (skip-worktree / post-deploy restore) — отдельная задача DevOps.

---

## 5. Ключевые файлы

| Компонент | Путь |
|-----------|------|
| Checkout страница | `frontend/src/pages/public/TicketCheckoutPage.tsx` |
| Карта-схема | `frontend/src/components/tickets/TicketHallInteractiveBlock.tsx` |
| Стили карты | `frontend/src/components/tickets/TicketHallInteractiveBlock.module.css` |
| Sellable геодезия | `backend/utils/luzhnikiPbiletSellableGeodesy.js` |
| Bundle index | `backend/utils/luzhnikiGrayCloudLabeledIndex.js` |
| Adapt /map | `backend/services/luzhnikiFootballStageMap.js` |
| API map | `backend/routes/bilet.js` (`/stage/:stageId/map`) |
| Editor | `frontend/public/tools/luzhniki-gray-cloud-enriched-hover.html` |
| Bundle (hand) | `backend/data/luzhniki-geodesy/hand/bundle-luzhniki-gray-cloud-labeled-seats.json` |
| Диагностика | `backend/scripts/diag-gray-cloud-bundle-sellable.js` |
| Env пример | `backend/.env.example` (LUZHNIKI_*) |

---

## 6. Деплой

```bash
# Локально
git fetch origin --prune
git add -A && git status
git commit -m "fix(luzhniki): …"
git push origin main

# VPS
ssh root@91.229.9.229
cd /var/pokupka-biletov
./scripts/deploy-via-git.sh main
pm2 restart all --update-env
```

Проверка фронта: в DevTools → Network → `TicketHallInteractiveBlock-*.js` / `TicketCheckoutPage-*.js` — hash после деплоя **другой**, hard refresh (Ctrl+Shift+R).

---

## 7. Критерии «готово»

- [ ] Сектор A101 (и любой с офферами): в **списке** число мест = сумма `SeatList` по API для сеанса (± явно скрытые правила витрины).
- [ ] На **карте** число цветных точек = число sellable в `layout_json.sellableSeats`, сопоставленных с офферами (не больше офферов, не меньше без причины в unmatched).
- [ ] Серая чаша без лишних дублей; при zoom **нет** цветной заливки sector path.
- [ ] Hover показывает sector/row/seat/цену; клик toggles выбор; **зона клика = видимая точка**.
- [ ] Фильтр «Поиск сектора» режет **только список**; карта показывает sellable всего сеанса (или всего стадиона при обзоре — зафиксировать продуктово).
- [ ] Editor bundle на проде восстановлен **или** осознанно работаем на cloud/pbilet до следующего save.

---

*Документ создан по сессии checkout Лужников, 19.05.2026. Обновлять по мере закрытия P0.*
