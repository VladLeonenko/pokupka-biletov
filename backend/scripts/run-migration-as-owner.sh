#!/bin/bash
# Применить одну миграцию от имени владельца БД (postgres).
# Использование: ./run-migration-as-owner.sh 064_sales_pipeline_from_clients.sql
# Или: sudo -u postgres psql -d primecoder_prod -f backend/migrations/064_sales_pipeline_from_clients.sql

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$(dirname "$SCRIPT_DIR")/migrations"
MIGRATION="${1:-064_sales_pipeline_from_clients.sql}"
DB_NAME="${PGDATABASE:-primecoder_prod}"

if [[ ! -f "$MIGRATIONS_DIR/$MIGRATION" ]]; then
  echo "Файл не найден: $MIGRATIONS_DIR/$MIGRATION"
  exit 1
fi

echo "Применяем $MIGRATION к БД $DB_NAME от пользователя postgres..."
sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$MIGRATIONS_DIR/$MIGRATION"
echo "Готово."
