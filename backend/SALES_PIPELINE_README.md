# Пайплайн холодных лидов (Sales Pipeline)

Лиды импортируются **в таблицу клиентов** (`clients`). Обработка забирает оттуда записи с `pipeline_stage = 'new'`.

---

## Что такое Cron и что он делает

**Cron** — планировщик задач **на сервере** (Linux). Задача выполняется на сервере, **не на твоём ПК**, поэтому **работает даже когда компьютер выключен** (достаточно, чтобы backend был запущен на сервере).

**На Cron висит одна задача:** ежедневный вызов `GET /api/sales-pipeline/process-daily`. Этот один запуск выполняет **весь исходящий поток**:

1. Берёт из базы клиентов с `pipeline_stage = 'new'` (до 10 штук).
2. Для каждого: определяет сайт (из поля `website` или из домена корпоративного email).
3. **Корпоративный email** (домен не gmail/yandex/mail.ru и т.п.): скачивает сайт → AI-аудит → извлечение телефона → выбор шаблона по потенциалу → отправка через UniSender (Telegram, если найден телефон, иначе Email).
4. **Личная почта** (или нет сайта): отправка базового шаблона без аудита (тоже через UniSender/Email).
5. Логирование в `client_outreach_log`, обновление `pipeline_stage` на `email_sent`.

Отдельно от Cron работают: **импорт лидов** (ты загружаешь CSV или вызываешь API) и **обработка ответов** (ручной вызов `POST /api/sales-pipeline/process-reply` или будущий webhook с почты). Бриф перед встречей и автосоздание Zoom/Calendar при желании можно добавить отдельными задачами позже.

---

## Пошагово: что от тебя нужно

### Шаг 1. Применить миграции

На сервере (или локально, где крутится backend):

```bash
cd /var/www/primecoder-gulp/backend   # или твой путь
node scripts/apply-migrations-to-db.js
```

Должна примениться миграция `064_sales_pipeline_from_clients.sql`: в таблицу `clients` добавятся поля `website`, `pipeline_stage`, `audit_score`, `business_potential`, `audit_summary`, `last_outreach_at`, `last_reply_at` и таблицы `client_outreach_log`, `client_correspondence`, `client_meetings`.

---

### Шаг 2. Настроить переменные окружения

В **backend** в файле **`.env`** (в корне backend, рядом с `app.js`) добавь или проверь:

| Переменная | Обязательно | Зачем |
|-----------|-------------|--------|
| `OPENAI_API_KEY` | да | Аудит сайта и разбор ответов (у тебя уже есть). |
| `OPENAI_PROXY_URL` | по необходимости | Прокси для OpenAI (у тебя уже есть). |
| **UniSender (рассылки)** | | |
| `UNISENDER_API_KEY` | да | Ключ API UniSender. Без него письма не уйдут через UniSender. |
| `SENDER_EMAIL` | да | С какого ящика идут письма (например `sales@yourdomain.com`). |
| `SENDER_NAME` | да | Имя отправителя (например «Команда PrimeCoder»). |
| `UNISENDER_CHANNEL_ID` | по желанию | ID Telegram-канала в UniSender (например `398059676`). Если задан и с сайта найден телефон — сначала отправка в Telegram, при неудаче — email. |
| `UNISENDER_LIST_ID` | нет | Опционально для sendEmail. |
| **Запасной канал** | | |
| `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS` | нет | Если UniSender недоступен или не настроен — fallback на SMTP (nodemailer). |
| **Cron** | | |
| `CRON_SECRET` | рекомендуется | Секрет для вызова process-daily. Без него любой может вызвать `GET .../process-daily`. |
| **Регулировка объёма** | | |
| `SALES_PIPELINE_BATCH_SIZE` | нет | Сколько лидов обрабатывать за один запуск (по умолчанию 10, макс. 200). |
| `SALES_PIPELINE_MAX_EMAILS_PER_RUN` | нет | Лимит писем/сообщений за один запуск (если задан, за запуск отправится не больше этого числа). |

Пример блока в `.env`:

```env
UNISENDER_API_KEY=твой_ключ_unisender
SENDER_EMAIL=sales@твой-домен.ru
SENDER_NAME=Команда PrimeCoder
UNISENDER_CHANNEL_ID=398059676
CRON_SECRET=длинный_секретный_токен
```

---

### Шаг 3. Поля таблицы и импорт лидов

**Какие колонки нужны в таблице (Google Sheets / CSV):**

