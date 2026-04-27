-- Ручные площадка/адрес и краткая строка для карточки (поверх GetBilet)
ALTER TABLE getbilet_events
  ADD COLUMN IF NOT EXISTS venue_manual TEXT,
  ADD COLUMN IF NOT EXISTS venue_address_manual TEXT,
  ADD COLUMN IF NOT EXISTS card_subtitle_manual TEXT;

COMMENT ON COLUMN getbilet_events.venue_manual IS 'Подпись площадки на витрине; перекрывает справочник GetBilet, если задана';
COMMENT ON COLUMN getbilet_events.venue_address_manual IS 'Адрес площадки для витрины; перекрывает адрес из API';
COMMENT ON COLUMN getbilet_events.card_subtitle_manual IS 'Краткая строка под заголовком на карточке/hero; иначе — усечённое description_manual / API';
