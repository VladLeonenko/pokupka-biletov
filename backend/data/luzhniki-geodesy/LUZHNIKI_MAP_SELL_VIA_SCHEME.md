# Лужники — продажа через схему (без полного pbilet tickets)

Цель: **все sellable GetBilet кликабельны на карте**, удобно с **мобилки**. Визуал: **`luzhniki.txt`** (77k серая чаша) + **`tickets.json`** (геодезия sellable + сектора).

## Данные

| Файл | Роль |
|------|------|
| `luzhniki.txt` | `coordinates` → `layout_json.allSeatCoordinates` (~77415 точек) |
| `tickets.json` | `sectors` + частичные `r[].s[]` (~6132) → seed `layout.seats` |
| GetBilet live | `sellableSeats` на API карты (~90% strict+якоря+dot, остальное — grid на фронте) |

Полный `tickets.json` на 81k pbilet **не отдаёт** для сеанса — это лимит API, не баг сида.

## Три слоя sellable на карте

1. **Strict** — сектор+ряд+место есть в `layout.seats` / `sellableSeats`.
2. **Бэкенд** — якорная интерполяция + точки в bbox сектора (`hallSeatGeodesyFromDots.js`).
3. **Фронт** — `buildSellableGeodesyPlacementsWithSectorGridFallback`: офферы без координат → сетка **внутри bbox** полигона сектора (все места на схеме, не только в списке).

## Визуал чаши

- Canvas: **`allSeatCoordinates`** (luzhniki.txt), не только 6k из tickets.
- Цветные точки: только места с оффером GetBilet.

## Мобилка

- Нижний **bottom sheet** с рядами/местами (не `display: none`).
- Крупнее touch-targets на точках и кнопках мест.
- Зум к сектору с учётом нижней панели (`focusLayerPoint`).

## Сид на VPS

```bash
cd /var/pokupka-biletov/backend
LUZHNIKI_PBILET_TICKETS_JSON=/var/pokupka-biletov/tickets.json \
LUZHNIKI_PBILET_COORDINATES_JSON=/var/pokupka-biletov/luzhniki.txt \
npm run seed:luzhniki-football-map
pm2 restart all --update-env
```

## Проверка геодезии

```bash
cd backend
node scripts/verify-offer-seat-geodesy.js 6a05d17b46a4d000309ecf4e
# matched ~400+ из ~470 (бэкенд); на фронте после grid — ближе к 100% офферов
```

## Проверка pbilet API

```bash
cd backend
PBILET_LAYOUT_ID=2564 npm run fetch:pbilet-luzhniki
# + PBILET_TICKETS_URL='https://api.pbilet.net/public/v2/tickets?...' из Network
```

## Деплой

```bash
# локально
git add -A && git status
git commit -m "feat(luzhniki): полная чаша + все sellable на карте и мобилка"
git push origin main

# VPS
ssh root@YOUR_SERVER
cd /var/pokupka-biletov && git pull
cd backend && npm ci
LUZHNIKI_PBILET_TICKETS_JSON=/var/pokupka-biletov/tickets.json \
LUZHNIKI_PBILET_COORDINATES_JSON=/var/pokupka-biletov/luzhniki.txt \
npm run seed:luzhniki-football-map
cd ../frontend && npm ci && npm run build
pm2 restart all --update-env
```

## Ключевые файлы

- `backend/utils/hallSeatGeodesyFromDots.js`
- `backend/services/luzhnikiFootballStageMap.js`
- `frontend/src/utils/svgNativeSeatLayout.ts` — grid fallback
- `frontend/src/components/tickets/TicketHallInteractiveBlock.tsx` + `.module.css`
- `backend/scripts/fetch-pbilet-luzhniki-tickets.js`
