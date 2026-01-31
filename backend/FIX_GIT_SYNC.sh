#!/bin/bash
# Полная синхронизация с Git репозиторием
# Использование на сервере: bash FIX_GIT_SYNC.sh

set -e

cd /var/www/primecoder-gulp

echo "🔧 Полная синхронизация с Git репозиторием..."
echo ""

# 1. Проверить статус git
echo "📊 Текущий статус Git:"
git status --short

# 2. Сохранить изменения в .env (если есть)
if [ -f "backend/.env" ]; then
  echo "💾 Сохранение .env..."
  cp backend/.env /tmp/primecoder-env-backup
fi

# 3. Очистить все локальные изменения
echo "🧹 Очистка локальных изменений..."
git reset --hard HEAD
git clean -fd

# 4. Получить последние изменения
echo "📥 Получение изменений из репозитория..."
git fetch origin

# 5. Синхронизировать с origin/main
echo "🔄 Синхронизация с origin/main..."
git reset --hard origin/main

# 6. Восстановить .env
if [ -f "/tmp/primecoder-env-backup" ]; then
  echo "💾 Восстановление .env..."
  cp /tmp/primecoder-env-backup backend/.env
  rm /tmp/primecoder-env-backup
fi

# 7. Проверить наличие всех файлов routes
echo ""
echo "🔍 Проверка файлов routes..."
MISSING_FILES=0

REQUIRED_ROUTES=(
  "backend/routes/pages.js"
  "backend/routes/exerciseImages.js"
  "backend/routes/cart.js"
  "backend/routes/promotions.js"
  "backend/routes/partials.js"
  "backend/routes/blog.js"
  "backend/routes/carousels.js"
  "backend/routes/images.js"
  "backend/routes/auth.js"
  "backend/routes/products.js"
  "backend/routes/quiz.js"
)

for file in "${REQUIRED_ROUTES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "❌ Отсутствует: $file"
    MISSING_FILES=$((MISSING_FILES + 1))
  else
    echo "✅ Найден: $file"
  fi
done

# 8. Проверить middleware
echo ""
echo "🔍 Проверка middleware..."
if [ ! -f "backend/middleware/auth.js" ]; then
  echo "❌ Отсутствует: backend/middleware/auth.js"
  MISSING_FILES=$((MISSING_FILES + 1))
else
  echo "✅ Найден: backend/middleware/auth.js"
fi

# 9. Проверить db.js
echo ""
echo "🔍 Проверка db.js..."
if [ ! -f "backend/db.js" ]; then
  echo "❌ Отсутствует: backend/db.js"
  MISSING_FILES=$((MISSING_FILES + 1))
else
  echo "✅ Найден: backend/db.js"
fi

# 10. Итоги
echo ""
if [ $MISSING_FILES -eq 0 ]; then
  echo "✅ Все файлы на месте!"
  echo ""
  echo "📋 Следующие шаги:"
  echo "  cd backend"
  echo "  pm2 restart all --update-env"
  echo "  pm2 logs primecoder-backend --lines 30"
else
  echo "❌ Найдено отсутствующих файлов: $MISSING_FILES"
  echo ""
  echo "⚠️  Попробуйте:"
  echo "  1. Проверить, что файлы есть в репозитории: git ls-files | grep routes"
  echo "  2. Проверить .gitignore: cat .gitignore | grep routes"
  echo "  3. Принудительно обновить: git fetch origin && git reset --hard origin/main"
fi
