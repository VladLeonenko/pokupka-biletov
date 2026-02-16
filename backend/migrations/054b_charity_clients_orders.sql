-- Доп. колонки для charity (clients, orders) — запускать под владельцем таблиц (postgres)
-- Использование: psql -U postgres -d primecoder_prod -f backend/migrations/054b_charity_clients_orders.sql

ALTER TABLE clients ADD COLUMN IF NOT EXISTS charity_preferences JSONB DEFAULT '[]'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS charity_preference JSONB DEFAULT NULL;
