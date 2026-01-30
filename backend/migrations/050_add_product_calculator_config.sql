-- Таблица для конфигурации калькулятора стоимости
CREATE TABLE IF NOT EXISTS product_calculator_config (
  id SERIAL PRIMARY KEY,
  product_slug TEXT NOT NULL REFERENCES products(slug) ON DELETE CASCADE,
  config_json JSONB NOT NULL DEFAULT '{}', -- Конфигурация калькулятора
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_slug)
);

CREATE INDEX IF NOT EXISTS idx_calculator_config_product ON product_calculator_config(product_slug);
CREATE INDEX IF NOT EXISTS idx_calculator_config_active ON product_calculator_config(is_active);
