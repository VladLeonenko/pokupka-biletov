#!/usr/bin/env bash
# Первоначальная настройка нового пустого сервера для PrimeCoder
# Запускать на сервере под root.
# Использование: scp на сервер, затем ssh и: chmod +x setup-new-server.sh && ./setup-new-server.sh

set -euo pipefail

echo "PrimeCoder - настройка нового сервера"
echo ""

if [ "$(id -u)" -ne 0 ]; then
  echo "Запустите под root"
  exit 1
fi

if ! command -v node &>/dev/null; then
  echo "Установка Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node.js $(node -v)"

apt-get update
apt-get install -y git nginx postgresql postgresql-contrib certbot python3-certbot-nginx

if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
fi
echo "PM2 $(pm2 -v)"

PROJECT_DIR="/www/prime-coder.ru"
mkdir -p "$(dirname $PROJECT_DIR)"

if [ ! -d "$PROJECT_DIR/.git" ]; then
  echo "Клонирование репозитория..."
  git clone https://github.com/VladLeonenko/primecoder-gulp.git "$PROJECT_DIR" || mkdir -p "$PROJECT_DIR"
else
  echo "Репозиторий уже клонирован"
fi

cd "$PROJECT_DIR"

if [ ! -f backend/.env ]; then
  echo ""
  echo "Создайте backend/.env вручную! Минимум: PGUSER, PGHOST, PGDATABASE, PGPASSWORD, PGPORT, JWT_SECRET, CORS_ORIGIN, SITE_URL"
  echo ""
  read -p "Нажмите Enter после создания .env..."
fi

mkdir -p /var/log/primecoder

echo ""
echo "Запустите deploy: cd $PROJECT_DIR && ./scripts/deploy-via-git.sh main"
echo ""
