-- Медиаплан Яндекс.Директ: события в рекламе, семантика, SEO-черновики, бюджеты, минуса.

CREATE TABLE IF NOT EXISTS ads_mediaplan_events (
  id SERIAL PRIMARY KEY,
  event_slug TEXT NOT NULL,
  event_title TEXT NOT NULL,
  venue TEXT NULL,
  event_date DATE NULL,
  lp_url TEXT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  priority INT NOT NULL DEFAULT 50,
  sort_order INT NOT NULL DEFAULT 100,
  daily_budget_rub INT NULL,
  total_budget_rub INT NULL,
  campaign_name TEXT NULL,
  campaign_id BIGINT NULL,
  research_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  seo_title TEXT NULL,
  seo_description TEXT NULL,
  seo_h1 TEXT NULL,
  seo_keywords TEXT NULL,
  seo_score NUMERIC(4, 1) NULL,
  seo_score_notes TEXT NULL,
  body_excerpt TEXT NULL,
  forecast_impressions INT NULL,
  forecast_clicks INT NULL,
  forecast_cpc_rub NUMERIC(10, 2) NULL,
  forecast_conversions NUMERIC(10, 2) NULL,
  forecast_notes TEXT NULL,
  hot_keywords TEXT[] NOT NULL DEFAULT '{}',
  negative_keywords TEXT[] NOT NULL DEFAULT '{}',
  ad_titles TEXT[] NOT NULL DEFAULT '{}',
  ad_texts TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ads_mediaplan_events_slug_uniq UNIQUE (event_slug),
  CONSTRAINT ads_mediaplan_events_status_chk CHECK (
    status IN ('planned', 'active', 'paused', 'done', 'rejected')
  )
);

CREATE INDEX IF NOT EXISTS ads_mediaplan_events_status_idx ON ads_mediaplan_events (status);
CREATE INDEX IF NOT EXISTS ads_mediaplan_events_priority_idx ON ads_mediaplan_events (priority DESC, sort_order ASC);

COMMENT ON TABLE ads_mediaplan_events IS 'Админка: медиаплан HOT-рекламы билетов (Директ)';
COMMENT ON COLUMN ads_mediaplan_events.research_json IS 'Ориентиры: wordstat, competitors, snippets, sources, scannedAt';
