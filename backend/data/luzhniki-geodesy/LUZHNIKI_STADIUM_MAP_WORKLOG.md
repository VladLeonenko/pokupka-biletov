# Лужники — интерактивная схема зала (worklog)

**Продажа через схему (без 81k pbilet):** см. [LUZHNIKI_MAP_SELL_VIA_SCHEME.md](./LUZHNIKI_MAP_SELL_VIA_SCHEME.md)

### Май 2026 — sellable «уезжали» при идеальной чаше

**Симптом:** серая чаша 77k ок, цветные точки офферов не на местах.

**Фикс:** layout-first (`tickets.json` → `layoutBaseSeats`), на карте только `strict` + `anchor`; dot/dotOnly и grid bbox отключены. Anchor только внутри `[minRow..maxRow]` сектора. Детали — в scheme doc выше.

**Файлы:** `hallSeatGeodesyFromDots.js`, `svgNativeSeatLayout.ts` (`buildLuzhnikiMapSellablePlacements`), `TicketHallInteractiveBlock.tsx`. После деплоя — **пересид** `seed:luzhniki-football-map`.

### Май 2026 — точность svgRow + покрытие всех sellable

**Симптом 1:** ряд 11 на подписи «ряд 1» (A 101 и др.).  
**Причина:** cloud мапил `rowMin` из минимального ряда в офферах, а не с 1.  
**Фикс:** `inferCloudSectorRowRange` — шкала **1 … max(офферы, полосы)**.

**Симптом 2:** после svgRow на карте только часть sellable.  
**Причины:**
- `canCloud`/`canSvgRow` требовали `anchors.length < 2` → сектора с частичным `tickets.json` (D227 и др.) не получали svgRow/cloud.
- Порог `sectorDots >= 24` отсекал мелкие сектора.
- Провал `pickDotNearRowSeat` отбрасывал место целиком.

**Фикс (покрытие без потери точности):**
| Шаг | `geodesySource` | Когда |
|-----|-----------------|--------|
| 1 | `strict` | есть в `tickets.json` |
| 2 | `dot` | частичные якоря + облако |
| 3 | `svgRow` | подпись ряда на SVG pbilet + точка чаши |
| 4 | `cloud` | калибровка без подписи |
| 5 | `cloudSnap` | snap к чаше по Y (svg/cloud), если 3–4 не дали hit |

Дополнительно: `fillMissingSectorDotsFromCloud` (расширенный bbox), margin bbox 0.38, svgRow/cloud **разрешены при частичных якорях**.

**Pbilet full tickets:** повторный fetch — API без `event_source_id`/`event_date_id` по-прежнему ~6k мест; полный JSON недоступен.

**Деплой:** `git pull` + `pm2 restart` (+ `frontend build` для `cloudSnap` в trusted). Пересид не обязателен.

**Файлы:** `hallSeatGeodesyFromDots.js`, `hallSeatGeodesyFromSvgRows.js`, `luzhnikiFootballStageMap.js`, `svgNativeSeatLayout.ts`.

### Май 2026 — sector-native: ряд/место на точках сектора

**Зафиксировано:** на карте отображаются **все** sellable GetBilet (полное покрытие).

**Симптом:** тултип «ряд 38» на визуальном ряду 1 (подписи SVG с противоположной стороны от поля); место 6 не шестая точка слева.

**Правила:**
- Ряд **1** — полоса точек **ближе всего к центру арены** (взгляд с поля).
- Ряд N — `round((N-1)/(maxRow-1)*(bands-1))` по полосам, отсортированным к полю.
- Место **1** — первая точка ряда **слева направо** (`seatLeftAxisFromSector`).
- Не использовать Y подписей SVG напрямую (на A101 давало ряд 11 внизу чаши).

**Код:** `hallSeatGeodesySectorNative.js` — `svgRow` / `cloudSnap` с той же осью мест.

**Деплой:** backend `pm2 restart` + **frontend build** (иначе старые координаты из `layout.seats`).

### Май 2026 — фронт: sellable при пане + приоритет /map

**Симптом 1:** зум в сектор → панорамирование → пропали точки других секторов.  
**Фикс:** `luzhnikiCheckout` → `visibleNativePlacements` без фильтра по `selectedSector`.

