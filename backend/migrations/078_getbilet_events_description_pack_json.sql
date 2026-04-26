-- Готовый пакет описания (герой + секции) после офлайн-генерации OpenAI; публичный контекст читает из БД без вызова API.
ALTER TABLE getbilet_events
  ADD COLUMN IF NOT EXISTS description_pack_json JSONB;

COMMENT ON COLUMN getbilet_events.description_pack_json IS 'Снимок generateEventDescriptionWithOpenAI: sections, hero*, eventMeta, totalChars — отдаётся на /repertoire/:id/context без AI';
