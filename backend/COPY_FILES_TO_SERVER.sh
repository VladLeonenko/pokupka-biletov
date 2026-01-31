#!/bin/bash
# Скрипт для копирования файлов на сервер через scp
# Использование: bash COPY_FILES_TO_SERVER.sh SERVER_USER@SERVER_HOST

SERVER="${1:-root@85.239.44.40}"
SERVER_PATH="/var/www/primecoder-gulp/backend"

echo "📦 Копирование файлов на сервер $SERVER..."

# 1. db.js
echo "📝 Копирование db.js..."
scp backend/db.js $SERVER:$SERVER_PATH/db.js

# 2. middleware/auth.js
echo "📝 Копирование middleware/auth.js..."
ssh $SERVER "mkdir -p $SERVER_PATH/middleware"
scp backend/middleware/auth.js $SERVER:$SERVER_PATH/middleware/auth.js

# 3. routes/pages.js
echo "📝 Копирование routes/pages.js..."
scp backend/routes/pages.js $SERVER:$SERVER_PATH/routes/pages.js

# 4. Проверка на сервере
echo "🔍 Проверка файлов на сервере..."
ssh $SERVER "cd $SERVER_PATH && node -c db.js && echo '✅ db.js OK' || echo '❌ db.js ERROR'"
ssh $SERVER "cd $SERVER_PATH && node -c middleware/auth.js && echo '✅ middleware/auth.js OK' || echo '❌ middleware/auth.js ERROR'"
ssh $SERVER "cd $SERVER_PATH && node -c routes/pages.js && echo '✅ routes/pages.js OK' || echo '❌ routes/pages.js ERROR'"

echo ""
echo "✅ Копирование завершено!"
echo "📋 Следующие шаги на сервере:"
echo "  pm2 restart all --update-env"
echo "  pm2 logs primecoder-backend --lines 30"
