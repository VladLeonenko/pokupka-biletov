-- Таблица для вопросов квиза
CREATE TABLE IF NOT EXISTS quiz_questions (
  id SERIAL PRIMARY KEY,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) DEFAULT 'single', -- single, multiple
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Таблица для вариантов ответов квиза
CREATE TABLE IF NOT EXISTS quiz_options (
  id SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_description TEXT,
  points_start INTEGER DEFAULT 0, -- Очки для тарифа START
  points_business INTEGER DEFAULT 0, -- Очки для тарифа Малый бизнес
  points_premium INTEGER DEFAULT 0, -- Очки для тарифа PPRIME
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Таблица для результатов квиза (для аналитики)
CREATE TABLE IF NOT EXISTS quiz_results (
  id SERIAL PRIMARY KEY,
  recommended_tariff VARCHAR(50), -- start, business, premium
  answers JSONB, -- Сохраненные ответы
  user_email TEXT, -- Опционально, если пользователь оставил email
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_sort ON quiz_questions(sort_order, is_active);
CREATE INDEX IF NOT EXISTS idx_quiz_options_question ON quiz_options(question_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_quiz_results_tariff ON quiz_results(recommended_tariff);
CREATE INDEX IF NOT EXISTS idx_quiz_results_created ON quiz_results(created_at);
