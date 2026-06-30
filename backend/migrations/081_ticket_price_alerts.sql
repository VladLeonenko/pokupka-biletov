-- Подписки на уведомления о появлении билетов / снижении цены
CREATE TABLE IF NOT EXISTS ticket_price_alerts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(320) NOT NULL,
  repertoire_id TEXT NOT NULL,
  event_title TEXT,
  ticket_path TEXT,
  max_price_rub NUMERIC(12, 2),
  session_dt TEXT,
  zone_filter TEXT,
  last_snapshot_json JSONB,
  last_notified_at TIMESTAMPTZ,
  last_notify_reason TEXT,
  notify_count INT NOT NULL DEFAULT 0,
  unsubscribe_token TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_price_alerts_active_rep
  ON ticket_price_alerts (active, repertoire_id)
  WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ticket_price_alerts_email
  ON ticket_price_alerts (lower(email));

COMMENT ON TABLE ticket_price_alerts IS 'Email-алерты: появились билеты или цена ниже порога';
