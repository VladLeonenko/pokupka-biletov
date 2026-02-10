# План развития и консолидация проекта

Актуальный план: перенос актуальной версии на локалку, исправления, документация, БД, скрипты, CI/CD, тесты.

---

## 1. Перенос актуальной версии на локалку

- **С сервера:** убедиться, что на сервере закоммичена актуальная ветка (например `main`).
- **Локально:** `git fetch origin && git checkout main && git pull origin main`.
- **Переменные окружения:** скопировать с сервера `.env` (backend и при необходимости frontend build env) в `backend/.env`. Для локальной разработки фронта `VITE_API_URL` не задавать (прокси через Vite) или `VITE_API_URL=http://localhost:3000`.
- **БД:** если на сервере БД новее — дамп с сервера и восстановление в локальный PostgreSQL, затем при необходимости прогнать миграции:  
  `node backend/scripts/apply-migrations-to-db.js`

---

## 2. Исправление ошибки с отзывами

**Возможные причины на проде:**

- Не применены миграции отзывов: `024_add_reviews_table.sql`, `025_extend_reviews_table.sql`.  
  Решение: на сервере выполнить `node backend/scripts/apply-migrations-to-db.js` для целевой БД.
- API отзывов недоступен из-за базового URL: при сборке фронта на проде, если фронт и бэк на одном домене, не задавать `VITE_API_URL` (относительные пути). Если фронт на поддомене/другом домене — задать `VITE_API_URL=https://api.example.com` (без `/api` в конце) при `npm run build`.
- На фронте при ошибке загрузки отзывов не показывалось сообщение — добавлена обработка ошибки и блок «Не удалось загрузить отзывы» с возможностью повтора.

**Проверка локально:** после поднятия бэка и применения миграций открыть `/reviews` и админку «Отзывы» — список и отправка формы должны работать.

---

## 3. Автоматическое добавление товаров

- Скрипт уже есть: `backend/scripts/create-all-products.js`.
- Запуск: из корня проекта  
  `cd backend && node scripts/create-all-products.js`  
  (или из `backend`: `node scripts/create-all-products.js`).
- Скрипт создаёт товары по списку в коде (идемпотентность зависит от логики — проверять по `slug`). Для автоматизации при деплое можно добавить в CI/CD шаг или отдельный npm-скрипт в корневом `package.json`, например:  
  `"products:seed": "cd backend && node scripts/create-all-products.js"`

---

## 4. Консолидация документации (Wiki)

Цель — объединить разрозненные MD-файлы в структурированную wiki.

**Структура `docs/`:**

| Раздел | Содержание | Источники (старые файлы) |
|--------|------------|---------------------------|
| [README](README.md) | Оглавление wiki | — |
| [Deployment](deployment.md) | Деплой, сервер, nginx | DEPLOYMENT.md, DEPLOY_*.md, DEPLOY_FILESYNC.md, SERVER_SETUP.md, QUICK_FIX_SERVER.md, FIX_NGINX_*.md, PRE_DEPLOY_CHECKLIST.md, DEPLOY_SUMMARY.md |
| [Database](database.md) | PostgreSQL, миграции, дампы | backend/DATABASE_*.md, backend/SERVER_SETUP_*.md, APPLY_MIGRATION.md, MIGRATION_*.md |
| [API & Environment](api-and-environment.md) | API base URL, CORS, env | FIX_CORS_*.md, FIX_LOCALHOST_*.md, DEBUG_CORS_ISSUE.md, backend/FIX_ENV_*.md |
| [Features](features.md) | Кейсы, товары, SEO, формы и т.д. | CASE_*.md, GALLERY_*.md, SEO_*.md, PRIVACY_*.md, PROMOCODE_SETUP.md и др. |
| [Development](development.md) | Git, команды, структура | GIT_WORKFLOW.md, GIT_QUICK_START.md, QUICK_COMMANDS.md, PROJECT_STRUCTURE.md, TECH_STACK.md |
| [Testing & Reports](testing-reports.md) | Тесты, отчёты | TESTING_*.md, API_ENDPOINTS_*.md, FIXES_REPORT.md и др. |

Пошагово: переносить содержимое из перечисленных файлов в соответствующие `docs/*.md`, затем устаревшие дубликаты в корне/backend помечать как deprecated или удалять после ревью.

---

## 5. Стандартизация БД (PostgreSQL)

- Бэкенд уже использует только PostgreSQL (`backend/db.js`, `pg`).
- Зафиксировать в документации: единственная БД — PostgreSQL; все миграции в `backend/migrations/`, порядок применения — в `backend/scripts/apply-migrations-to-db.js`.
- При необходимости убрать упоминания других СУБД из старых MD (по мере консолидации доки).

---

## 6. Рефакторинг скриптов деплоя

- Сейчас: множество `.sh` в корне и в `backend/` (DEPLOY_*.sh, FIX_*.sh, COPY_NGINX_SCRIPT.sh и т.д.), дублирование логики.
- Добавлен единый скрипт: **`scripts/deploy.sh`**
  - `./scripts/deploy.sh` — только сборка фронта.
  - `./scripts/deploy.sh --check` — проверка перед деплоем (pre-deploy-check.js).
  - `./scripts/deploy.sh --deploy` — сборка + rsync на сервер (нужны `DEPLOY_HOST`, `DEPLOY_USER`, опционально `REMOTE_FRONTEND_PATH`).
- Цель: постепенно заменить вызовы из DEPLOY_*.sh на `scripts/deploy.sh` или на CI/CD (`.github/workflows/deploy.yml`), затем устаревшие скрипты удалить.

---

## 7. CI/CD

- Цель: автоматизировать деплой вместо ручного запуска множества shell-скриптов.
- Варианты: GitHub Actions / GitLab CI / другой runner.
- Минимальный пайплайн: линт → сборка фронта → тесты (когда появятся) → деплой на сервер (rsync или docker по выбору). Секреты (ключи, хосты) — в переменных репозитория.
- Заготовку можно положить в `.github/workflows/deploy.yml` (или аналог) и описать в `docs/deployment.md`.

---

## 8. Тесты

- Сейчас: Playwright (e2e) в корне.
- Добавить: unit/integration тесты.
  - Frontend: Vitest (или Jest) для компонентов и сервисов (например, `apiBase`, `reviewsApi`).
  - Backend: Node test runner или Jest для роутов/сервисов (например, `GET/POST /api/reviews/public`).
- Завести скрипты в `package.json`: `test`, `test:unit`, `test:e2e`, при необходимости `test:integration`.

---

## Чек-лист по приоритету

1. [ ] Подтянуть с сервера актуальный код и (при необходимости) дамп БД.
2. [ ] Применить миграции отзывов на целевой БД; проверить страницу отзывов и админку.
3. [ ] Добавить обработку ошибки загрузки отзывов на фронте (сделано в рамках этого плана).
4. [ ] Задокументировать и при необходимости автоматизировать запуск `create-all-products.js`.
5. [ ] Перенести и объединить MD в `docs/` по разделам wiki.
6. [ ] Зафиксировать в документации использование только PostgreSQL.
7. [ ] Свести деплой к одному скрипту или CI/CD.
8. [ ] Добавить unit/integration тесты и скрипты `test`.
