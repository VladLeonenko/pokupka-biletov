-- Академия продаж: материалы обучения, планы менеджеров, метрики
-- Best practices 2025-2026: Pipeline Velocity, Activity, Conversion, Forecast

-- Материалы обучения (скрипты звонков, возражения, гайды)
CREATE TABLE IF NOT EXISTS sales_training_materials (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('call_script', 'objection', 'admin_guide', 'sales_tip')),
  title TEXT NOT NULL,
  content TEXT,
  objection_text TEXT,
  solution_text TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_training_type ON sales_training_materials(type);

-- Планы менеджеров на месяц (руководитель устанавливает)
CREATE TABLE IF NOT EXISTS manager_plans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  plan_calls INTEGER DEFAULT 0,
  plan_sales_rub INTEGER DEFAULT 0,
  plan_deals INTEGER DEFAULT 0,
  plan_new_clients INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);
CREATE INDEX IF NOT EXISTS idx_manager_plans_user_month ON manager_plans(user_id, month);

-- Шкала адаптации менеджера
CREATE TABLE IF NOT EXISTS manager_adaptation (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  completed_steps JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Сиды материалов (идемпотентно по title+type)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sales_training_materials WHERE type = 'call_script' AND title = 'Холодный звонок — вступление') THEN
    INSERT INTO sales_training_materials (type, title, content, sort_order) VALUES
      ('call_script', 'Холодный звонок — вступление', E'1. Представьтесь\n2. Уточните время: «У вас есть 2 минуты?»\n3. Ценностное предложение', 10),
      ('call_script', 'Звонок по заявке с сайта', E'1. Благодарность\n2. Уточните задачу\n3. Предложите созвон', 20),
      ('admin_guide', 'Как пользоваться воронками', E'Создавайте сделки, перемещайте по этапам, назначайте задачи.', 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM sales_training_materials WHERE type = 'objection' AND title = 'Дорого') THEN
    INSERT INTO sales_training_materials (type, title, objection_text, solution_text, sort_order) VALUES
      ('objection', 'Дорого', 'У вас дорого', E'• «Какой бюджет вы закладывали?»\n• «Давайте посчитаем ROI»', 100),
      ('objection', 'Подумаю', 'Мне нужно подумать', E'• «Что именно хотите обдумать?»\n• «Когда удобно созвониться?»', 110),
      ('objection', 'Нет бюджета', 'Сейчас нет денег', E'• «На какой квартал запланируем?»\n• «Есть рассрочка»', 120),
      ('objection', 'Уже есть подрядчик', 'Работаем с другой компанией', E'• «Когда заканчивается контракт?»\n• «Могу прислать кейсы»', 130),
      ('objection', 'Нет времени', 'Нет времени заниматься', E'• «Мы можем взять всё на себя»\n• «15 минут созвона»', 140),
      ('objection', 'Отправьте КП', 'Просто отправьте КП', E'• «Чтобы КП было точным — 3 вопроса»\n• «Созвон 10 минут»', 150);
  END IF;
END $$;
