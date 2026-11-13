-- Промо-попап: кампании + персональные выдачи (TTL), скоуп площадки у промокодов

ALTER TABLE getbilet_promo_codes
  ADD COLUMN IF NOT EXISTS venue_ilike TEXT,
  ADD COLUMN IF NOT EXISTS campaign_slug TEXT,
  ADD COLUMN IF NOT EXISTS grant_visitor_key TEXT;

COMMENT ON COLUMN getbilet_promo_codes.venue_ilike IS
  'Если задано — промокод только для событий, у которых venue ILIKE этому шаблону';
COMMENT ON COLUMN getbilet_promo_codes.campaign_slug IS
  'Служебная метка кампании попапа (не для ручных промо)';
COMMENT ON COLUMN getbilet_promo_codes.grant_visitor_key IS
  'Ключ посетителя, которому выдан персональный код из попапа';

CREATE TABLE IF NOT EXISTS promo_popup_campaigns (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  headline TEXT NOT NULL,
  body_text TEXT NOT NULL,
  cta_label TEXT NOT NULL DEFAULT 'Скопировать код',
  discount_kind TEXT NOT NULL DEFAULT 'percent'
    CHECK (discount_kind IN ('percent', 'fixed')),
  discount_value NUMERIC(14, 4) NOT NULL DEFAULT 10
    CHECK (discount_value >= 0),
  ttl_minutes INT NOT NULL DEFAULT 60 CHECK (ttl_minutes >= 5 AND ttl_minutes <= 60),
  venue_ilike TEXT NOT NULL DEFAULT '%Больш%',
  code_prefix TEXT NOT NULL DEFAULT 'BOLSH10',
  delay_ms INT NOT NULL DEFAULT 2500 CHECK (delay_ms >= 0 AND delay_ms <= 120000),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_promo_popup_percent CHECK (
    discount_kind <> 'percent' OR (discount_value >= 0 AND discount_value <= 100)
  )
);

CREATE TABLE IF NOT EXISTS promo_popup_grants (
  id BIGSERIAL PRIMARY KEY,
  campaign_id INT NOT NULL REFERENCES promo_popup_campaigns(id) ON DELETE CASCADE,
  promo_code_id INT NOT NULL REFERENCES getbilet_promo_codes(id) ON DELETE CASCADE,
  visitor_key TEXT NOT NULL,
  repertoire_id TEXT,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_promo_popup_grants_code
  ON promo_popup_grants (lower(trim(code)));
CREATE INDEX IF NOT EXISTS idx_promo_popup_grants_visitor
  ON promo_popup_grants (campaign_id, visitor_key, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_promo_popup_grants_expires
  ON promo_popup_grants (expires_at);

INSERT INTO promo_popup_campaigns (
  slug, is_active, headline, body_text, cta_label,
  discount_kind, discount_value, ttl_minutes, venue_ilike, code_prefix, delay_ms, notes
) VALUES (
  'bolshoi-10',
  TRUE,
  'Ваш купон Большого',
  E'Словно билетёр протянул вам золотой корешок: десять процентов с цены билетов на спектакли Большого театра.\n\nКод живёт ровно час. Выберите места, пока занавес ещё не опущен.',
  'Скопировать код',
  'percent',
  10,
  60,
  '%Больш%',
  'BOLSH10',
  2800,
  'Автосид: попап 10% на события Большого, TTL 60 мин'
)
ON CONFLICT (slug) DO NOTHING;
