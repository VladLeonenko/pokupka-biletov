# База данных

Используется **только PostgreSQL**. Подключение: `backend/db.js`, переменные `PGUSER`, `PGHOST`, `PGDATABASE`, `PGPASSWORD`, `PGPORT`.

## Миграции

- Каталог: `backend/migrations/`.
- Порядок применения задаётся в `backend/scripts/apply-migrations-to-db.js`.
- Запуск (из корня): `cd backend && node scripts/apply-migrations-to-db.js [database_name]`. Без аргумента используется `PGDATABASE` из `.env`.

## Отзывы

Таблицы: `brand_reviews`, `review_helpful_votes`. Миграции: `024_add_reviews_table.sql`, `025_extend_reviews_table.sql`. Если отзывы не работают — проверить, что эти миграции применены к целевой БД.

## Дампы и экспорт

- Скрипты в `backend/scripts/`: `export-database.js`, при необходимости `split-databases-by-project.js`. Дамп с сервера для переноса на локалку: `pg_dump` на сервере, восстановление локально через `psql` или GUI.

Подробнее план по БД — в [ROADMAP.md](ROADMAP.md) (§ 5).
