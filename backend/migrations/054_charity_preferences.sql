-- Благотворительность: пожелания пользователя в ЛК
-- allocations: [{ fund_id, fund_name, percent }], сумма percent = 10
-- ALTER clients/orders требуют прав владельца — применить вручную под postgres при необходимости

CREATE TABLE IF NOT EXISTS user_charity_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  allocations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_charity_preferences_user ON user_charity_preferences(user_id);

COMMENT ON TABLE user_charity_preferences IS 'Пожелания пользователя по благотворительным фондам (10% от проекта)';
