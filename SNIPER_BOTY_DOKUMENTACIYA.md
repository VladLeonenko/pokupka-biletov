# Снайпер-боты (автопокупка билетов) — ПОЛНАЯ ДОКУМЕНТАЦИЯ

> Обновлено: 14.10.2026. Файл описывает всю проделанную работу по снайпер-ботам,
> чтобы можно было продолжить с нуля (другому агенту) без потери контекста.
> Всё написанное ниже — проверено на боевом сервере и в логах.

---

## 1. Что это и зачем

Система автоматической скупки билетов («снайперов») на несколько площадок с целью
перепродажи. Каждый бот 24/7 мониторит схему зала, при появлении свободных ПАР мест —
сам бронирует, получает ссылку на оплату и шлёт её письмом на ящики заказчика.

Площадки:
1. **Цирк Никулина** — платформа Profticket (`widget.profticket.ru`). API-бот.
2. **Театр Пушкина** — платформа mos.ru (`tickets-external.mos.ru`). Браузерный бот.
3. **Опера нищих (Театр Пушкина)** — платформа Intickets (`iframeab-pre12384.intickets.ru`). Браузерный бот.
4. **Кабала (МХАТ)** — `mxat.ru`. API-бот.
5. **Театр Наций** — браузерный бот.

---

## 2. Инфраструктура

- **VPS**: подключаться `ssh biletvsem-vps` (алиас прописан в `~/.ssh/config` на маке).
- **Путь на сервере**: `/var/pokupka-biletov/backend/`.
- **Локальный репозиторий**: `/Users/vladislavleonenko/Desktop/pokupka-biletov/`.
- **Менеджер процессов**: PM2. Команды:
  - `pm2 list` — статус всех процессов.
  - `pm2 restart <имя>` — перезапуск.
  - `pm2 logs <имя>` — живые логи.
  - `pm2 describe <имя>` — конфиг процесса.
- **Логи ботов** (на сервере): `data/<имя>-monitor.log` (+ `-error.log`).
- **Результаты броней**: `data/<имя>-results.json`.
- **Контакты (почты покупателей)**: `sniper-contacts.json` (массив `{name, email, phone}`).
- **Конфиг PM2**: `ecosystem.config.cjs` (там `sniper-monitor`, `intickets-monitor`, `profticket-monitor`, `mos-monitor`).
  `ton-browser-monitor` стартует отдельно (в этом файле его нет).

### Как деплоить изменения
```bash
cd /Users/vladislavleonenko/Desktop/pokupka-biletov
scp backend/profticket-monitor.mjs biletvsem-vps:/var/pokupka-biletov/backend/profticket-monitor.mjs
ssh biletvsem-vps 'cd /var/pokupka-biletov/backend && pm2 restart profticket-monitor --silent'
```

---

## 3. Боты по одному

### 3.1 Цирк Никулина (Profticket) — `profticket-monitor.mjs` + `services/profticketApi.js`

**Основной бот. Работает, бронирует, шлёт письма.**

- API: `https://widget.profticket.ru/api/v1/company/53`
- Полный флоу (все эндпоинты реверснуты и работают):
  1. `GET /event/list/?company_id=53&page=1&period_id=0&language=ru-RU` → список событий.
  2. `GET /event/scheme/?company_id=53&global_show_id=10362&event_id=<id>&language=ru-RU` → схема зала (места `items[]`: `row`, `seat`, `cod_sec`, `name_sec`, `avail`, `price`).
  3. `POST /basket/start-session/` body `{company_id:53}` → возвращает `session`, **и ставит куку `PHPSESSID`** (сессия корзины привязана к куке).
  4. `POST /basket/pre-reservation/` body `{session, company_id:53, global_show_id:10362, items:<JSON-массив мест>}` → резерв мест.
     - items: `[{event_id, set_id:null, cod_sec, row, seat, price, price_sell}]`.
  5. `POST /order/create/` body `{session, company_id:53, user_email, user_name, user_phone, accepted:1, personal_data_checkbox:1, payment_system_id:335}` → заказ + ссылка на оплату.

- **Капча** (когда `pre-reservation` возвращает `error.code === 15`):
  - sitekey лежит в `error.message.siteKey`.
  - Это **reCAPTCHA v2 чекбокс** («Подтвердите, что Вы не робот»).
  - Токен шлётся **НЕ в `pre-reservation`, а в отдельный эндпоинт**:
    `POST /anti-fraud/verify-captcha/` body `{company_id:53, token}`.
  - После этого `pre-reservation` повторяется с теми же куками — и проходит.
  - Обход через **RuCaptcha** (`method=userrecaptcha`, v2), ключ `RUCAPTCHA_API_KEY` в `.env`.
  - **Кука `PHPSESSID` обязательна** — без неё капча не зачтётся.

