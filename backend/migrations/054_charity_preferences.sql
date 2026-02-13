-- Благотворительность: пожелания клиента по фондам
-- allocations: [{ fund_id, fund_name, percent }], сумма percent = 10 (или 0 если не выбрано)

-- Предпочтения пользователя (ЛК)
CREATE TABLE IF NOT EXISTS user_charity_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  allocations JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Пример: [{"fund_id":"podari-zhizn","fund_name":"Подари жизнь","percent":5},{"fund_id":"rusfond","fund_name":"Русфонд","percent":5}]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_charity_preferences_user ON user_charity_preferences(user_id);

-- Пожелания клиента (clients) — для CRM, может дублировать user при связке
ALTER TABLE clients ADD COLUMN IF NOT EXISTS charity_preferences JSONB DEFAULT '[]'::jsonb;

-- Снимок пожеланий в заказе (на момент оформления)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS charity_preference JSONB DEFAULT NULL;

COMMENT ON TABLE user_charity_preferences IS 'Пожелания пользователя по благотворительным фондам (10% от проекта)';
COMMENT ON COLUMN clients.charity_preferences IS 'Пожелания клиента: [{ fund_id, fund_name, percent }], сумма 10';
COMMENT ON COLUMN orders.charity_preference IS 'Снимок пожеланий по фонду на момент заказа';
