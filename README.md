# Покупка Билетов

Отдельный продукт на базе форка прежнего стека: **React (Vite) + Express + PostgreSQL**. История коммитов сохранена; **remote `origin` отключён** — создай новый репозиторий и привяжи его сам.

## Откуда копия

Проект скопирован с `primecoder-gulp` (локальная копия на Рабочем столе). В коде и сидах ещё много наследия старого сайта: его можно поэтапно удалять под задачи билетов.

## Структура

```
pokupka-biletov/
├── frontend/     # React + Vite + TypeScript
├── backend/      # Express, миграции PostgreSQL
└── scripts/      # деплой и утилиты
```

## Быстрый старт

**Требования:** Node.js ≥ 18, PostgreSQL ≥ 14.

1. Создай БД (имя по желанию, по умолчанию в примере — `pokupka_biletov_dev`):

```bash
createdb pokupka_biletov_dev
# или через psql: CREATE DATABASE pokupka_biletov_dev;
```

2. Зависимости:

```bash
cd backend && npm install
cd ../frontend && npm install
```

3. Окружение backend:

```bash
cp backend/.env.example backend/.env
# отредактируй PGUSER, PGPASSWORD, PGDATABASE и секреты
```

4. Миграции:

```bash
cd backend && npm run migrate
```

5. Запуск:

```bash
# терминал 1
cd backend && node app.js

# терминал 2
cd frontend && npm run dev
```

Сайт: http://localhost:5173 · API: http://localhost:3000

## База данных

Используй **отдельную** БД только для этого проекта (не `primecoder_db` / прод PrimeCoder). Значения по умолчанию в скрипте миграций смотри в `backend/scripts/apply-migrations-to-db.js`.

## Деплой

На сервере задай свой путь к проекту и свой Git remote. Шаблон скрипта: `scripts/deploy-via-git.sh`. Подставь домен и путь в `.cursor/rules/deploy-commands.mdc` под свой хостинг.

## Дальнейшие шаги

- Заменить в `frontend/index.html` `https://example.com` на реальный домен.
- Вырезать ненужные роуты и API под «билеты».
- Обновить `backend/routes`, сиды и миграции под новую доменную модель (события, места, заказы).

## Лицензия

Proprietary — права как у исходного проекта; переоформи под юрлицо нового продукта при необходимости.
