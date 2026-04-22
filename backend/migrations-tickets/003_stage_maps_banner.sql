ALTER TABLE getbilet_events
  ADD COLUMN IF NOT EXISTS banner_url_manual TEXT;

CREATE TABLE IF NOT EXISTS getbilet_stage_maps (
  id SERIAL PRIMARY KEY,
  stage_external_id TEXT NOT NULL,
  place_external_id TEXT,
  title TEXT,
  svg_markup TEXT,
  layout_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes_internal TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_getbilet_stage_maps_external UNIQUE (stage_external_id)
);

CREATE INDEX IF NOT EXISTS idx_getbilet_stage_maps_place ON getbilet_stage_maps (place_external_id);
