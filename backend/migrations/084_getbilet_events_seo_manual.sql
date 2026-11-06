-- Ручные SEO-поля на каждое событие (как blog seo_* у PrimeCoder).
-- Catalog TICKET_SEO и эти колонки побеждают auto title/desc.

ALTER TABLE getbilet_events
  ADD COLUMN IF NOT EXISTS seo_title_manual TEXT NULL,
  ADD COLUMN IF NOT EXISTS seo_description_manual TEXT NULL,
  ADD COLUMN IF NOT EXISTS seo_keywords_manual TEXT NULL,
  ADD COLUMN IF NOT EXISTS seo_h1_manual TEXT NULL,
  ADD COLUMN IF NOT EXISTS seo_h2_manual TEXT NULL;

COMMENT ON COLUMN getbilet_events.seo_title_manual IS 'SSR/CSR <title>; ≤70; перекрывает auto и TICKET_SEO при наличии';
COMMENT ON COLUMN getbilet_events.seo_description_manual IS 'meta description; ≤160';
COMMENT ON COLUMN getbilet_events.seo_keywords_manual IS 'meta keywords (hot-фразы через запятую)';
COMMENT ON COLUMN getbilet_events.seo_h1_manual IS 'H1 на карточке события';
COMMENT ON COLUMN getbilet_events.seo_h2_manual IS 'H2 подзаголовок / второй акцент на странице';
