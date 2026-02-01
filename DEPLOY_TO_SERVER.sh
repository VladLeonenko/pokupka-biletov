#!/bin/bash
# Скрипт для деплоя обновлений на сервер

SERVER="${1:-root@85.239.44.40}"
FRONTEND_PATH="/var/www/primecoder-gulp/frontend"
BACKEND_PATH="/var/www/primecoder-gulp/backend"

echo "=== Деплой на сервер $SERVER ==="
echo ""

# 1. Сборка фронтенда локально
echo "1. Сборка фронтенда..."
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Ошибка сборки фронтенда"
    exit 1
fi
cd ..

# 2. Копирование фронтенда на сервер
echo ""
echo "2. Копирование фронтенда на сервер..."
scp -r frontend/dist/* $SERVER:$FRONTEND_PATH/dist/

# 3. Обновление бэкенда (если нужно)
echo ""
echo "3. Обновление бэкенда..."
echo "Скопируйте нужные файлы вручную или используйте git pull на сервере"

# 4. Инструкции для сервера
echo ""
echo "=== Следующие шаги на сервере ==="
echo ""
echo "1. Обновить CORS в .env:"
echo "   cd $BACKEND_PATH"
echo "   nano .env"
echo "   Добавить: CORS_ORIGIN=https://prime-coder.ru,https://www.prime-coder.ru"
echo ""
echo "2. Проверить права на uploads:"
echo "   chmod -R 755 $BACKEND_PATH/uploads/"
echo "   chown -R www-data:www-data $BACKEND_PATH/uploads/"
echo ""
echo "3. Перезапустить бэкенд:"
echo "   pm2 restart all"
echo ""
echo "4. Проверить конфигурацию Nginx для /uploads/:"
echo "   sudo grep -A 5 'location /uploads' /etc/nginx/sites-available/prime-coder.ru"
echo ""
echo "=== Готово! ==="
