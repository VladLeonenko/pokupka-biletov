-- OAuth-токен Яндекс.Метрики для графиков в админке. Счётчик билетов по умолчанию.

CREATE TABLE IF NOT EXISTS yandex_metrika_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  counter_id VARCHAR(32),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO yandex_metrika_config (id, counter_id)
VALUES (1, '109119282')
ON CONFLICT (id) DO UPDATE SET
  counter_id = COALESCE(yandex_metrika_config.counter_id, EXCLUDED.counter_id);
