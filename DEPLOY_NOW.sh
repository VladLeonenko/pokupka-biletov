#!/bin/bash
# Быстрый деплой фронтенда через rsync

set -e

cd /Users/vladislavleonenko/Desktop/primecoder-gulp/frontend

if [ ! -d "dist" ]; then
    echo "❌ dist/ не существует. Сначала соберите: npm run build"
    exit 1
fi

echo "📤 Загружаю фронтенд на сервер..."
rsync -avz --delete dist/ root@85.239.44.40:/var/www/primecoder-gulp/frontend/dist/

echo ""
echo "✅ Фронтенд загружен!"
echo ""
echo "📋 На сервере выполни:"
echo "   ssh root@85.239.44.40"
echo "   cd /var/www/primecoder-gulp/backend"
echo "   cat .env | grep CORS_ORIGIN"
echo "   pm2 restart all --update-env"
