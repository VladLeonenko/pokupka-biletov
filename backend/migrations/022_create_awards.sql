CREATE TABLE IF NOT EXISTS awards (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  description TEXT NOT NULL,
  case_slug TEXT,
  external_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_awards_year ON awards(year);
CREATE INDEX IF NOT EXISTS idx_awards_active ON awards(is_active);
CREATE INDEX IF NOT EXISTS idx_awards_sort ON awards(sort_order);

-- Добавляем связь с кейсами (если таблица cases существует)
-- Внешний ключ не обязателен, так как case_slug может быть NULL
-- DO $$
-- BEGIN
--   IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cases') THEN
--     ALTER TABLE awards ADD CONSTRAINT fk_awards_case 
--       FOREIGN KEY (case_slug) REFERENCES cases(slug) ON DELETE SET NULL;
--   END IF;
-- END $$;
