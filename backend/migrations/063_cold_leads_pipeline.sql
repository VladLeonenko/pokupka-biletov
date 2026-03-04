-- Cold Lead Sales Pipeline: лиды, аудит сайта, аутрич, переписка
-- Соответствует логике n8n "Cold Lead Sales Pipeline with Automated Client Audit"

-- Лиды (источник: таблица/импорт, не путать с clients — это холодный входящий поток)
CREATE TABLE IF NOT EXISTS cold_leads (
  id SERIAL PRIMARY KEY,
  company_name TEXT NOT NULL,
  website TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  source TEXT NOT NULL DEFAULT 'import',  -- 'import', 'sheets', 'form'
  stage TEXT NOT NULL DEFAULT 'new' CHECK (stage IN (
    'new',           -- только импортирован
    'audited',       -- аудит сайта выполнен
    'email_sent',   -- письмо/телем отправлено
    'replied',      -- клиент ответил, нужен follow-up
    'qualified',    -- готов к встрече
    'lost',         -- отказ
    'meeting_scheduled'
  )),
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  -- Результаты аудита (заполняются процессом)
  audit_score INTEGER,           -- 0-100
  business_potential TEXT CHECK (business_potential IN ('high', 'medium', 'low')),
  audit_summary JSONB,           -- key_issues, opportunities, recommended_approach, personalized_intro и т.д.
  last_outreach_at TIMESTAMPTZ,
  last_reply_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cold_leads_stage ON cold_leads(stage);
CREATE INDEX IF NOT EXISTS idx_cold_leads_email ON cold_leads(email);
CREATE INDEX IF NOT EXISTS idx_cold_leads_created_at ON cold_leads(created_at DESC);

-- Лог исходящих касаний (письмо / телеграм)
CREATE TABLE IF NOT EXISTS cold_lead_outreach_log (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES cold_leads(id) ON DELETE CASCADE,
  email_template TEXT,           -- 'high_potential', 'medium_potential', 'low_potential'
  channel TEXT NOT NULL CHECK (channel IN ('email', 'telegram')),
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cold_lead_outreach_lead ON cold_lead_outreach_log(lead_id);

-- Переписка (входящие ответы клиентов)
CREATE TABLE IF NOT EXISTS cold_lead_correspondence (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES cold_leads(id) ON DELETE CASCADE,
  correspondence_type TEXT NOT NULL CHECK (correspondence_type IN ('incoming', 'outgoing')),
  client_email TEXT,
  subject TEXT,
  message_body TEXT,
  received_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cold_lead_correspondence_lead ON cold_lead_correspondence(lead_id);

-- Встречи (Zoom/календарь — опционально, пока можно хранить запланированные)
CREATE TABLE IF NOT EXISTS cold_lead_meetings (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES cold_leads(id) ON DELETE CASCADE,
  meeting_date TIMESTAMPTZ,
  zoom_link TEXT,
  calendar_event_id TEXT,
  meeting_status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cold_lead_meetings_lead ON cold_lead_meetings(lead_id);

COMMENT ON TABLE cold_leads IS 'Холодные лиды: импорт, аудит сайта, этапы до встречи/отказа';
COMMENT ON COLUMN cold_leads.audit_summary IS 'JSON: audit_score, key_issues, opportunities, business_potential, recommended_approach, personalized_intro';
