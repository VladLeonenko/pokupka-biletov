-- Настройки рассылки из админки: размер батча и время (рекомендация для cron)
CREATE TABLE IF NOT EXISTS pipeline_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  batch_size INT NOT NULL DEFAULT 10 CHECK (batch_size >= 1 AND batch_size <= 500),
  max_emails_per_run INT CHECK (max_emails_per_run IS NULL OR max_emails_per_run >= 1),
  preferred_cron_expression VARCHAR(64) NOT NULL DEFAULT '0 9 * * *',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO pipeline_settings (id, batch_size, preferred_cron_expression)
VALUES (1, 10, '0 9 * * *')
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE pipeline_settings IS 'Настройки пайплайна холодных лидов: размер батча и рекомендуемое время cron.';
