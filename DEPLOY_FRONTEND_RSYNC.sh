#!/bin/bash
# Деплой фронтенда через rsync (работает в zsh)

set -e

cd /Users/vladislavleonenko/Desktop/primecoder-gulp/frontend

echo "🔨 Проверка сборки..."

# Проверить что dist существует
if [ ! -d "dist" ]; then
    echo "❌ dist/ не существует. Сначала соберите: npm run build"
    exit 1
fi

# Проверить что dist не пуст
if [ -z "$(ls -A dist 2>/dev/null)" ]; then
    echo "❌ dist/ пуст. Сначала соберите: npm run build"
    exit 1
fi

echo "✅ dist/ готов"

# Проверить на localhost:3000
echo "🔍 Проверка на localhost:3000..."
localhost_count=$(grep -r "localhost:3000" dist/ 2>/dev/null | wc -l | xargs)
if [ "$localhost_count" -eq "0" ]; then
    echo "✅ OK - localhost:3000 не найден в dist/"
else
    echo "⚠️  Найдено $localhost_count упоминаний localhost:3000"
    grep -r "localhost:3000" dist/ 2>/dev/null | head -3
    echo ""
    read -p "Продолжить деплой? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "📤 Загружаю фронтенд на сервер через rsync..."

# Используем rsync - работает в zsh и надежнее
rsync -avz --delete dist/ root@85.239.44.40:/var/www/primecoder-gulp/frontend/dist/

echo ""
echo "✅ Фронтенд загружен на сервер"
echo ""
echo "📋 Теперь на сервере выполни:"
echo "   ssh root@85.239.44.40"
echo "   cd /var/www/primecoder-gulp/backend"
echo "   cat .env | grep CORS_ORIGIN"
echo "   # Должна быть ОДНА строка: CORS_ORIGIN=https://prime-coder.ru,https://www.prime-coder.ru"
echo "   pm2 restart all --update-env"
