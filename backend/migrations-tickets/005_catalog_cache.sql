CREATE TABLE IF NOT EXISTS getbilet_catalog_cache (
  repertoire_external_id TEXT PRIMARY KEY,
  stage_id TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_getbilet_catalog_synced ON getbilet_catalog_cache (synced_at DESC);

COMMENT ON TABLE getbilet_catalog_cache IS 'Кэш каталога GetBilet';
