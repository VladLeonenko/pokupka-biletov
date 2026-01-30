-- Создание таблицы для хранения согласий пользователей
CREATE TABLE IF NOT EXISTS user_consents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255), -- Для неавторизованных пользователей
    type VARCHAR(50) NOT NULL CHECK (type IN ('cookies', 'privacy', 'marketing', 'analytics')),
    category VARCHAR(50) CHECK (category IN ('necessary', 'functional', 'analytical', 'marketing')),
    necessary BOOLEAN DEFAULT false,
    functional BOOLEAN DEFAULT false,
    analytical BOOLEAN DEFAULT false,
    marketing BOOLEAN DEFAULT false,
    accepted BOOLEAN NOT NULL DEFAULT true,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Один пользователь/сессия может иметь только одно согласие каждого типа
    CONSTRAINT unique_user_consent UNIQUE (user_id, session_id, type)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_session_id ON user_consents(session_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_type ON user_consents(type);
CREATE INDEX IF NOT EXISTS idx_user_consents_created_at ON user_consents(created_at);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_user_consents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_consents_updated_at ON user_consents;
CREATE TRIGGER update_user_consents_updated_at
    BEFORE UPDATE ON user_consents
    FOR EACH ROW
    EXECUTE FUNCTION update_user_consents_updated_at();

-- Комментарии к таблице и колонкам
COMMENT ON TABLE user_consents IS 'Таблица для хранения согласий пользователей на обработку персональных данных и использование cookies';
COMMENT ON COLUMN user_consents.user_id IS 'ID пользователя (если авторизован)';
COMMENT ON COLUMN user_consents.session_id IS 'ID сессии (для неавторизованных пользователей)';
COMMENT ON COLUMN user_consents.type IS 'Тип согласия: cookies, privacy, marketing, analytics';
COMMENT ON COLUMN user_consents.category IS 'Категория cookies: necessary, functional, analytical, marketing';
COMMENT ON COLUMN user_consents.accepted IS 'Принято ли согласие (true) или отозвано (false)';
COMMENT ON COLUMN user_consents.ip_address IS 'IP-адрес пользователя на момент дачи согласия';
COMMENT ON COLUMN user_consents.user_agent IS 'User-Agent браузера пользователя';

