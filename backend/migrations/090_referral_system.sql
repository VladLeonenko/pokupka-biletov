-- Реферальная система: агенты, клики, атрибуция заказов, конверсии

CREATE TABLE IF NOT EXISTS referral_agents (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  commission_type TEXT NOT NULL DEFAULT 'percent'
    CHECK (commission_type IN ('percent', 'fixed')),
  commission_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cookie_days INT NOT NULL DEFAULT 30 CHECK (cookie_days > 0 AND cookie_days <= 365),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT referral_agents_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_referral_agents_active ON referral_agents (is_active) WHERE is_active;

CREATE TABLE IF NOT EXISTS referral_clicks (
  id BIGSERIAL PRIMARY KEY,
  agent_id INT NOT NULL REFERENCES referral_agents(id) ON DELETE CASCADE,
  visitor_key TEXT NOT NULL,
  session_id TEXT,
  landing_path TEXT,
  landing_url TEXT,
  referer TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  ym_client_id TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_clicks_agent_created
  ON referral_clicks (agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_visitor
  ON referral_clicks (visitor_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_created
  ON referral_clicks (created_at DESC);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS referral_agent_id INT REFERENCES referral_agents(id) ON DELETE SET NULL;
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS referral_click_id BIGINT REFERENCES referral_clicks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_referral_agent
  ON orders (referral_agent_id)
  WHERE referral_agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_referral_agent_created
  ON orders (referral_agent_id, created_at DESC)
  WHERE referral_agent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS referral_conversions (
  id BIGSERIAL PRIMARY KEY,
  agent_id INT NOT NULL REFERENCES referral_agents(id) ON DELETE CASCADE,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  click_id BIGINT REFERENCES referral_clicks(id) ON DELETE SET NULL,
  amount_cents INT NOT NULL,
  commission_cents INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('held', 'approved', 'reversed')),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reversed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT referral_conversions_order_unique UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_conversions_agent_status
  ON referral_conversions (agent_id, status, paid_at DESC);
