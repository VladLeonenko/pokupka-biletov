#!/usr/bin/env bash
# PostgreSQL на проде biletvsem. Запуск: sudo bash scripts/setup-prod-postgres-biletvsem.sh [dump.sql.gz]
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_ENV="$PROJECT_ROOT/backend/.env"
DB_NAME="${PGDATABASE_NAME:-pokupka_biletov}"
DB_USER="${PGUSER_NAME:-bilet}"
DUMP="${1:-/root/pokupka_biletov.sql.gz}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Запусти с sudo: sudo bash $0 [путь/к/дампу.sql.gz]"
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Устанавливаю PostgreSQL..."
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y postgresql postgresql-contrib
fi

systemctl enable postgresql
systemctl start postgresql

if ! systemctl is-active --quiet postgresql; then
  echo "PostgreSQL не стартовал: systemctl status postgresql"
  exit 1
fi

if [[ ! -f "$BACKEND_ENV" ]]; then
  echo "Нет файла $BACKEND_ENV"
  exit 1
fi

DB_PASS=""
if grep -q '^PGPASSWORD=' "$BACKEND_ENV" 2>/dev/null; then
  DB_PASS="$(grep '^PGPASSWORD=' "$BACKEND_ENV" | head -1 | cut -d= -f2-)"
fi
if [[ -z "$DB_PASS" ]] || [[ "$DB_PASS" == "testpass_local_1" ]] || [[ ${#DB_PASS} -lt 12 ]]; then
  DB_PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)"
  echo "Новый пароль БД (запиши): $DB_PASS"
fi

# Роль и БД — без вложенных heredoc
ROLE_EXISTS="$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" || true)"
if [[ "$ROLE_EXISTS" != "1" ]]; then
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"
else
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"
fi

DB_EXISTS="$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" || true)"
if [[ "$DB_EXISTS" != "1" ]]; then
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
fi
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

if [[ -f "$DUMP" ]]; then
  echo "Восстанавливаю дамп: $DUMP"
  gunzip -c "$DUMP" | sudo -u postgres psql -v ON_ERROR_STOP=0 -d "$DB_NAME" || true
else
  echo "Дамп не найден ($DUMP) — пустая БД + миграции"
fi

JWT_SECRET="$(openssl rand -hex 32)"

set_env() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$BACKEND_ENV"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$BACKEND_ENV"
  else
    echo "${key}=${val}" >> "$BACKEND_ENV"
  fi
}

set_env PGUSER "$DB_USER"
set_env PGHOST "localhost"
set_env PGDATABASE "$DB_NAME"
set_env PGPASSWORD "$DB_PASS"
set_env PGPORT "5432"
set_env TICKET_PGUSER "$DB_USER"
set_env TICKET_PGHOST "localhost"
set_env TICKET_PGDATABASE "$DB_NAME"
set_env TICKET_PGPASSWORD "$DB_PASS"
set_env TICKET_PGPORT "5432"
set_env GETBILET_USE_MAIN_DATABASE "1"
set_env NODE_ENV "production"
set_env SITE_URL "https://biletvsem.com"
set_env CORS_ORIGIN "https://biletvsem.com,https://www.biletvsem.com"
set_env JWT_SECRET "$JWT_SECRET"

if ! grep -q '^ADMIN_EMAIL=' "$BACKEND_ENV"; then
  echo "ADMIN_EMAIL=admin@biletvsem.com" >> "$BACKEND_ENV"
  echo "ADMIN_PASSWORD=ChangeMe_Admin_$(openssl rand -hex 4)!" >> "$BACKEND_ENV"
fi

echo "Миграции CRM + ticket..."
cd "$PROJECT_ROOT/backend"
node scripts/apply-migrations-to-db.js
node scripts/apply-ticket-migrations.js 2>/dev/null || true

echo "Проверка:"
node -e "
import('./db.js').then(async ({default: p}) => {
  const db = await p.query('SELECT current_database() AS db');
  const c = await p.query('SELECT COUNT(*)::int n FROM clients');
  const f = await p.query('SELECT COUNT(*)::int n FROM sales_funnels');
  console.log({ db: db.rows[0].db, clients: c.rows[0].n, funnels: f.rows[0].n });
  await p.end();
});
"

echo ""
echo "Готово. Дальше:"
echo "  pm2 restart bilet-backend --update-env"
echo "  grep ADMIN /var/pokupka-biletov/backend/.env"
