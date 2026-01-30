-- Создаем таблицу для отзывов о брендах
CREATE TABLE IF NOT EXISTS brand_reviews (
  id SERIAL PRIMARY KEY,
  brand_name TEXT NOT NULL,
  author TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT NOT NULL,
  source TEXT DEFAULT 'Сайт',
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_reviews_brand_name ON brand_reviews(brand_name);
CREATE INDEX IF NOT EXISTS idx_brand_reviews_created_at ON brand_reviews(created_at DESC);