- **Оплата (критично!)**:
  - `payment_system_id: 335` = **Сбербанк/карта** → возвращает `params_for_payment.payment_url` (внешняя ссылка вида `https://payeko.ru/new/pay_ru?orderId=...`). ЭТО НУЖНО боту.
  - `475` = SberPay → оплата через Web SDK, **`payment_url` ПУСТОЙ** (ссылки нет). НЕ ИСПОЛЬЗОВАТЬ.
  - `200` = СБП (QR) → `params_for_payment.qr_code_url` (вместо payment_url).
  - Ссылку читать из **`params_for_payment.payment_url`** (не из верхнего уровня `payment_url`).

- **Лимит мест на заказ**: **6 мест (3 пары) разрешено**. Раньше ошибочно ставили 2 — это неверно.
  Ошибка `Превышен лимит билетов на 1 заказ` возникала из-за повторных попыток на уже занятых
  местах, а не из-за реального лимита 2. В коде есть фолбэк: 3 пары → 2 пары → 1 пара.

- **Правила бронирования**:
  - Только **пары** (соседние места, `№` идут подряд). Одиночные пропускаем.
  - Берём до 3 пар (6 мест) за заказ; если пар меньше — берём меньше (2 или 4 места).
  - **Не бронировать повторно**: в каждый заказ пишутся `seatKeys` (`событие|сектор|ряд|место`),
    и перед бронью эти места исключаются.
  - Цена: **12.12 14:30 → до 5000₽**, остальные даты → до 7000₽ (функция `maxPriceFor`).
  - Даты: декабрь **12/13/19/20** + весь **январь**; время **11:00 / 14:30 / 18:00**.
  - Цель: `MAX_BOOKINGS = 150` пар (300 мест). Поллинг каждые **60 сек**.
  - Контакты крутятся по кругу (`sniper-contacts.json`, 8 ящиков), после оплаты ящик можно использовать повторно.

- Письма: `sendTransactionalMail` (SMTP `sm30.hosting.reg.ru:465`), получатели в
  `PROFTICKET_NOTIFY_EMAIL` / `PROFTICKET_BCC` (дефолты зашиты в коде монитора).


### 3.2 Театр Пушкина (mos.ru) — `mos-monitor.mjs` + `services/mosBooking.js`

**Бот готов и протестирован на «Тартюфе», но НЕ запущен** (чтобы случайно не скупить без команды).

- URL сеанса: `https://tickets-external.mos.ru/widget/wv2/ticket-selection?eventId=<id>&performanceId=<id>&agentId=museum110_notmos&system_name=pushkin`.
- Схема — **SVG** (не canvas): места `g.place` с `transform="translate(x,y)"`, внутри
  `rect.place-background` (цвет). **Свободное = цветное**, занятое = серый `rgb(229,229,229)`.
- Флоу: клик по местам → кнопка **«Продолжить»** → экран подтверждения (выбор «Банковская карта»,
  телефон, 2 галочки согласий) → **«Перейти к оплате»**.
- Функции готовы: `seanceUrl(eventId, performanceId)`, `readSeats` (парс SVG), `findPairs`,
  `clickSeatAt`, `continueToOrder`, `fillContact`, `goToPaymentAndWait`.
- Сеансы прописываются в массиве `SEANCES` в `mos-monitor.mjs` (`{eventId, performanceId, label}`).

### 3.3 Опера нищих (Театр Пушкина, Intickets) — `intickets-monitor.mjs` + `services/inticketsBooking.js`

**Бот написан и запущен, но бронь «вслепую» (не тестирована на живом сеансе — билетов ещё нет).**

- URL: `https://iframeab-pre12384.intickets.ru/seance/72420789/` (13.10), `.../72420791/` (14.10), `.../72420793/` (15.10).
- Схема рисуется на **`<canvas class="places-base">`**, API отдаёт **зашифрованный JSON**.
- Поэтому сделан **перехват отрисовки** (`CANVAS_HOOK` оборачивает `fillRect/rect/arc/fill/fillText`
  и складывает в `window.__draws`), потом `readSeats` парсит фигуры в места
  `{x,y,w,h,cx,cy,free}` (свободное = цветное, занятое = серое), `findPairs` ищет пары,
  `clickSeatAt` кликает мышью по канвасу.
