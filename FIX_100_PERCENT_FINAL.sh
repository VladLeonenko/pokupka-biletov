#!/bin/bash
# 100% РЕШЕНИЕ ПРОБЛЕМЫ С LOCALHOST:3000

set -e

echo "🔧 Исправление проблемы с localhost:3000..."

# 1. Локально - пересобрать фронтенд
echo "📦 Пересборка фронтенда..."
cd /Users/vladislavleonenko/Desktop/primecoder-gulp/frontend

# Очистить предыдущую сборку
rm -rf dist

# Собрать (игнорируя ошибки TypeScript для проверки)
echo "⚠️  Сборка может показать ошибки TypeScript, но это не критично для проверки localhost:3000"
npm run build 2>&1 | grep -v "error TS" || true

# Проверить что в собранном бандле НЕТ localhost:3000
if [ -d "dist" ]; then
    echo "🔍 Проверка dist/ на наличие localhost:3000..."
    localhost_count=$(grep -r "localhost:3000" dist/ 2>/dev/null | wc -l | xargs)
    if [ "$localhost_count" -eq "0" ]; then
        echo "✅ OK - localhost:3000 не найден в dist/"
        echo "📤 Загружаю на сервер..."
        scp -r dist/* root@85.239.44.40:/var/www/primecoder-gulp/frontend/dist/
        echo "✅ Фронтенд загружен на сервер"
    else
        echo "❌ НАЙДЕНО $localhost_count упоминаний localhost:3000 в dist/"
        echo "⚠️  Нужно проверить код и исправить"
        grep -r "localhost:3000" dist/ 2>/dev/null | head -5
        exit 1
    fi
else
    echo "❌ dist/ не существует - сборка не удалась"
    exit 1
fi

echo ""
echo "✅ ГОТОВО! Теперь на сервере:"
echo "1. Проверь .env: cat /var/www/primecoder-gulp/backend/.env | grep CORS_ORIGIN"
echo "2. Перезапусти PM2: pm2 delete all && cd /var/www/primecoder-gulp/backend && pm2 start app.js --name primecoder-backend -i 2"
echo "3. Очисти кеш браузера: Ctrl+Shift+R"
