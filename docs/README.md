# Документация проекта (Wiki)

Единая точка входа для всей документации. По мере консолидации сюда будут переноситься разделы из разрозненных MD в корне и в `backend/`.

## Основные разделы

| Раздел | Описание |
|--------|----------|
| [ROADMAP](ROADMAP.md) | План развития: перенос на локалку, отзывы, товары, доки, БД, скрипты, CI/CD, тесты |
| [Deployment](deployment.md) | Деплой, сервер, nginx (консолидировано из DEPLOY_*.md, SERVER_SETUP и др.) |
| [Database](database.md) | PostgreSQL, миграции, дампы |
| [API & Environment](api-and-environment.md) | Базовый URL API, CORS, переменные окружения |
| [Development](development.md) | Git, команды, структура проекта |

## Быстрые ссылки

- **Локальный запуск:** см. корневой `README.md` и `docs/development.md`
- **Деплой:** `docs/deployment.md` и `docs/ROADMAP.md` § 6–7
- **Отзывы и товары:** `docs/ROADMAP.md` § 2–3
- **Миграции БД:** `backend/scripts/apply-migrations-to-db.js`, `docs/database.md`

Файлы в корне (`DEPLOYMENT.md`, `FIX_*.md` и т.д.) постепенно заменяются разделами в `docs/`. Актуальный план — в [ROADMAP.md](ROADMAP.md).