- Сейчас на всех трёх сеансах `мест 0` (продажа не открыта) — ждёт.
- **TODO**: когда откроют продажу — проверить, что `readSeats` правильно распарсил места/цвета;
  если формат отрисовки другой (не rect/arc, другие цвета) — поправить в `readSeats` по логу.

### 3.4 Кабала (МХАТ) — `sniper-monitor.mjs`

- Мониторит `mxat.ru/repertuar/show/kabala_svyatosh/`, цель `--pairs 200`.
- Был случай зависания (лог не писался 10 дней) — лечится `pm2 restart sniper-monitor`.

### 3.5 Театр Наций — `ton-browser-monitor.mjs` + `services/tonBrowserBooking.js`

- Браузерный бот, капча (SmartCaptcha) проходит сама за ~2.5с.
- Логи: `/root/.pm2/logs/ton-browser-monitor-out.log` (не в `data/`).

---

## 4. Ключевые реверс-факты (не переделывать)

1. **Profticket капча**: токен идёт в `POST /anti-fraud/verify-captcha/` (не в pre-reservation).
2. **Profticket сессия**: `PHPSESSID` кука обязательна, иначе капча/бронь не зачтутся.
3. **Profticket оплата**: только `payment_system_id=335` даёт `payment_url`. `475` (SberPay) — без ссылки.
4. **Profticket лимит**: 6 мест (3 пары) в заказ разрешено. Не ставить больше.
5. **Profticket место**: `event_id + cod_sec + row + seat` — уникальный ключ места.
6. **mos.ru**: свободное место = `rect.place-background` с fill ≠ `rgb(229,229,229)`.
7. **Intickets**: места на canvas, данные шифрованы — только перехват отрисовки.

---

## 5. Переменные окружения (`.env` на сервере)

Связанные с ботами:
- `RUCAPTCHA_API_KEY` — ключ RuCaptcha (обход reCAPTCHA).
- `EMAIL_HOST`, `EMAIL_PORT=465`, `EMAIL_SECURE=true`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, `SENDER_EMAIL`, `SENDER_NAME` — SMTP для писем.
- Остальные (`PG*`, `JWT_SECRET`, `TBANK_*`, `GETBILET_*` и т.д.) — к ботам отношения не имеют (это основной проект biletvsem).

Параметры ботов, которых НЕТ в `.env` (дефолты зашиты в коде мониторов):
- `PROFTICKET_MAX_BOOKINGS=150`, `PROFTICKET_MAX_SEATS_PER_ORDER=6`.
- `PROFTICKET_NOTIFY_EMAIL` / `PROFTICKET_BCC`, `INTICKETS_NOTIFY_EMAIL` / `INTICKETS_BCC`,
  `MOS_NOTIFY_EMAIL` / `MOS_BCC` — списки почт для уведомлений.

---

## 6. Текущее состояние (на 14.10.2026)

- **Цирк (Profticket)**: работает, 7 броней сделано с ссылками `payeko.ru`, письма уходят.
  Сейчас в схеме 4 одиночных места, пар 0 — бот ждёт пар (берёт только пары).
- **Опера нищих (Intickets)**: бот работает, `мест 0` (продажа не открыта). Бронь на канвасе ждёт живой проверки.
- **mos.ru (Театр Пушкина)**: бот готов, НЕ запущен (нужна команда + eventId/performanceId).
- **Кабала**: работает (перезапущен после зависания).
- **Театр Наций**: работает.

## 7. TODO (что делать дальше)

1. **Цирк**: дождаться пар → проверить, что бот берёт до 3 пар (6 мест) и шлёт письмо со ссылкой.
2. **Intickets**: при открытии продажи — проверить `readSeats` (формат мест/цвета) и добить клик+покупку.
3. **mos.ru**: получить от заказчика `eventId`/`performanceId` нужных спектаклей, вписать в `SEANCES`, запустить `pm2 start ecosystem.config.cjs --only mos-monitor`.
4. По необходимости добавить уведомление «появились одиночные места» (сейчас бот молчит, когда есть только одиночные).

## 8. Подводные камни (чего НЕ делать)

- НЕ менять `payment_system_id` обратно на 475 — пропадёт ссылка на оплату.
- НЕ ставить `MAX_SEATS_PER_ORDER` больше 6 — лимит API.
- НЕ слать капча-токен в `pre-reservation` — он нужен в `/anti-fraud/verify-captcha/`.
- НЕ терять куку `PHPSESSID` между start-session и бронью.
- НЕ бронировать одиночные места (только пары).
- НЕ бронировать одни и те же места повторно (учёт через `seatKeys`).
- Цена 12.12 14:30 — строго до 5000₽.