**Симптом 2:** backend sector-native задеплоен, на сайте старые Y.  
**Причины:** (1) не был `npm run build` фронта; (2) `layoutJsonForStage` брал контекст без `sellableSeats` с `/map`; (3) `buildLuzhnikiMapSellablePlacements` ставил `layout.seats` **выше** live `sellableSeats`.  
**Фикс:** всегда fetch `/map` для `luzhniki-football`; merge sellable из map; server-first в placements.

**Симптом 3:** инверсия SVG row→Y ставила ряд 11 вниз сектора.  
**Фикс:** `sortSectorRowBandsFromField` + `rowNumToBandIndex` (не Y с `<tspan>`).

---

Страница: [Суперфинал Кубка России — Спартак / Краснодар](https://biletvsem.com/ticket/superfinal-fonbet-kubka-rossii-spartak-krasnodar)  
Эталон UX: [portalbilet — финал Кубка России](https://portalbilet.ru/msk/final-kubka-rossii-po-futbolu)

Ключ схемы в БД: `getbilet_stage_maps.stage_external_id = luzhniki-football`

---

## Задачи от заказчика (хронология)

### 1. Места пропадают на карте при зуме / вообще нет точек

**Симптом:** на чекауте пустая или почти пустая схема; после выбора сектора точек нет.

**Причины (найденные):**

- Фильтр sellable по **названию полигона** (`Категория 2`) vs **код трибуны в GetBilet** (`сектор d227`) → 0 совпадений после клика по зоне.
- Флаги `omitClientSeatCoordinateCloud` + `disableStadiumCanvas` отключали серую чашу (~77k) и canvas.
- `visibleNativePlacements` скрывали все места до выбора сектора.

**Что сделали:**

- Фильтр мест при выбранном секторе — по **bbox path** полигона, не по строке label.
- Вернули portalbilet-визуал: canvas + `uniformHallSeatAppearance`, серая чаша без зума.
- На обзоре снова видны все sellable; при клике по зоне — только места внутри полигона.

**Файлы:** `TicketHallInteractiveBlock.tsx`, `ticketHallMapInteraction.ts`, `luzhnikiFootballStageMap.js`

---

### 2. Правила под стадион Лужники; GetBilet `D230` vs наш `d 230`

**Задача:** отдельные правила; сопоставление секторов GetBilet и подписей на схеме.

**Что сделали:**

- `.cursor/rules/luzhniki-stadium-map.mdc` — правила для агента/разработки.
- `frontend/src/utils/luzhnikiStadiumMap.ts` — флаги `stadiumMapKey`, `luzhnikiStadiumCheckout`.
- `ticketHallSectorNormalize` (фронт + бэкенд): `сектор D230`, `D-218`, `d 230` → ключ `d230`; место `08` = `8`.

---

### 3. Визуал как portalbilet: мелкие точки без зума; секторы цветом только на 100% + hover

**Задача:**

- Серые точки аккуратные, видны сразу (без зума).
- Цветные — доступные к продаже, по ценовой группе.
- Заливка секторов (категорий) **только** при масштабе 100% и наведении; иначе — только места.

**Что сделали:**

- Canvas: `drawBackgroundDots` при `bg.length >= 8000` или `hallBackgroundFromLabeledSeats`.
- CSS `sectorLayerFitOverview` + `sectorPathFitMuted` — полигоны прозрачны, цвет на `:hover`.
- Вернули отображение sellable на обзоре стадиона (не прятать до клика по сектору).

---

### 4. Sellable «не на своём месте» (ряд 32 → кружок у ряда 29)

**Симптом:** tooltip «32 ряд, 21 место», точка визуально у ряда 29; боковые трибуны «летают».

**Причина:** координаты sellable **додумывались** интерполяцией по облаку `allSeatCoordinates` (~77k точек **без** подписи ряд/место). На овале линейная калибровка X/Y ломается.

**Что сделали:**

- **Отключена** интерполяция по `allSeatCoordinates` и экстраполяция рядов.
- Sellable **только** из `layout.seats`: точное совпадение `сектор + ряд + место` → `xPct/yPct` из pbilet (`buildSellableSeatGeodesy`).
- Улучшен lookup ключей (`labeledSeatLookupKeys`, `08`/`8`, `D-218`).

**Файлы:** `hallSeatGeodesyMatch.js`, `hallSeatGeodesyFromDots.js` (обёртка без «dot»-матчинга)

---

### 5. Половина мест из списка не на карте

**Симптом:** в панели сектора 13 мест, на карте ~6 цветных точек.

**Причина (данные, не только UI):**

- В БД `layout.seats` ≈ **6132** места из снимка pbilet `tickets.json` (частичный API-снимок, не весь стадион).
- Пример **Сектор D 218** в `tickets.json`: ряды **19, 21, 23, 29, 31, 33** — рядов **15, 27, 28** в снимке **нет**, хотя они есть в GetBilet.
- Раньше для таких рядов рисовались **ложные** точки (интерполяция) → убрали; в списке остаются, на карте нет.

**Честное правило:** не рисовать место без подписи в геодезии; не врать координатой.

---

### 6. Текущая задача: все точки как места из tickets.json (не безымянное облако)

**Задача:** схема визуально верная; каждая точка на чаше должна быть **аналогом места из tickets.json** (сектор, ряд, место, координаты), а не просто пикселем из `coordinates` без смысла.

**Что сделали (код):**

- Флаг `hallBackgroundFromLabeledSeats: true` в `layout_json` (сид + `adaptLuzhnikiStageMapForLiveOffers`).
- Фронт: `parseBackgroundSeatCoordinates` **сначала** берёт `layout.seats`, потом fallback на `allSeatCoordinates`.
- Серая чаша на canvas = те же координаты, что и в `tickets.json` → `layout.seats`.
- Цветные sellable = подмножество тех же мест, совпавших с оффером GetBilet по ключу.

**Ограничение:** в репозитории `tickets.json` содержит **6132** места / **240** секторов. Это **весь** текущий файл, не 81k. Для полного стадиона нужен **полный** экспорт pbilet tickets + пересид `seed:luzhniki-football-map`.

---

## К чему пришли (архитектура)

```
┌─────────────────────────────────────────────────────────────┐
│  SVG подложка (чаша стадиона, без circle place-name на проде) │
├─────────────────────────────────────────────────────────────┤
│  Canvas: серая чаша = layout.seats (из tickets.json)         │
│          каждая точка = sector + row + seat + xPct/yPct      │
├─────────────────────────────────────────────────────────────┤
│  Canvas/DOM: цветные = sellableSeats (subset + GetBilet)     │
│              только strict match по ключу места              │
├─────────────────────────────────────────────────────────────┤
│  SVG sectorLayer: полигоны зон; цвет только 100% + hover     │
└─────────────────────────────────────────────────────────────┘
```

### Источники данных

| Поле | Источник | Назначение |
|------|----------|------------|
| `layout.seats` | pbilet `tickets.json` → `extractPbiletTicketsSeatGeodesy` | **Подписанные** места (фон + lookup sellable) |
| `allSeatCoordinates` | pbilet `coordinates.json` (~77k `{x,y}`) | Запасной фон; **не** использовать для sellable |
| `sellableSeats` | `buildSellableSeatGeodesy(layout.seats, offers)` | Цветные точки на чекауте |
| `sectorMode.sectors` | path полигонов | Клик по зоне, hover, bbox-фильтр |

### Ключевые флаги `layout_json`

| Флаг | Значение | Смысл |
|------|----------|--------|
| `stadiumMapKey` | `luzhniki-football` | Каноническая схема |
| `uniformHallSeatAppearance` | `true` | Серая чаша + цвет только у sellable |
| `hallBackgroundFromLabeledSeats` | `true` | Фон = `layout.seats`, не 77k cloud |
| `sellableSeatsLabeledOnly` | `true` | Без интерполяции координат |
| `preferLayoutSeatPositions` | `true` | Координаты с бэкенда |
| `omitClientSeatCoordinateCloud` | `false` | Не отключать фон |
| `disableStadiumCanvas` | `false` | Canvas включён |

---

## Основные файлы

| Область | Путь |
|---------|------|
| UI схемы | `frontend/src/components/tickets/TicketHallInteractiveBlock.tsx` |
| Стили | `frontend/src/components/tickets/TicketHallInteractiveBlock.module.css` |
| Правила Лужники (фронт) | `frontend/src/utils/luzhnikiStadiumMap.ts` |
| Нормализация секторов | `frontend/src/utils/ticketHallSectorNormalize.ts` |
| Bbox секторов | `frontend/src/utils/ticketHallMapInteraction.ts` |
| Адаптация под офферы | `backend/services/luzhnikiFootballStageMap.js` |
| Strict sellable | `backend/utils/hallSeatGeodesyMatch.js` |
| Извлечение из pbilet | `backend/utils/luzhnikiPbiletGeodesyExtract.js` |
| Сид геодезии | `backend/scripts/seed-luzhniki-football-geodesy.js` |
| Правила Cursor | `.cursor/rules/luzhniki-stadium-map.mdc` |
| Инструкция сидов | `backend/data/luzhniki-geodesy/README.md` |

---

## Деплой

**Код (фронт + бэкенд):**

```bash
git add -A
git commit -m "fix(luzhniki): фон чаши из layout.seats (tickets.json), worklog"
git push origin main
ssh root@91.229.9.229 "cd /var/www/pokupka-biletov && ./scripts/deploy-via-git.sh main"
```

**Порог сида:** по умолчанию `LUZHNIKI_GEODESY_MIN_SEATS=4000` (частичный `tickets.json` ~6k мест). Для полного стадиона ~81k: `LUZHNIKI_GEODESY_MIN_SEATS=80000`.

**Данные (геодезия на VPS):**

Путь на сервере часто `/var/pokupka-biletov`, не `/var/www/...`.  
`../tickets.json` из `backend/` **не работает** — скрипт резолвит от корня репо и ищет `/var/tickets.json`.

```bash
# локально — скопировать файлы на сервер
scp tickets.json luzhniki.txt root@YOUR_SERVER:/var/pokupka-biletov/

# на сервере
cd /var/pokupka-biletov/backend
LUZHNIKI_PBILET_TICKETS_JSON=/var/pokupka-biletov/tickets.json \
LUZHNIKI_PBILET_COORDINATES_JSON=/var/pokupka-biletov/luzhniki.txt \
npm run seed:luzhniki-football-map
```

Без `../` — относительно корня репо: `LUZHNIKI_PBILET_TICKETS_JSON=tickets.json` (если cwd = корень проекта).

**CORS на проде:** в `backend/.env` добавить  
`CORS_ORIGIN=https://biletvsem.com,https://www.biletvsem.com,http://localhost:5173`  
и `pm2 restart all`. Ошибки в Safari при открытии с **localhost** на прод-API — это ожидаемо; открывайте сайт с `https://biletvsem.com`.

После сида в `layout_json` окажутся актуальные `seats` (все места из файла) и при необходимости `allSeatCoordinates`.

---

## Открытые шаги (если нужно «все» места GetBilet на карте)

1. Получить **полный** `tickets.json` с pbilet (все ряды всех трибун, не только ~6k sellable snapshot).
2. Пересид `luzhniki-football` в прод-БД.
3. Проверить `GET /api/bilet/stage/luzhniki-football/map?repertoireId=...` → `layout.seats.length`, `offerSeatGeodesy.matched` / `totalSellable`.
4. Опционально: встроить в SVG `circle` с `place-name` / `row` / `place` для каждого `layout.seats` (как в `luzhnikiFootballNativeGenerator`) — запасной путь для `svgNative` без canvas.

---

## Метрики для проверки после деплоя

```bash
curl -sS 'https://biletvsem.com/api/bilet/stage/luzhniki-football/map?repertoireId=6a05d17b46a4d000309ecf4e' | jq '{
  seats: (.layout_json.seats | length),
  sellable: (.layout_json.sellableSeats | length),
  labeledBg: .layout_json.hallBackgroundFromLabeledSeats,
  geodesy: .layout_json.offerSeatGeodesy
}'
```

Ожидание: `labeledBg: true`, `sellable` ≤ `seats`, matched sellable близко к числу мест в офферах **которые есть в seats**.

---

*Документ собран по сессии доработки схемы Лужников, май 2026.*
