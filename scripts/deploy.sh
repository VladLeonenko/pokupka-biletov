#!/usr/bin/env bash
# Единый скрипт деплоя. Заменяет множество DEPLOY_*.sh и FIX_*.sh.
# Использование:
#   ./scripts/deploy.sh              — только сборка фронта
#   ./scripts/deploy.sh --check      — проверка перед деплоем (pre-deploy-check.js)
#   ./scripts/deploy.sh --deploy     — сборка + выкладка на сервер
# Переменные для --deploy: DEPLOY_HOST, DEPLOY_USER, REMOTE_FRONTEND_PATH

set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

RUN_CHECK=
DO_DEPLOY=

for arg in "$@"; do
  case "$arg" in
    --check)  RUN_CHECK=1 ;;
    --deploy) DO_DEPLOY=1 ;;
  esac
done

if [ -n "$RUN_CHECK" ]; then
  echo "=== Проверка перед деплоем ==="
  node scripts/pre-deploy-check.js
fi

echo "=== Сборка фронтенда ==="
(cd frontend && npm run build)

if [ -n "$DO_DEPLOY" ]; then
  : "${DEPLOY_HOST:?Задайте DEPLOY_HOST (ip или домен сервера)}"
  : "${DEPLOY_USER:?Задайте DEPLOY_USER (ssh-пользователь)}"
  REMOTE_FRONTEND_PATH="${REMOTE_FRONTEND_PATH:-/var/www/pokupka-biletov/frontend}"

  echo "=== Копирование на $DEPLOY_USER@$DEPLOY_HOST:$REMOTE_FRONTEND_PATH/dist ==="
  rsync -avz --delete frontend/dist/ "$DEPLOY_USER@$DEPLOY_HOST:$REMOTE_FRONTEND_PATH/dist/"
  echo "=== Готово. На сервере при необходимости: pm2 restart all ==="
fi
