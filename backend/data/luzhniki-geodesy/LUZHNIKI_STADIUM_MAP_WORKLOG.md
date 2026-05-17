# Лужники — интерактивная схема зала (worklog)

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

**Данные (если обновляете tickets.json / полную геодезию):**

```bash
cd /var/www/pokupka-biletov/backend
LUZHNIKI_PBILET_TICKETS_JSON=/path/to/tickets.json \
LUZHNIKI_PBILET_COORDINATES_JSON=/path/to/luzhniki.txt \
npm run seed:luzhniki-football-map
```

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
