# Геодезия стадиона «Лужники» (~81k мест)

Репозиторий **не содержит** самих координат — только код импорта. Полная чаша делается **одним файлом или парой снимков pbilet**, которые ты добавляешь локально/на CI (или хранишь как секретный артефакт). Из **GetBilet** приходит только наличие — этого недостаточно для отрисовки всех точек.

## Вариант A — один bundle (`LUZHNIKI_GEODESY_BUNDLE_JSON`)

Файл JSON рядом с репо или абсолютный путь:

```json
{
  "hallWidth": 586,
  "hallHeight": 505,
  "source": "pbilet-full-hall-or-CAD-export",
  "svgMarkup": "<svg xmlns=...>...</svg>",
  "sectors": [
    { "id": "uuid-or-slug", "label": "Название зоны", "path": "M ... Z" }
  ],
  "seats": [
    { "sector": "Как в оффере GetBilet Sector", "row": "10", "seat": "12", "x": 120.5, "y": 200.3 }
  ]
}
```

- Координаты **`x`/`y`** — в той же системе, что **`hallWidth`/`hallHeight`** (абсолютные пиксели схемы).
- Альтернатива: **`xPct`/`yPct`** (0–100 или 0–1), тогда `hallWidth`/`hallHeight` всё равно нужны для метаданных и проверок.
- **`svgMarkup`** или поле **`bgSvgPath`** (путь к SVG в репо) или переменная окружения **`LUZHNIKI_GEODESY_SVG_PATH`** — подложка чаши.

Запуск из каталога `backend`:

```bash
LUZHNIKI_GEODESY_BUNDLE_JSON=data/luzhniki-geodesy/your-bundle.json npm run seed:luzhniki-football-map
```

Порог объёма по умолчанию: **`LUZHNIKI_GEODESY_MIN_SEATS=80000`**. Для строгих 81k:

```bash
LUZHNIKI_GEODESY_MIN_SEATS=81000 LUZHNIKI_GEODESY_BUNDLE_JSON=... npm run seed:luzhniki-football-map
```

## Проверка: что отдаёт pbilet (скрипт)

```bash
cd backend

# coordinates 2564 + аудит локального tickets.json
PBILET_LAYOUT_ID=2564 npm run fetch:pbilet-luzhniki

# + живой tickets (URL из DevTools → Network целиком):
PBILET_TICKETS_URL='https://api.pbilet.net/public/v2/tickets?currency_code=RUB&lang=ru&event_source_id=...&event_date_id=...&source_id=2' \
  PBILET_OUTPUT=../tickets-pbilet-live.json \
  npm run fetch:pbilet-luzhniki

# подсказка schemeId со страницы SSD-донора:
SSD_EVENT_PAGE_URL='https://luzhniki-tickets.online/football/cup-of-russia/57057/' npm run fetch:pbilet-luzhniki
```

Скрипт печатает `geodesySeats` (места с x/y в дереве). Если **≥ 75000** — полный стадион; если **~6k** — тот же частичный снимок, что и `tickets.json` в репо.

## Вариант B — два снимка pbilet (файлы без коммита в git)

1. Сохранить ответ **`GET …/public/v1/hall-layouts/<id>/coordinates`** → `coordinates.json` (нужны `width`, `height`, `bg`, `categories`).
2. Сохранить ответ **`GET …/public/v2/tickets?event_source_id=…&event_date_id=…`** → `tickets-full.json`.

Важно: в **`tickets`** в дереве `sectors[].r[].s[]` должны быть **все** места стадиона с полями **`x`/`y`** и подписями сектор/ряд/место — иначе это всё ещё не «полная геодезия». Если донор отдаёт только продаваемые места, нужен другой источник или объединение нескольких полных выгрузок (вне этого репо).

```bash
LUZHNIKI_PBILET_TICKETS_JSON=./tickets-full.json \
LUZHNIKI_PBILET_COORDINATES_JSON=./coordinates.json \
npm run seed:luzhniki-football-map
```

Подложка SVG: из **`coordinates.bg`** (скачивается скриптом) или **`LUZHNIKI_GEODESY_SVG_PATH`**.

### Частичный снимок (только места из ответа tickets, без полной чаши)

Если в **`tickets`** только доступные / выставленные места (~6k и т.д.), порог **`LUZHNIKI_GEODESY_MIN_SEATS`** можно понизить или использовать скрипт с порогом **4000**:

```bash
cd backend
LUZHNIKI_PBILET_TICKETS_JSON=../tickets.json \
LUZHNIKI_PBILET_COORDINATES_JSON=../luzhniki.txt \
npm run seed:luzhniki-football-map-partial
```

Секторы-ложи без рядов учитываются, если у сектора заданы **`seat_x`** / **`seat_y`** (одна точка на сектор, место условно **`1`**, ряд **`—`**).

В **`coordinates`** pbilet часто есть массив **`coordinates`** (~77k точек `{x,y}` без подписей). Сид кладёт его в **`layout_json.allSeatCoordinates`** — на чекауте отрисовывается **полная чаша** серыми маркерами, а подписанные места из **`tickets`** накладываются сверху для клика/цен.

При этом **`uniformHallSeatAppearance: true`** — полная чаша из **`coordinates`** и точки без оффера остаются **единым серым** стилем; места, пришедшие в офферах **GetBilet**, на схеме красятся **`colorForSeat(price)`** (разные цвета по цене).

Отключить фоновые точки: **`LUZHNIKI_SKIP_COORDINATE_DOTS=1`**.

## Согласование с GetBilet

Строки **`sector` / `row` / `seat`** в bundle должны совпадать с тем, как они приходят в офферах (с учётом fuzzy-сопоставления на фронте). Иначе точки будут, а клики по продаваемым местам не попадут в офферы.

## Sellable на карте (чекаут)

- Цветные места ставятся **только** если в `layout.seats` есть **тот же** сектор+ряд+место (координаты pbilet).
- **Не** интерполируем по серому облаку `allSeatCoordinates` — на овале боковые трибуны съезжают.
- Частичный снимок `tickets.json` (~6k мест) покрывает не все ряды GetBilet (пример: D218 в pbilet только ряды 19,21,23,29,31,33 — ряды 15/27/28 в списке офферов на карте не появятся). Нужен **полный** экспорт tickets с pbilet для ~81k или хотя бы всех рядов трибун.

## Демо-синтетика (не для прода)

Для тестов без реального файла:

```bash
npm run seed:luzhniki-football-synthetic
```
