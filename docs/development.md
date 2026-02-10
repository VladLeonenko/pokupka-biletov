# Разработка

- **Git:** см. `GIT_WORKFLOW.md`, `GIT_QUICK_START.md` в корне (будут перенесены сюда).
- **Команды:** `QUICK_COMMANDS.md` в корне.
- **Структура и стек:** `PROJECT_STRUCTURE.md`, `TECH_STACK.md` в корне.

## Локальный запуск

1. PostgreSQL запущен, создана БД, в `backend/.env` заданы `PGUSER`, `PGHOST`, `PGDATABASE`, `PGPASSWORD`, `PGPORT`.
2. Миграции: `cd backend && node scripts/apply-migrations-to-db.js`.
3. Бэкенд: `cd backend && npm run start` (или `node app.js`).
4. Фронт: `cd frontend && npm run dev`. API проксируется на бэкенд (Vite), отдельно `VITE_API_URL` не нужен.

Общий план задач — в [ROADMAP.md](ROADMAP.md).
