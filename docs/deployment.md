# Деплой

Консолидированная документация по выкладке на сервер. Подробный план — в [ROADMAP.md](ROADMAP.md) (§ 6–7).

## Текущее состояние

- В корне и в `backend/` есть множество скриптов: `DEPLOY_*.sh`, `FIX_*.sh`, `COPY_NGINX_SCRIPT.sh` и т.д. План — свести к одному основному сценарию деплоя или к CI/CD.
- Полезные файлы для справки (до консолидации): `DEPLOYMENT.md`, `SERVER_SETUP.md`, `PRE_DEPLOY_CHECKLIST.md`, `DEPLOY_SUMMARY.md`, `DEPLOY_FILESYNC.md`, скрипты `DEPLOY_*.sh`, `FIX_NGINX_*.md`.

## Рекомендуемый порядок

1. Проверка перед деплоем: `node scripts/pre-deploy-check.js` (если настроен под проект).
2. Сборка фронта: `cd frontend && npm run build`. При необходимости задать `VITE_API_URL` (без `/api` в конце).
3. Выкладка бэкенда и статики на сервер (rsync/scp или через CI/CD).
4. На сервере: установка зависимостей, миграции `node backend/scripts/apply-migrations-to-db.js`, перезапуск приложения (PM2/systemd).

Детали nginx, env и секретов — в старых MD в корне; со временем будут перенесены в этот раздел.
