-- Добавляем привязку отзывов к конкретным товарам/услугам
ALTER TABLE brand_reviews ADD COLUMN IF NOT EXISTS product_slug TEXT;
ALTER TABLE brand_reviews ADD COLUMN IF NOT EXISTS author_position TEXT;
ALTER TABLE brand_reviews ADD COLUMN IF NOT EXISTS author_company TEXT;

-- Индекс для быстрой фильтрации по продукту
CREATE INDEX IF NOT EXISTS idx_brand_reviews_product_slug ON brand_reviews(product_slug);
