-- Снимки цен агентов GetBilet (закуп + розница на нашей витрине) по дням.

CREATE TABLE IF NOT EXISTS getbilet_agents_cache (
  agent_id TEXT PRIMARY KEY,
  code TEXT,
  company TEXT,
  phone TEXT,
  payload_json JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS getbilet_competitor_price_daily (
  snapshot_date DATE NOT NULL,
  repertoire_external_id TEXT NOT NULL,
  event_datetime TEXT NOT NULL DEFAULT '',
  agent_id TEXT NOT NULL,
  agent_code TEXT,
  agent_company TEXT,
  is_own BOOLEAN NOT NULL DEFAULT FALSE,
  offer_count INT NOT NULL DEFAULT 0,
  seat_count INT NOT NULL DEFAULT 0,
  min_supplier_rub NUMERIC(14, 2),
  max_supplier_rub NUMERIC(14, 2),
  min_retail_rub NUMERIC(14, 2),
  overlap_seats INT NOT NULL DEFAULT 0,
  seats_cheaper_than_own INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (snapshot_date, repertoire_external_id, event_datetime, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_getbilet_competitor_price_rep_date
  ON getbilet_competitor_price_daily (repertoire_external_id, snapshot_date DESC);

CREATE TABLE IF NOT EXISTS getbilet_competitor_event_daily (
  snapshot_date DATE NOT NULL,
  repertoire_external_id TEXT NOT NULL,
  event_title TEXT,
  own_seats INT NOT NULL DEFAULT 0,
  rival_seats INT NOT NULL DEFAULT 0,
  overlap_seats INT NOT NULL DEFAULT 0,
  seats_we_lose INT NOT NULL DEFAULT 0,
  seats_cannot_beat INT NOT NULL DEFAULT 0,
  own_min_retail_rub NUMERIC(14, 2),
  rival_min_retail_rub NUMERIC(14, 2),
  suggested_own_markup_percent NUMERIC(8, 2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (snapshot_date, repertoire_external_id)
);

CREATE INDEX IF NOT EXISTS idx_getbilet_competitor_event_date
  ON getbilet_competitor_event_daily (snapshot_date DESC, repertoire_external_id);
