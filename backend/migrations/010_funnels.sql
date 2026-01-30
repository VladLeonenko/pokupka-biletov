-- Sales funnels and tasks management

-- Sales funnels (like Bitrix24)
CREATE TABLE IF NOT EXISTS sales_funnels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Funnel stages (этапы воронки)
CREATE TABLE IF NOT EXISTS funnel_stages (
  id SERIAL PRIMARY KEY,
  funnel_id INTEGER NOT NULL REFERENCES sales_funnels(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(50) DEFAULT '#1976d2', -- Hex color for visualization
  sort_order INTEGER NOT NULL DEFAULT 0,
  probability INTEGER DEFAULT 0, -- 0-100, вероятность успеха на этом этапе
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_funnel_stages_funnel_id ON funnel_stages(funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_stages_sort_order ON funnel_stages(funnel_id, sort_order);

-- Deals (сделки)
CREATE TABLE IF NOT EXISTS deals (
  id SERIAL PRIMARY KEY,
  funnel_id INTEGER NOT NULL REFERENCES sales_funnels(id) ON DELETE CASCADE,
  stage_id INTEGER NOT NULL REFERENCES funnel_stages(id) ON DELETE RESTRICT,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  client_phone VARCHAR(50),
  company_name VARCHAR(255),
  budget DECIMAL(12, 2), -- Budget in rubles
  currency VARCHAR(10) DEFAULT 'RUB',
  expected_close_date DATE,
  actual_close_date DATE,
  is_won BOOLEAN DEFAULT false,
  is_lost BOOLEAN DEFAULT false,
  loss_reason TEXT, -- Причина потери сделки
  assigned_to INTEGER, -- user_id (может быть null, если не назначен)
  created_by INTEGER, -- user_id who created the deal
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  moved_at TIMESTAMP, -- When deal was last moved to another stage
  closed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deals_funnel_id ON deals(funnel_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage_id ON deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_assigned_to ON deals(assigned_to);
CREATE INDEX IF NOT EXISTS idx_deals_is_won ON deals(is_won);
CREATE INDEX IF NOT EXISTS idx_deals_is_lost ON deals(is_lost);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at DESC);

-- Deal activities (активности по сделке - звонки, встречи, задачи и т.д.)
CREATE TABLE IF NOT EXISTS deal_activities (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'call', 'meeting', 'email', 'task', 'note'
  subject VARCHAR(500),
  description TEXT,
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deal_activities_deal_id ON deal_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_activities_due_date ON deal_activities(due_date);

-- Tasks (задачи, как в Platrum)
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'new', -- 'new', 'in_progress', 'completed', 'cancelled'
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  assigned_to INTEGER, -- user_id
  created_by INTEGER,
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL, -- Привязка к сделке (опционально)
  tags TEXT[], -- Массив тегов
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_deal_id ON tasks(deal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_is_archived ON tasks(is_archived);

-- Task comments (комментарии к задачам)
CREATE TABLE IF NOT EXISTS task_comments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);

-- Default sales funnel
INSERT INTO sales_funnels (name, description, is_active, sort_order) VALUES
  ('Основная воронка продаж', 'Стандартная воронка продаж для работы с клиентами', true, 1)
ON CONFLICT DO NOTHING;

-- Default stages for the main funnel
DO $$
DECLARE
  funnel_id_val INTEGER;
BEGIN
  SELECT id INTO funnel_id_val FROM sales_funnels WHERE name = 'Основная воронка продаж' LIMIT 1;
  
  IF funnel_id_val IS NOT NULL THEN
    INSERT INTO funnel_stages (funnel_id, name, color, sort_order, probability) VALUES
      (funnel_id_val, 'Новая заявка', '#f44336', 1, 10),
      (funnel_id_val, 'Первичный контакт', '#ff9800', 2, 20),
      (funnel_id_val, 'Переговоры', '#2196f3', 3, 40),
      (funnel_id_val, 'Коммерческое предложение', '#9c27b0', 4, 60),
      (funnel_id_val, 'Согласование', '#00bcd4', 5, 80),
      (funnel_id_val, 'Заключение договора', '#4caf50', 6, 95),
      (funnel_id_val, 'Закрыто', '#607d8b', 7, 100)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;



