-- CRM / основная БД приложения: колонки оплаты для orders + токены magic link.
-- Каталог GetBilet и ticket_external_ticket_refs живут в отдельной БД (migrations-tickets).

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_payment_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_order_ref TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_checkout_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_payment_poll_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_external_payment_id ON orders(external_payment_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_provider ON orders(payment_provider);

CREATE TABLE IF NOT EXISTS auth_login_tokens (
  id SERIAL PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  email TEXT,
  purpose TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_login_tokens_expires ON auth_login_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_login_tokens_user ON auth_login_tokens(user_id);
