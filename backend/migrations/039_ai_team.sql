-- AI Boost Team core tables

-- Subscriptions for AI team service
CREATE TABLE IF NOT EXISTS ai_team_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan_code VARCHAR(32) NOT NULL,
  primary_task_type VARCHAR(32), -- закрепленный тип задач для JUNIOR (content/analytics/...)
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, paused, cancelled
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_team_subscriptions_user ON ai_team_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_team_subscriptions_client ON ai_team_subscriptions(client_id);

-- Гарантируем только одну активную подписку AI Team на пользователя
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_team_subscriptions_user_active
  ON ai_team_subscriptions(user_id)
  WHERE status = 'active';

-- Extra metadata for tasks belonging to AI Boost Team
CREATE TABLE IF NOT EXISTS ai_team_tasks (
  task_id INTEGER PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
  subscription_id INTEGER NOT NULL REFERENCES ai_team_subscriptions(id) ON DELETE CASCADE,
  task_type VARCHAR(32) NOT NULL, -- CONTENT, ANALYTICS, SMM, ADS (строки без строгого ENUM)
  revisions_count INTEGER NOT NULL DEFAULT 0,
  awaiting_since TIMESTAMPTZ, -- когда задача отправлена на согласование клиенту
  auto_completed BOOLEAN NOT NULL DEFAULT FALSE,
  auto_completed_reason VARCHAR(64), -- SILENCE_72H и т.п.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_team_tasks_subscription ON ai_team_tasks(subscription_id);

-- Клиентские оценки задач по качеству
CREATE TABLE IF NOT EXISTS ai_team_task_ratings (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_team_task_ratings_task ON ai_team_task_ratings(task_id);
CREATE INDEX IF NOT EXISTS idx_ai_team_task_ratings_client ON ai_team_task_ratings(client_id);

-- Инциденты / проблемные сценарии по клиенту (aggressive, overload, chaos и т.п.)
CREATE TABLE IF NOT EXISTS ai_team_incidents (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type VARCHAR(32) NOT NULL, -- AGGRESSIVE, OVERLOAD, CHAOS, CONFUSED, SILENCE, WRONG_TASK, QUALITY
  severity VARCHAR(16) NOT NULL DEFAULT 'medium', -- low, medium, high
  description TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'open', -- open, resolved
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_team_incidents_client_type ON ai_team_incidents(client_id, type);
CREATE INDEX IF NOT EXISTS idx_ai_team_incidents_status ON ai_team_incidents(status);

-- Триггеры для updated_at (используем уже существующую функцию update_updated_at_column)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_ai_team_subscriptions_updated_at ON ai_team_subscriptions;
    CREATE TRIGGER update_ai_team_subscriptions_updated_at
      BEFORE UPDATE ON ai_team_subscriptions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_ai_team_tasks_updated_at ON ai_team_tasks;
    CREATE TRIGGER update_ai_team_tasks_updated_at
      BEFORE UPDATE ON ai_team_tasks
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;






