#!/usr/bin/env bash
# SSH-туннель к продакшен PostgreSQL
# Локальный порт 5433 → удалённый localhost:5432
#
# После запуска скопируй backend/.env.remote в backend/.env
# и перезапусти бэкенд.

set -euo pipefail

SERVER="root@85.239.44.40"
LOCAL_PORT=5433
REMOTE_PORT=5432

echo "🔗 Открываю SSH-туннель: localhost:${LOCAL_PORT} → ${SERVER}:${REMOTE_PORT}"
echo "   Для остановки: Ctrl+C"
echo ""

ssh -N -L "${LOCAL_PORT}:localhost:${REMOTE_PORT}" "${SERVER}"
