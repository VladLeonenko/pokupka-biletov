#!/bin/bash
# Финальный деплой с обновленным Service Worker

set -e

cd /Users/vladislavleonenko/Desktop/primecoder-gulp/frontend

echo "📤 Загружаю фронтенд на сервер..."
rsync -avz --delete dist/ root@85.239.44.40:/var/www/primecoder-gulp/frontend/dist/

echo ""
echo "✅ Фронтенд загружен!"
echo ""
echo "⚠️  ВАЖНО: После деплоя нужно:"
echo "1. Открыть DevTools → Application → Service Workers"
echo "2. Нажать 'Unregister' для старого Service Worker"
echo "3. Обновить страницу (Ctrl+Shift+R)"
echo "4. Новый Service Worker установится автоматически"
echo ""
echo "📋 На сервере:"
echo "   ssh root@85.239.44.40"
echo "   cd /var/www/primecoder-gulp/backend"
echo "   cat .env | grep CORS_ORIGIN"
echo "   pm2 restart all --update-env"
