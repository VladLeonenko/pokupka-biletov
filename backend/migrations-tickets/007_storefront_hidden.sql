ALTER TABLE getbilet_events
  ADD COLUMN IF NOT EXISTS storefront_hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_getbilet_events_storefront_hidden
  ON getbilet_events (storefront_hidden)
  WHERE storefront_hidden = TRUE;

COMMENT ON COLUMN getbilet_events.storefront_hidden IS
  'TRUE — убрать с публичной витрины вручную; live-каталог GetBilet всё равно синкается в кэш';
