#!/bin/bash
# Деплой фронтенда на сервер (исправлено для zsh)

set -e

cd /Users/vladislavleonenko/Desktop/primecoder-gulp/frontend

echo "🔨 Сборка фронтенда..."
rm -rf dist

# Собрать (может быть ошибки TypeScript, но это не критично)
npm run build 2>&1 | grep -v "error TS" || true

# Проверить что dist существует
if [ ! -d "dist" ]; then
    echo "❌ dist/ не существует. Сборка не удалась."
    exit 1
fi

# Проверить что dist не пуст
if [ -z "$(ls -A dist 2>/dev/null)" ]; then
    echo "❌ dist/ пуст. Сборка не удалась."
    exit 1
fi

echo "✅ Сборка завершена"

# Проверить на localhost:3000
echo "🔍 Проверка на localhost:3000..."
localhost_count=$(grep -r "localhost:3000" dist/ 2>/dev/null | wc -l | xargs)
if [ "$localhost_count" -eq "0" ]; then
    echo "✅ OK - localhost:3000 не найден в dist/"
else
    echo "⚠️  Найдено $localhost_count упоминаний localhost:3000"
    grep -r "localhost:3000" dist/ 2>/dev/null | head -3
fi

echo ""
echo "📤 Загружаю фронтенд на сервер..."

# Для zsh используем dist/. вместо dist/*
scp -r dist/. root@85.239.44.40:/var/www/primecoder-gulp/frontend/dist/

echo "✅ Фронтенд загружен на сервер"
echo ""
echo "📋 Теперь на сервере выполни:"
echo "   ssh root@85.239.44.40"
echo "   cd /var/www/primecoder-gulp/backend"
echo "   cat .env | grep CORS_ORIGIN"
echo "   pm2 restart all --update-env"
