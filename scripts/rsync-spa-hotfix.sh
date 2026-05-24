#!/usr/bin/env bash
# Срочная заливка SPA на прод — только index.html + assets + meta.
# Без legacy/img (сотни МБ, на сервере уже есть или не нужны для старта).
#
#   ./scripts/rsync-spa-hotfix.sh
#   ./scripts/rsync-spa-hotfix.sh root@91.229.9.229

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${1:-root@91.229.9.229}"
REMOTE="${REMOTE_DIST:-/var/pokupka-biletov/frontend/dist}"

cd "$PROJECT_ROOT"

if [ ! -f frontend/dist/index.html ]; then
  echo "❌ Нет frontend/dist/index.html — сначала: cd frontend && npm run build"
  exit 1
fi
if grep -q '%PUBLIC_URL%' frontend/dist/index.html; then
  echo "❌ dist/index.html содержит %PUBLIC_URL% — удалите frontend/public/index.html и пересоберите"
  exit 1
fi
if ! grep -qE '/assets/[^"]+\.js' frontend/dist/index.html; then
  echo "❌ dist/index.html без /assets/*.js"
  exit 1
fi

MAIN_JS=$(grep -oE '/assets/js/index-[^"]+\.js' frontend/dist/index.html | head -1)
echo "🚀 SPA hotfix → $HOST:$REMOTE"
echo "   bundle: $MAIN_JS"

ssh "$HOST" "mkdir -p '$REMOTE/assets' '$REMOTE/hall-maps'"

rsync -avz --progress \
  frontend/dist/index.html \
  frontend/dist/manifest.json \
  frontend/dist/robots.txt \
  frontend/dist/favicon.svg \
  frontend/dist/sw.js \
  "$HOST:$REMOTE/"

rsync -avz --progress frontend/dist/assets/ "$HOST:$REMOTE/assets/"

if [ -d frontend/dist/hall-maps ]; then
  rsync -avz --progress frontend/dist/hall-maps/ "$HOST:$REMOTE/hall-maps/"
fi

ssh "$HOST" "chown -R www-data:www-data '$REMOTE/index.html' '$REMOTE/assets' '$REMOTE/manifest.json' '$REMOTE/robots.txt' '$REMOTE/favicon.svg' '$REMOTE/sw.js' '$REMOTE/hall-maps' 2>/dev/null || chown -R www-data:www-data '$REMOTE'"

echo ""
echo "✅ Залито. Проверка:"
curl -sf "https://biletvsem.com/" | grep -q 'assets/js' && echo "   https://biletvsem.com/ — OK" || echo "   ⚠️  curl не видит assets/js — подождите 5с или проверьте вручную"
