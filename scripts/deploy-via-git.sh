#!/usr/bin/env bash
# Деплой на прод через git. Запускать на сервере.
#
# ── Почему на сервере снова просят пароль, хотя «ключ уже в GitHub» ─────────
# В GitHub хранится только ПУБЛИЧНАЯ часть ключа. Работать с репо может только та машина,
# где лежит соответствующая ПРИВАТНАЯ часть. Ключ, созданный на Mac, на VPS сам не появится.
# Варианты: (1) сгенерировать на СЕРВЕРЕ новую пару, публичную строку вставить в
#   GitHub → репозиторий → Settings → Deploy keys; remote: git@github.com:USER/REPO.git
# (2) или HTTPS + «credential helper store» и один раз ввести PAT.
#
# Первый раз на пустом VPS (часто НЕТ каталога /var/www) — сначала:
#   sudo bash scripts/ensure-var-www.sh
#   # или: sudo mkdir -p /var/www && sudo chown "$USER":"$USER" /var/www
#   cd /var/www && git clone <url> pokupka-biletov
#
# Дальше: git pull, затем ./scripts/deploy-via-git.sh
# Использование:
#   ssh user@91.229.9.229 "cd /var/www/pokupka-biletov && ./scripts/deploy-via-git.sh main"
# или на сервере:
#   cd /var/www/pokupka-biletov && ./scripts/deploy-via-git.sh [main|feature/...]

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

BRANCH="${1:-main}"

echo "🚀 Деплой через git (ветка: $BRANCH)"
echo ""

# Сохранить .env backend
BACKEND_ENV="$PROJECT_ROOT/backend/.env"
ENV_BACKUP=""
if [ -f "$BACKEND_ENV" ]; then
  ENV_BACKUP=$(mktemp)
  cp "$BACKEND_ENV" "$ENV_BACKUP"
  echo "✅ .env сохранён"
fi

# Editor bundle + SVG (git reset --hard затирает hand/* и /tools/*.svg из репо)
LUZHNIKI_EDITOR_BUNDLE="$PROJECT_ROOT/backend/data/luzhniki-geodesy/hand/bundle-luzhniki-gray-cloud-labeled-seats.json"
LUZHNIKI_HAND_SVG="$PROJECT_ROOT/backend/data/luzhniki-geodesy/hand/luzhniki-gray-cloud-enriched.svg"
LUZHNIKI_PUBLIC_SVG="$PROJECT_ROOT/frontend/public/tools/luzhniki-gray-cloud-enriched.svg"
LUZHNIKI_BUNDLE_BACKUP=""
LUZHNIKI_HAND_SVG_BACKUP=""
LUZHNIKI_PUBLIC_SVG_BACKUP=""
if [ -f "$LUZHNIKI_EDITOR_BUNDLE" ]; then
  LUZHNIKI_BUNDLE_BACKUP=$(mktemp)
  cp "$LUZHNIKI_EDITOR_BUNDLE" "$LUZHNIKI_BUNDLE_BACKUP"
  echo "✅ Luzhniki editor bundle сохранён"
fi
if [ -f "$LUZHNIKI_HAND_SVG" ]; then
  LUZHNIKI_HAND_SVG_BACKUP=$(mktemp)
  cp "$LUZHNIKI_HAND_SVG" "$LUZHNIKI_HAND_SVG_BACKUP"
  echo "✅ Luzhniki hand SVG сохранён"
fi
if [ -f "$LUZHNIKI_PUBLIC_SVG" ]; then
  LUZHNIKI_PUBLIC_SVG_BACKUP=$(mktemp)
  cp "$LUZHNIKI_PUBLIC_SVG" "$LUZHNIKI_PUBLIC_SVG_BACKUP"
  echo "✅ Luzhniki public SVG сохранён"
fi

# Git pull (жёстко на origin/$BRANCH — иначе после экспериментов остаётся старый код)
echo "📥 git fetch + checkout $BRANCH"
git fetch origin
if ! git checkout -f "$BRANCH"; then
  echo "❌ git checkout $BRANCH failed"
  exit 1
