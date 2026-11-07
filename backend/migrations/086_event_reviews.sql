-- Отзывы и агрегированный рейтинг событий (шкала карточки 0–10, как Ticketland).
ALTER TABLE getbilet_events
  ADD COLUMN IF NOT EXISTS rating_score NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN getbilet_events.rating_score IS 'Средний рейтинг 0–10 для бейджа на карточке';
COMMENT ON COLUMN getbilet_events.rating_count IS 'Число отзывов в event_reviews';

CREATE TABLE IF NOT EXISTS event_reviews (
  id BIGSERIAL PRIMARY KEY,
  repertoire_external_id TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'Зритель',
  stars SMALLINT NOT NULL CHECK (stars >= 1 AND stars <= 5),
  body TEXT NOT NULL,
  source_label TEXT NOT NULL DEFAULT 'editorial',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  reviewed_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_reviews_repertoire
  ON event_reviews (repertoire_external_id)
  WHERE is_published = TRUE;

CREATE INDEX IF NOT EXISTS idx_event_reviews_published_at
  ON event_reviews (repertoire_external_id, reviewed_on DESC NULLS LAST);
