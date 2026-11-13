-- Канонический ЧПУ /ticket/:public_slug. Внутренний getbilet_external_id не меняется.
ALTER TABLE getbilet_events
  ADD COLUMN IF NOT EXISTS public_slug TEXT NULL;

COMMENT ON COLUMN getbilet_events.public_slug IS 'Стабильный ЧПУ без даты: /ticket/{public_slug}. Пусто — пока /ticket/{getbilet_external_id}';

CREATE UNIQUE INDEX IF NOT EXISTS uq_getbilet_events_public_slug
  ON getbilet_events (public_slug)
  WHERE public_slug IS NOT NULL;
