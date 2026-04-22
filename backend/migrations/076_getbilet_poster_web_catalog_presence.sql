-- Обложка из веб-поиска (ниже приоритета, чем poster_url_manual) + метки «есть в последнем каталоге GetBilet»

ALTER TABLE getbilet_events
  ADD COLUMN IF NOT EXISTS poster_url_web TEXT NULL;

COMMENT ON COLUMN getbilet_events.poster_url_web IS 'URL обложки из автопоиска (Google CSE image); перекрывается poster_url_manual';

ALTER TABLE getbilet_events
  ADD COLUMN IF NOT EXISTS last_seen_in_catalog_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN getbilet_events.last_seen_in_catalog_at IS 'Когда мероприятие последний раз приходило в ответе каталога при POST sync-catalog';

CREATE TABLE IF NOT EXISTS getbilet_catalog_sync_meta (
  singleton SMALLINT PRIMARY KEY DEFAULT 1 CHECK (singleton = 1),
  last_completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE getbilet_catalog_sync_meta IS 'Одна строка: время последней успешной синхронизации каталога GetBilet';

INSERT INTO getbilet_catalog_sync_meta (singleton, last_completed_at)
VALUES (1, NOW())
ON CONFLICT (singleton) DO NOTHING;
