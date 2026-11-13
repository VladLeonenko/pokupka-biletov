-- Медиаплан: группы объявлений, даты LP, минуса кампании.
-- 1 row = 1 event/LP; группы по интенту+landing, не по календарным дням.

ALTER TABLE ads_mediaplan_events
  ADD COLUMN IF NOT EXISTS date_label TEXT NULL;

ALTER TABLE ads_mediaplan_events
  ADD COLUMN IF NOT EXISTS date_from DATE NULL;

ALTER TABLE ads_mediaplan_events
  ADD COLUMN IF NOT EXISTS date_to DATE NULL;

ALTER TABLE ads_mediaplan_events
  ADD COLUMN IF NOT EXISTS campaign_negatives TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE ads_mediaplan_events
  ADD COLUMN IF NOT EXISTS structure_json JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN ads_mediaplan_events.date_label IS 'Человекочитаемый диапазон дат в креативах, напр. «20 ноября» / «18 дек – 10 янв»';
COMMENT ON COLUMN ads_mediaplan_events.date_from IS 'Начало окна продаж/дат LP (не отдельная РК на день)';
COMMENT ON COLUMN ads_mediaplan_events.date_to IS 'Конец окна продаж/дат LP';
COMMENT ON COLUMN ads_mediaplan_events.campaign_negatives IS 'Минуса уровня кампании (общий мусор РК)';
COMMENT ON COLUMN ads_mediaplan_events.structure_json IS 'Массив групп: id, name, landing_url, hot_keywords[], negative_keywords[], ads[{title,title2,text}]';
