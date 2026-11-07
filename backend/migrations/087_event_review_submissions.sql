-- Заявки зрителей: билет-доказательство + ручная модерация.
ALTER TABLE event_reviews
  ADD COLUMN IF NOT EXISTS ticket_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS order_ref TEXT,
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'published';

COMMENT ON COLUMN event_reviews.ticket_proof_url IS 'Скан/фото билета (visitor); не отдаём в публичный API';
COMMENT ON COLUMN event_reviews.contact_email IS 'Контакт для проверки подлинности';
COMMENT ON COLUMN event_reviews.order_ref IS 'Номер заказа / билета (опционально)';
COMMENT ON COLUMN event_reviews.moderation_status IS 'published | pending | rejected';

CREATE INDEX IF NOT EXISTS idx_event_reviews_pending
  ON event_reviews (created_at DESC)
  WHERE moderation_status = 'pending';