fi
git pull origin "$BRANCH" || { echo "❌ git pull failed"; exit 1; }
git reset --hard "origin/$BRANCH" || { echo "❌ git reset --hard origin/$BRANCH failed"; exit 1; }

# Восстановить .env
if [ -n "$ENV_BACKUP" ] && [ -f "$ENV_BACKUP" ]; then
  if [ ! -f "$BACKEND_ENV" ] || ! diff -q "$BACKEND_ENV" "$ENV_BACKUP" > /dev/null 2>&1; then
    cp "$ENV_BACKUP" "$BACKEND_ENV"
    echo "✅ .env восстановлен"
  fi
  rm -f "$ENV_BACKUP"
fi

if [ -n "$LUZHNIKI_BUNDLE_BACKUP" ] && [ -f "$LUZHNIKI_BUNDLE_BACKUP" ]; then
  seat_count=$(node -e "const j=require(process.argv[1]);process.stdout.write(String(j.seatCount||j.seats?.length||0))" "$LUZHNIKI_BUNDLE_BACKUP" 2>/dev/null || echo 0)
  if [ "${seat_count:-0}" -gt 0 ] 2>/dev/null; then
    cp "$LUZHNIKI_BUNDLE_BACKUP" "$LUZHNIKI_EDITOR_BUNDLE"
    echo "✅ Luzhniki editor bundle восстановлен ($seat_count мест)"
    if [ -n "$LUZHNIKI_HAND_SVG_BACKUP" ] && [ -f "$LUZHNIKI_HAND_SVG_BACKUP" ]; then
      mkdir -p "$(dirname "$LUZHNIKI_HAND_SVG")"
      cp "$LUZHNIKI_HAND_SVG_BACKUP" "$LUZHNIKI_HAND_SVG"
      echo "✅ Luzhniki hand SVG восстановлен"
    fi
    if [ -n "$LUZHNIKI_PUBLIC_SVG_BACKUP" ] && [ -f "$LUZHNIKI_PUBLIC_SVG_BACKUP" ]; then
      mkdir -p "$(dirname "$LUZHNIKI_PUBLIC_SVG")"
      cp "$LUZHNIKI_PUBLIC_SVG_BACKUP" "$LUZHNIKI_PUBLIC_SVG"
      echo "✅ Luzhniki public SVG восстановлен"
    fi
  fi
  rm -f "$LUZHNIKI_BUNDLE_BACKUP"
fi
rm -f "$LUZHNIKI_HAND_SVG_BACKUP" "$LUZHNIKI_PUBLIC_SVG_BACKUP"

# Frontend (Vite тяжёлый; на VPS 1–2 GB без swap часто OOM — нужен swap и/или лимит ниже)
echo ""
echo "📦 Сборка frontend..."
FRONTEND_OK=1
(
  cd "$PROJECT_ROOT/frontend"
  # На VPS часто NODE_ENV=production → npm ci без devDependencies → vite: not found
  unset NODE_ENV
  export NPM_CONFIG_PRODUCTION=false
  npm ci --include=dev --prefer-offline --no-audit 2>/dev/null \
    || npm install --include=dev --no-audit
  : "${NODE_OPTIONS:=--max-old-space-size=4096}"
  export NODE_OPTIONS
  npm run build
  printf '%s\n' 'google-site-verification: google878cb9d84aaaf0e5.html' > "$PROJECT_ROOT/frontend/dist/google878cb9d84aaaf0e5.html"
  chown -R www-data:www-data dist 2>/dev/null || true
) || FRONTEND_OK=0
if [ "$FRONTEND_OK" = 1 ]; then
  echo "✅ Frontend собран"
  if [ -f "$PROJECT_ROOT/luzhniki.txt" ] && [ -f "$PROJECT_ROOT/tickets.json" ]; then
    echo "🗺️  Диагностика Лужников → frontend/dist/tools/..."
    (
      cd "$PROJECT_ROOT/backend"
      npm run render:luzhniki-seat-grid
    ) || echo "⚠️ render:luzhniki-seat-grid — пропуск"
    chown -R www-data:www-data "$PROJECT_ROOT/frontend/dist/tools" 2>/dev/null || true
  fi
