#!/bin/bash
# Скрипт для копирования UPDATE_NGINX_413.sh на сервер

SERVER="${1:-root@85.239.44.40}"
SERVER_PATH="/var/www/primecoder-gulp/backend"

echo "📦 Копирование UPDATE_NGINX_413.sh на сервер $SERVER..."

scp backend/UPDATE_NGINX_413.sh $SERVER:$SERVER_PATH/UPDATE_NGINX_413.sh

echo ""
echo "✅ Скрипт скопирован!"
echo ""
echo "📋 Следующие шаги на сервере:"
echo "  cd /var/www/primecoder-gulp/backend"
echo "  sudo bash UPDATE_NGINX_413.sh"
