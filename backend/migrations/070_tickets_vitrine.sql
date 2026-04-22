-- Единственная строка настроек витрины билетов (контент для CMS)
CREATE TABLE IF NOT EXISTS tickets_vitrine (
  singleton SMALLINT PRIMARY KEY DEFAULT 1 CHECK (singleton = 1),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO tickets_vitrine (singleton, content) VALUES (1, '{}'::jsonb)
ON CONFLICT (singleton) DO NOTHING;
