-- Таблица чатов (беседы между клиентом и админом)
CREATE TABLE IF NOT EXISTS chats (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'closed', 'archived'
  source TEXT NOT NULL DEFAULT 'website', -- 'website', 'form', 'chatbot'
  form_id TEXT, -- ID формы, если чат создан из формы
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL -- Админ, назначенный на чат
);

CREATE INDEX IF NOT EXISTS idx_chats_client ON chats(client_id);
CREATE INDEX IF NOT EXISTS idx_chats_status ON chats(status);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at);
CREATE INDEX IF NOT EXISTS idx_chats_assigned_to ON chats(assigned_to);

-- Таблица сообщений в чате
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL, -- 'client', 'admin', 'bot'
  sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Для админа
  message_text TEXT,
  message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'file', 'proposal', 'system'
  file_url TEXT, -- URL файла, если message_type = 'file'
  file_name TEXT, -- Имя файла
  file_size INTEGER, -- Размер файла в байтах
  metadata JSONB, -- Дополнительные данные (например, для коммерческого предложения)
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_bot_message BOOLEAN NOT NULL DEFAULT FALSE, -- Флаг для сообщений от бота
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_type);
CREATE INDEX IF NOT EXISTS idx_chat_messages_read ON chat_messages(is_read);

-- Таблица настроек чат-бота (правила и ответы)
CREATE TABLE IF NOT EXISTS chatbot_rules (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL, -- Название правила
  keywords TEXT[] NOT NULL, -- Ключевые слова для срабатывания
  response_text TEXT, -- Текстовый ответ
  response_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'file', 'proposal', 'redirect'
  file_url TEXT, -- URL файла для отправки
  file_name TEXT, -- Имя файла
  proposal_template_id INTEGER, -- ID шаблона коммерческого предложения
  redirect_url TEXT, -- URL для редиректа
  priority INTEGER NOT NULL DEFAULT 0, -- Приоритет правила (больше = выше)
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_rules_active ON chatbot_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_chatbot_rules_priority ON chatbot_rules(priority DESC);

-- Таблица шаблонов коммерческих предложений
CREATE TABLE IF NOT EXISTS proposal_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- HTML или текст шаблона
  file_url TEXT, -- URL PDF файла, если есть
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_templates_active ON proposal_templates(is_active);

-- Таблица истории работы чат-бота (для аналитики)
CREATE TABLE IF NOT EXISTS chatbot_logs (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER REFERENCES chats(id) ON DELETE SET NULL,
  rule_id INTEGER REFERENCES chatbot_rules(id) ON DELETE SET NULL,
  user_message TEXT NOT NULL,
  bot_response TEXT,
  response_type TEXT,
  matched_keywords TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_logs_chat ON chatbot_logs(chat_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_logs_created_at ON chatbot_logs(created_at);

-- Функция для обновления updated_at и last_message_at в чате
CREATE OR REPLACE FUNCTION update_chat_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats
  SET updated_at = NOW(),
      last_message_at = NOW()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'chat_messages_update_timestamp'
  ) THEN
    CREATE TRIGGER chat_messages_update_timestamp
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_timestamp();
  END IF;
END;
$$;

-- Комментарии
COMMENT ON TABLE chats IS 'Таблица чатов между клиентами и админами';
COMMENT ON TABLE chat_messages IS 'Сообщения в чатах';
COMMENT ON TABLE chatbot_rules IS 'Правила и ответы чат-бота';
COMMENT ON TABLE proposal_templates IS 'Шаблоны коммерческих предложений';
COMMENT ON TABLE chatbot_logs IS 'Логи работы чат-бота для аналитики';

