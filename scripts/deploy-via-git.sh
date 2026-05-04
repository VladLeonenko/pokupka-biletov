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

# Git pull
echo "📥 git pull origin $BRANCH"
git fetch origin
git checkout "$BRANCH" 2>/dev/null || true
git pull origin "$BRANCH" || { echo "❌ git pull failed"; exit 1; }

# Восстановить .env
if [ -n "$ENV_BACKUP" ] && [ -f "$ENV_BACKUP" ]; then
  if [ ! -f "$BACKEND_ENV" ] || ! diff -q "$BACKEND_ENV" "$ENV_BACKUP" > /dev/null 2>&1; then
    cp "$ENV_BACKUP" "$BACKEND_ENV"
    echo "✅ .env восстановлен"
  fi
  rm -f "$ENV_BACKUP"
fi

# Frontend (Vite тяжёлый; на VPS 1–2 GB без swap часто OOM — нужен swap и/или лимит ниже)
echo ""
echo "📦 Сборка frontend..."
cd "$PROJECT_ROOT/frontend"
npm ci --prefer-offline --no-audit 2>/dev/null || npm install --no-audit
: "${NODE_OPTIONS:=--max-old-space-size=4096}"
export NODE_OPTIONS
npm run build
# Google Search Console (файл не храним в git — dist пересобирается на каждом деплое)
printf '%s\n' 'google-site-verification: google878cb9d84aaaf0e5.html' > "$PROJECT_ROOT/frontend/dist/google878cb9d84aaaf0e5.html"
chown -R www-data:www-data dist 2>/dev/null || true
echo "✅ Frontend собран"

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
