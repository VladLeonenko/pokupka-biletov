-- Расширяем таблицу отзывов для полного функционала
ALTER TABLE brand_reviews
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_moderated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS response_text TEXT,
ADD COLUMN IF NOT EXISTS response_author TEXT,
ADD COLUMN IF NOT EXISTS response_date TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS service_type TEXT;

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_brand_reviews_is_published ON brand_reviews(is_published);
CREATE INDEX IF NOT EXISTS idx_brand_reviews_rating ON brand_reviews(rating DESC);
CREATE INDEX IF NOT EXISTS idx_brand_reviews_helpful ON brand_reviews(helpful_count DESC);

-- Добавляем таблицу для лайков (чтобы один пользователь мог лайкнуть только раз)
CREATE TABLE IF NOT EXISTS review_helpful_votes (
  id SERIAL PRIMARY KEY,
  review_id INTEGER NOT NULL REFERENCES brand_reviews(id) ON DELETE CASCADE,
  user_ip TEXT NOT NULL,
  user_fingerprint TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  UNIQUE(review_id, user_ip)
);

CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review_id ON review_helpful_votes(review_id);

