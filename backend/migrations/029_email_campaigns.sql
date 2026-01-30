-- Миграция для системы email-рассылок
-- Создает таблицы для клиентов, рассылок, писем и статистики

-- Таблица клиентов для рассылок
CREATE TABLE IF NOT EXISTS email_subscribers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  phone VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced', 'complained')),
  tags TEXT[], -- Массив тегов для сегментации
  custom_fields JSONB, -- Дополнительные поля (компания, должность и т.д.)
  subscribed_at TIMESTAMP DEFAULT NOW(),
  unsubscribed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_subscribers_email ON email_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_status ON email_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_tags ON email_subscribers USING GIN(tags);

-- Таблица шаблонов писем
CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  html_content TEXT,
  text_content TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Таблица рассылок (кампаний)
CREATE TABLE IF NOT EXISTS email_campaigns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  html_content TEXT,
  text_content TEXT,
  template_id INTEGER REFERENCES email_templates(id),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  from_email VARCHAR(255),
  from_name VARCHAR(255),
  reply_to VARCHAR(255),
  segment_filter JSONB, -- Фильтры для сегментации (по тегам, статусу и т.д.)
  total_recipients INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_by ON email_campaigns(created_by);

-- Таблица отправленных писем (для отслеживания каждого письма)
CREATE TABLE IF NOT EXISTS email_messages (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES email_campaigns(id) ON DELETE CASCADE,
  subscriber_id INTEGER REFERENCES email_subscribers(id) ON DELETE CASCADE,
  message_id VARCHAR(255) UNIQUE, -- Уникальный ID письма для отслеживания
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'failed')),
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  bounced_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_messages_campaign_id ON email_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_subscriber_id ON email_messages(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_status ON email_messages(status);
CREATE INDEX IF NOT EXISTS idx_email_messages_message_id ON email_messages(message_id);

-- Таблица открытий писем (tracking pixel)
CREATE TABLE IF NOT EXISTS email_opens (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES email_messages(id) ON DELETE CASCADE,
  opened_at TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  opened_count INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_email_opens_message_id ON email_opens(message_id);
CREATE INDEX IF NOT EXISTS idx_email_opens_opened_at ON email_opens(opened_at);

-- Таблица кликов по ссылкам
CREATE TABLE IF NOT EXISTS email_clicks (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES email_messages(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  clicked_at TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  clicked_count INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_email_clicks_message_id ON email_clicks(message_id);
CREATE INDEX IF NOT EXISTS idx_email_clicks_url ON email_clicks(url);
CREATE INDEX IF NOT EXISTS idx_email_clicks_clicked_at ON email_clicks(clicked_at);

-- Таблица ответов на письма
CREATE TABLE IF NOT EXISTS email_replies (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES email_messages(id) ON DELETE CASCADE,
  reply_to_message_id VARCHAR(255), -- ID исходного письма
  subject TEXT,
  body TEXT,
  replied_at TIMESTAMP DEFAULT NOW(),
  from_email VARCHAR(255),
  from_name VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_email_replies_message_id ON email_replies(message_id);
CREATE INDEX IF NOT EXISTS idx_email_replies_replied_at ON email_replies(replied_at);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_email_subscribers_updated_at ON email_subscribers;
CREATE TRIGGER update_email_subscribers_updated_at
  BEFORE UPDATE ON email_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_campaigns_updated_at ON email_campaigns;
CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

