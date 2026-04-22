ALTER TABLE getbilet_stage_maps
  ADD COLUMN IF NOT EXISTS external_plan_url TEXT NULL;

COMMENT ON COLUMN getbilet_stage_maps.external_plan_url IS 'URL схем залов на сайте театра';
