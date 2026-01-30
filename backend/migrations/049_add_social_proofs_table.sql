-- Таблица для социальных доказательств (отзывы, кейсы, метрики)
CREATE TABLE IF NOT EXISTS social_proofs (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL, -- 'review', 'case', 'metric', 'testimonial'
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  value TEXT, -- Для метрик: "150+", "98%", "45%"
  label TEXT, -- Для метрик: "Проектов выполнено", "Довольных клиентов"
  author_name TEXT, -- Для отзывов
  author_position TEXT, -- Для отзывов
  author_company TEXT, -- Для отзывов
  rating INTEGER, -- Для отзывов (1-5)
  link_url TEXT, -- Ссылка на кейс или отзыв
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_proofs_type ON social_proofs(type);
CREATE INDEX IF NOT EXISTS idx_social_proofs_active ON social_proofs(is_active);
