-- Ручной URL афиши поверх GetBilet
ALTER TABLE getbilet_events
  ADD COLUMN IF NOT EXISTS poster_url_manual TEXT;

COMMENT ON COLUMN getbilet_events.poster_url_manual IS 'Постер для витрины; перекрывает картинку из API, если задан';
