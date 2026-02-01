#!/bin/bash
# Безопасный деплой с защитой .env файла
# Использование: ./deploy-safe.sh

set -e

cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)
BACKEND_DIR="$PROJECT_ROOT/backend"

echo "🚀 Начало безопасного деплоя..."

# 1. Сохранить текущий .env если существует
if [ -f "$BACKEND_DIR/.env" ]; then
    BACKUP_NAME=".env.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$BACKEND_DIR/.env" "$BACKEND_DIR/$BACKUP_NAME"
    echo "✅ .env сохранен в $BACKUP_NAME"
fi

# 2. Сделать git pull
echo "📥 Получение обновлений из git..."
git pull origin main || {
    echo "❌ Ошибка при git pull"
    # Восстановить .env если был
    if [ -f "$BACKEND_DIR/$BACKUP_NAME" ]; then
        cp "$BACKEND_DIR/$BACKUP_NAME" "$BACKEND_DIR/.env"
        echo "✅ .env восстановлен из резервной копии"
    fi
    exit 1
}

# 3. Восстановить .env если он был перезаписан или удален
if [ ! -f "$BACKEND_DIR/.env" ] || [ -n "$BACKUP_NAME" ]; then
    if [ -f "$BACKEND_DIR/$BACKUP_NAME" ]; then
        # Проверить что текущий .env отличается от бэкапа (был перезаписан)
        if [ -f "$BACKEND_DIR/.env" ]; then
            if ! diff -q "$BACKEND_DIR/.env" "$BACKEND_DIR/$BACKUP_NAME" > /dev/null 2>&1; then
                echo "⚠️  .env был изменен при git pull, восстанавливаем..."
                cp "$BACKEND_DIR/$BACKUP_NAME" "$BACKEND_DIR/.env"
                echo "✅ .env восстановлен из резервной копии"
            fi
        else
            echo "⚠️  .env отсутствует, восстанавливаем из резервной копии..."
            cp "$BACKEND_DIR/$BACKUP_NAME" "$BACKEND_DIR/.env"
            echo "✅ .env восстановлен из резервной копии"
        fi
    fi
fi

# 4. Убедиться что .env не отслеживается git
if git ls-files --error-unmatch "$BACKEND_DIR/.env" > /dev/null 2>&1; then
    echo "⚠️  .env отслеживается git, убираем из индекса..."
    git rm --cached "$BACKEND_DIR/.env" 2>/dev/null || true
    git update-index --assume-unchanged "$BACKEND_DIR/.env" 2>/dev/null || true
fi

# 5. Перезапустить приложение
echo "🔄 Перезапуск приложения..."
cd "$BACKEND_DIR"
pm2 restart all --update-env || {
    echo "⚠️  PM2 не найден или ошибка, попробуйте вручную: pm2 restart all --update-env"
}

echo "✅ Деплой завершен успешно!"
