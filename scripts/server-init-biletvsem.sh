#!/usr/bin/env bash
# Первичная настройка VPS (Ubuntu 22.04+): 91.229.9.229, домен biletvsem.com
# Запуск: sudo bash scripts/server-init-biletvsem.sh
# Потом: клон репо, .env, PM2, deploy.
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Запусти с sudo: sudo bash $0"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git nginx ufw postgresql postgresql-contrib \
  build-essential ca-certificates

# Node 20 LTS
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

command -v pm2 &>/dev/null || npm install -g pm2
command -v certbot &>/dev/null || apt-get install -y certbot python3-certbot-nginx

# Веб-корень: в минимальном Ubuntu /var/www часто ОТСУТСТВУЕТ — создаём явно.
mkdir -p /var/www
chmod 0755 /var/www
# Деплой обычно делается не от root: отдай каталог своему юзеру
if [[ -n "${SUDO_USER:-}" ]] && id "$SUDO_USER" &>/dev/null; then
  chown "$SUDO_USER:$SUDO_USER" /var/www
  echo "✅ /var/www создан, владелец: $SUDO_USER"
else
  chown root:root /var/www
  echo "✅ /var/www создан (root:root). Или: sudo bash scripts/ensure-var-www.sh USER"
fi
ls -ld /var/www

# Фаервол
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable || true

# PostgreSQL: создай БД/пользователя вручную (пароли в secrets):
#   sudo -u postgres psql -c "CREATE USER bilet WITH PASSWORD '...';"
#   sudo -u postgres psql -c "CREATE DATABASE pokupka_biletov OWNER bilet;"

echo ""
echo "Готово: nginx, ufw, node, pm2, certbot, postgresql."
echo "1) Уже есть /var/www (создан выше). Клон: cd /var/www && git clone ... pokupka-biletov"
echo "2) backend/.env: PG*, SITE_URL=https://biletvsem.com, CORS_ORIGIN=https://biletvsem.com, PORT=3000"
echo "3) frontend: npm run build (или deploy-via-git.sh)"
echo "4) certbot: certbot --nginx -d biletvsem.com -d www.biletvsem.com"
echo "5) site: install configs/nginx-biletvsem.com.conf в sites-available и sites-enabled, nginx -t, reload"
echo "6) PM2: cd backend && pm2 start app.js --name bilet-backend  (и pm2 save + pm2 startup)"