else
  echo "⚠️ Frontend не собран (vite/npm) — backend и pm2 всё равно обновим; пересоберите фронт вручную"
fi

# Backend
echo ""
echo "📦 Backend зависимости..."
cd "$PROJECT_ROOT/backend"
npm ci --prefer-offline --no-audit 2>/dev/null || npm install --no-audit

if [ -f "scripts/apply-migrations-to-db.js" ]; then
  echo "🔄 Миграции (CRM)..."
  node scripts/apply-migrations-to-db.js 2>/dev/null || echo "⚠️ Миграции: проверьте вручную"
fi

if [ -f "scripts/ensure-getbilet-stage-maps-columns.js" ]; then
  echo "🎭 Колонки getbilet_stage_maps (если миграция 074 не доехала)..."
  node scripts/ensure-getbilet-stage-maps-columns.js 2>/dev/null || true
fi

if [ -f "scripts/ensure-getbilet-storefront-hidden-column.js" ]; then
  echo "🎫 Колонка getbilet_events.storefront_hidden..."
  node scripts/ensure-getbilet-storefront-hidden-column.js 2>/dev/null || true
fi

if [ -f "scripts/apply-ticket-migrations.js" ]; then
  echo "🎫 Миграции ticket DB..."
  node scripts/apply-ticket-migrations.js 2>/dev/null || echo "⚠️ Ticket DB: задайте TICKET_* в .env и примените migrate:tickets"
fi

if [ -f "scripts/seed-tbank-demo-event.js" ]; then
  echo "🧪 Демо-мероприятие T-Bank (тест интернет-эквайринга)..."
  node scripts/seed-tbank-demo-event.js 2>/dev/null || echo "⚠️ seed T-Bank demo: проверьте TICKET_* и ticket DB"
fi

if [ -f "scripts/seed-mht-main-hall-stage-map.js" ]; then
  echo "🎭 Схема зала МХТ (основной зал, векторный SVG в public/hall-maps)..."
  node scripts/seed-mht-main-hall-stage-map.js 2>/dev/null || echo "⚠️ seed MHT stage map: проверьте TICKET_* и ticket DB"
fi

if [ -f "scripts/ensure-luzhniki-football-stage-map.js" ] && [ -f "$PROJECT_ROOT/tickets.json" ] && [ -f "$PROJECT_ROOT/luzhniki.txt" ]; then
  echo "⚽ Схема Лужников (футбол, luzhniki-football)..."
  node scripts/ensure-luzhniki-football-stage-map.js 2>/dev/null \
    || echo "⚠️ luzhniki-football: проверьте TICKET_* в backend/.env и файлы tickets.json + luzhniki.txt в корне репо"
fi

if [ -f "scripts/add-travel-cases.js" ]; then
  echo "📝 Кейсы (travel)..."
  node scripts/add-travel-cases.js 2>/dev/null || true
fi

if [ -f "scripts/update-travel-cases-content.js" ]; then
  echo "🔄 Обновление travel-кейсов (цвета, шрифты, показатели)..."
  node scripts/update-travel-cases-content.js 2>/dev/null || true
fi

# PM2 restart
echo ""
echo "🔄 Перезапуск PM2..."
pm2 restart all --update-env || echo "⚠️ pm2 restart: проверьте вручную"

echo ""
echo "✅ Деплой завершён. Проверьте: pm2 status && pm2 logs"
echo ""
echo "SEO: robots.txt → frontend/dist/robots.txt; sitemap.xml — GET /sitemap.xml (backend)."
echo "Проверка: curl -sI https://biletvsem.com/robots.txt | head -1"
echo "         curl -sI https://biletvsem.com/sitemap.xml | head -1"
