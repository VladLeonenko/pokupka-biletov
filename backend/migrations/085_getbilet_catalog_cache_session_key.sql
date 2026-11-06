-- Expand сеансов писал N строк с одним repertoire_external_id → ON CONFLICT оставлял только последнюю дату.
-- Ключ кэша = vitrineRowId (repertoireId::EventDateTime), repertoire_external_id остаётся для джойнов.

ALTER TABLE getbilet_catalog_cache
  ADD COLUMN IF NOT EXISTS cache_key TEXT;

UPDATE getbilet_catalog_cache
SET cache_key = COALESCE(
  NULLIF(trim(payload_json->>'vitrineRowId'), ''),
  repertoire_external_id
)
WHERE cache_key IS NULL OR trim(cache_key) = '';

ALTER TABLE getbilet_catalog_cache
  ALTER COLUMN cache_key SET NOT NULL;

-- Старый PK на repertoire_external_id мешал хранить сеансы
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'getbilet_catalog_cache_pkey'
      AND conrelid = 'getbilet_catalog_cache'::regclass
  ) THEN
    ALTER TABLE getbilet_catalog_cache DROP CONSTRAINT getbilet_catalog_cache_pkey;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'getbilet_catalog_cache_cache_key_pkey'
      AND conrelid = 'getbilet_catalog_cache'::regclass
  ) THEN
    ALTER TABLE getbilet_catalog_cache
      ADD CONSTRAINT getbilet_catalog_cache_cache_key_pkey PRIMARY KEY (cache_key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_getbilet_catalog_cache_repertoire
  ON getbilet_catalog_cache (repertoire_external_id);

COMMENT ON COLUMN getbilet_catalog_cache.cache_key IS
  'Уникальный ключ строки витрины: vitrineRowId (репертуар::дата) или repertoire_external_id';
