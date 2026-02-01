#!/bin/bash
# Деплой фронтенда на сервер (исправлено для zsh)

set -e

cd /Users/vladislavleonenko/Desktop/primecoder-gulp/frontend

# Проверить что dist существует
if [ ! -d "dist" ]; then
    echo "❌ dist/ не существует. Сначала соберите: npm run build"
    exit 1
fi

# Проверить что dist не пуст
if [ -z "$(ls -A dist)" ]; then
    echo "❌ dist/ пуст. Сначала соберите: npm run build"
    exit 1
fi

echo "📤 Загружаю фронтенд на сервер..."

# Используем кавычки для zsh
scp -r dist/. root@85.239.44.40:/var/www/primecoder-gulp/frontend/dist/

echo "✅ Фронтенд загружен на сервер"
