-- Добавить slug и conditions в таблицу promotions
ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS conditions TEXT;

CREATE INDEX IF NOT EXISTS idx_promotions_slug ON promotions(slug) WHERE slug IS NOT NULL;
