-- Add promo code fields to promotions table
ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS promo_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS hidden_location VARCHAR(255),
ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_promotions_promo_code ON promotions(promo_code) WHERE promo_code IS NOT NULL;







