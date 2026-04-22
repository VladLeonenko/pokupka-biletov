-- URL страницы театра / афиши: оттуда подтягиваем og:image и т.п. в poster_url_manual
ALTER TABLE getbilet_events
  ADD COLUMN IF NOT EXISTS poster_page_url TEXT NULL;

COMMENT ON COLUMN getbilet_events.poster_page_url IS 'Страница спектакля на сайте театра — источник для авто-постера (og:image / JSON-LD)';
