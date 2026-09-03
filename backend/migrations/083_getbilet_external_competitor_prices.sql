ALTER TABLE getbilet_events
  ADD COLUMN IF NOT EXISTS competitor_urls_json JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN getbilet_events.competitor_urls_json IS
  'URL витрин конкурентов [{source,url,label}] — Яндекс Афиша, Портбилет и др.';

CREATE TABLE IF NOT EXISTS getbilet_external_price_daily (
  snapshot_date DATE NOT NULL,
  repertoire_external_id TEXT NOT NULL,
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  min_price_rub NUMERIC(14, 2),
  max_price_rub NUMERIC(14, 2),
  our_min_price_rub NUMERIC(14, 2),
  extract_method TEXT,
  http_status INT,
  error TEXT,
  used_playwright BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (snapshot_date, repertoire_external_id, source, url)
);

CREATE INDEX IF NOT EXISTS idx_getbilet_external_price_rep
  ON getbilet_external_price_daily (repertoire_external_id, snapshot_date DESC);

CREATE TABLE IF NOT EXISTS getbilet_external_event_daily (
  snapshot_date DATE NOT NULL,
  repertoire_external_id TEXT NOT NULL,
  event_title TEXT,
  our_min_rub NUMERIC(14, 2),
  competitor_min_rub NUMERIC(14, 2),
  cheapest_source TEXT,
  cheapest_url TEXT,
  sources_ok INT NOT NULL DEFAULT 0,
  sources_fail INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (snapshot_date, repertoire_external_id)
);

CREATE INDEX IF NOT EXISTS idx_getbilet_external_event_date
  ON getbilet_external_event_daily (snapshot_date DESC);
