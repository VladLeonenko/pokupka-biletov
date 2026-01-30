-- Добавляем session_id в таблицу chats для уникальной идентификации пользователей
ALTER TABLE chats ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Создаем индекс для быстрого поиска чатов по session_id
CREATE INDEX IF NOT EXISTS idx_chats_session_id ON chats(session_id);

COMMENT ON COLUMN chats.session_id IS 'Уникальный идентификатор сессии браузера пользователя';