| Колонка | Нужна | Как используется |
|--------|--------|-------------------|
| **ФИО** | да | Имя контакта → `name` в клиенте. |
| **email** | да | Обязательно. При нескольких через запятую выбирается приоритет: info@ → sales@ → marketing@ → первый. |
| **company_name** | да | Название компании → `company` в клиенте. |
| **tel** | нет | Телефон → `phone`. На обработке телефон дополнительно парсится с сайта и при необходимости обновляется. |
| **processed** | нет | Игнорируется (воронка ведётся в CRM по `pipeline_stage`). |
| **notes** | нет | Игнорируется при импорте. |
| **lead_id** | нет | Игнорируется. |
| **website** | не нужна в таблице | Сайт **не** обязан быть колонкой. Если в таблице нет website — он заполняется автоматически: **если email корпоративный** (домен не gmail/yandex/mail.ru и т.п.), берётся домен из email и подставляется как `https://<домен>`. Пример: `info@td-esen.ru` → сайт `https://td-esen.ru`. Для личной почты сайта нет — таким лидам уходит базовый шаблон без аудита. |

Импорт: экспорт из Google Таблицы в CSV (Файл → Скачать → CSV), затем `POST /api/sales-pipeline/leads/import` с полем `file`. Либо JSON: `{ "leads": [ { "name": "...", "company_name": "...", "email": "...", "phone": "...", "website": "..." } ] }`. Импорт создаёт клиента с `status = 'lead'`, `pipeline_stage = 'new'` или обновляет существующего по email.

---

### Шаг 4. Включить ежедневную обработку (Cron)

Обработка вызывается одним GET-запросом:

```text
GET https://твой-домен/api/sales-pipeline/process-daily?secret=ТВОЙ_CRON_SECRET
```

Если в `.env` задан `CRON_SECRET`, без `?secret=...` запрос вернёт 401.

**На сервере с Linux** добавь задание cron (запуск каждый день в 9:00):

```bash
crontab -e
```

Строка (подставь свой URL и CRON_SECRET):

```cron
0 9 * * * curl -s "https://твой-домен.ru/api/sales-pipeline/process-daily?secret=ТВОЙ_CRON_SECRET"
```

Либо через другой планировщик (GitHub Actions, панель хостинга и т.п.) — важно просто раз в день вызывать этот GET в одно и то же время.

Детали: для корпоративного email сайт берётся из поля `website` или из домена email (`https://<домен>`). Для личной почты отправляется базовый шаблон без аудита. Отправка — через UniSender (email и при наличии телефона — Telegram); при ошибке UniSender — fallback на SMTP, если заданы `EMAIL_*`.

---

### Шаг 5. Обработка ответов клиентов

Когда клиент отвечает на письмо — разбор ответа вручную через API:

```text
POST /api/sales-pipeline/process-reply
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "fromEmail": "client@example.com",
  "subject": "Re: ...",
  "text": "Текст ответа клиента сюда"
}
```

Сервер найдёт клиента по email (в пайплайне), сохранит переписку в `client_correspondence`, отправит текст в OpenAI для анализа и обновит `pipeline_stage` (replied / qualified / lost). В ответ получишь анализ и новый этап.

Позже можно добавить автоматический разбор (например, webhook от почтового сервиса), который будет вызывать этот endpoint.

---

## Итог по шагам

1. Применить миграции (`node scripts/apply-migrations-to-db.js`).  
2. Настроить `.env` (OpenAI, email, при желании UniSender, `CRON_SECRET`).  
3. Импортировать лидов в клиентов (API пайплайна или ручное создание клиентов с `pipeline_stage = 'new'` и `website`).  
4. Настроить cron на ежедневный вызов `GET .../process-daily?secret=...`.  
5. При ответах клиентов вызывать `POST .../process-reply` с текстом письма (пока вручную).

После этого лиды из базы клиентов будут автоматически разбираться в обработку по расписанию.

---

## Визуализация и письма

- **Схема работы пайплайна:** [SALES_PIPELINE_DIAGRAM.md](./SALES_PIPELINE_DIAGRAM.md) — диаграммы Mermaid (исходящий поток, входящие ответы, где что настраивается). Открой в VS Code с плагином Mermaid или на GitHub.
- **Тексты писем для UniSender:** [SALES_PIPELINE_EMAIL_TEMPLATES.md](./SALES_PIPELINE_EMAIL_TEMPLATES.md) — четыре сценария (high/medium/low + базовый без аудита), переменные `[%company_name%]` и др., готовые формулировки для загрузки в UniSender.
