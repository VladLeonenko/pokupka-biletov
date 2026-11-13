-- Попап: 10% на ВСЁ КРОМЕ Большого; venue_scope; anti-abuse поля; правка кампании

ALTER TABLE promo_popup_campaigns
  ADD COLUMN IF NOT EXISTS venue_scope TEXT NOT NULL DEFAULT 'exclude';

ALTER TABLE promo_popup_campaigns
  DROP CONSTRAINT IF EXISTS chk_promo_popup_venue_scope;
ALTER TABLE promo_popup_campaigns
  ADD CONSTRAINT chk_promo_popup_venue_scope
  CHECK (venue_scope IN ('include', 'exclude', 'all'));

ALTER TABLE getbilet_promo_codes
  ADD COLUMN IF NOT EXISTS venue_scope TEXT NOT NULL DEFAULT 'include';

ALTER TABLE getbilet_promo_codes
  DROP CONSTRAINT IF EXISTS chk_getbilet_promo_venue_scope;
ALTER TABLE getbilet_promo_codes
  ADD CONSTRAINT chk_getbilet_promo_venue_scope
  CHECK (venue_scope IN ('include', 'exclude', 'all'));

ALTER TABLE promo_popup_grants
  ADD COLUMN IF NOT EXISTS claim_ip TEXT;

CREATE INDEX IF NOT EXISTS idx_promo_popup_grants_ip_created
  ON promo_popup_grants (claim_ip, created_at DESC);

-- Старые коды «только Большой» гасим
UPDATE getbilet_promo_codes
SET is_active = FALSE, updated_at = NOW()
WHERE campaign_slug = 'bolshoi-10'
   OR code ILIKE 'BOLSH10-%';

-- Кампанию переводим на «кроме Большого»
UPDATE promo_popup_campaigns
SET
  slug = 'except-bolshoi-10',
  venue_scope = 'exclude',
  venue_ilike = '%Больш%',
  code_prefix = 'SITE10',
  headline = 'Ваш промокод на 10%',
  body_text = E'Ваш личный промокод на любое мероприятие, кроме Большого театра.\n\nСкидка 10%, действует 60 минут. Успейте выбрать билеты.',
  cta_label = 'Скопировать код',
  discount_kind = 'percent',
  discount_value = 10,
  ttl_minutes = 60,
  delay_ms = 12000,
  is_active = TRUE,
  notes = '10% на все события кроме Большого; TTL 60 мин; 1 выдача на visitor',
  updated_at = NOW()
WHERE slug IN ('bolshoi-10', 'except-bolshoi-10');

INSERT INTO promo_popup_campaigns (
  slug, is_active, headline, body_text, cta_label,
  discount_kind, discount_value, ttl_minutes, venue_ilike, venue_scope,
  code_prefix, delay_ms, notes
)
SELECT
  'except-bolshoi-10',
  TRUE,
  'Ваш промокод на 10%',
  E'Ваш личный промокод на любое мероприятие, кроме Большого театра.\n\nСкидка 10%, действует 60 минут. Успейте выбрать билеты.',
  'Скопировать код',
  'percent',
  10,
  60,
  '%Больш%',
  'exclude',
  'SITE10',
  12000,
  '10% на все события кроме Большого; TTL 60 мин; 1 выдача на visitor'
WHERE NOT EXISTS (
  SELECT 1 FROM promo_popup_campaigns WHERE slug = 'except-bolshoi-10'
);
