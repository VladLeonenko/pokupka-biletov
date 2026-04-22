-- Снимок GetOfferListByRepertoireId для мгновенного GET /api/bilet/repertoire/:id/offers (SWR на бэкенде)
CREATE TABLE IF NOT EXISTS getbilet_repertoire_offers_cache (
  repertoire_external_id TEXT PRIMARY KEY,
  payload_json JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_getbilet_offers_cache_fetched ON getbilet_repertoire_offers_cache (fetched_at DESC);

COMMENT ON TABLE getbilet_repertoire_offers_cache IS 'Кэш ответа GetOfferListByRepertoireId; обновление по TTL (фон) и после брони';
