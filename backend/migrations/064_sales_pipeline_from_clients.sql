-- Sales pipeline работает с таблицей clients: лиды импортируются в клиентов, оттуда забираются в обработку.

-- Поля пайплайна в clients (лид = клиент с pipeline_stage не null)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pipeline_stage TEXT
  CHECK (pipeline_stage IS NULL OR pipeline_stage IN (
    'new', 'audited', 'email_sent', 'replied', 'qualified', 'lost', 'meeting_scheduled'
  ));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS audit_score INTEGER;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS business_potential TEXT
  CHECK (business_potential IS NULL OR business_potential IN ('high', 'medium', 'low'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS audit_summary JSONB;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_outreach_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_reply_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clients_pipeline_stage ON clients(pipeline_stage) WHERE pipeline_stage IS NOT NULL;

-- Лог исходящих касаний по клиентам (письмо / телеграм)
CREATE TABLE IF NOT EXISTS client_outreach_log (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email_template TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'telegram')),
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_outreach_log_client ON client_outreach_log(client_id);

-- Переписка по клиентам (входящие ответы)
CREATE TABLE IF NOT EXISTS client_correspondence (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  correspondence_type TEXT NOT NULL CHECK (correspondence_type IN ('incoming', 'outgoing')),
  client_email TEXT,
  subject TEXT,
  message_body TEXT,
  received_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_correspondence_client ON client_correspondence(client_id);

-- Встречи по клиентам (для будущего Zoom/календаря)
CREATE TABLE IF NOT EXISTS client_meetings (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  meeting_date TIMESTAMPTZ,
  zoom_link TEXT,
  calendar_event_id TEXT,
  meeting_status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_meetings_client ON client_meetings(client_id);

COMMENT ON COLUMN clients.pipeline_stage IS 'Этап в пайплайне холодных лидов: new → audited → email_sent → replied/qualified/lost. NULL = не в пайплайне.';
