#!/bin/bash
# Проверка деплоя на сервере - запускать ПОСЛЕ git pull && npm run build
set -e
cd "$(dirname "$0")/.."
echo "=== Проверка деплоя ==="

# 1. Есть ли новый редактор блоков в исходниках
if grep -q "BlogBlockEditorPage" frontend/src/routes/AppRoutes.tsx; then
  echo "✓ BlogBlockEditorPage в роутах"
else
  echo "✗ BlogBlockEditorPage НЕ найден в роутах"
  exit 1
fi

# 2. Собран ли фронт
if [ ! -f frontend/dist/index.html ]; then
  echo "✗ frontend/dist/index.html не найден. Запустите: cd frontend && npm run build"
  exit 1
fi
echo "✓ frontend/dist собран"

# 3. Есть ли chunk редактора в dist
if ls frontend/dist/assets/*BlogBlock* 2>/dev/null || ls frontend/dist/assets/*BlogEditor* 2>/dev/null; then
  echo "✓ Chunk редактора найден"
elif grep -q "BlogBlockEditor" frontend/dist/index.html 2>/dev/null; then
  echo "✓ BlogBlockEditor упоминается в index.html"
else
  echo "? Chunk может иметь другое имя (lazy load)"
fi

# 4. SW версия
SW_VER=$(grep -o "CACHE_VERSION = 'v[^']*'" frontend/public/sw.js 2>/dev/null || echo "не найден")
echo "  SW: $SW_VER"

echo ""
echo "Если на проде старый UI: DevTools → Application → Service Workers → Unregister"
echo "Затем Ctrl+Shift+R (hard refresh)"
