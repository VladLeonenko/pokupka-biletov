-- Тесты и прогресс обучения для геймификации

-- Вопросы к тестам (привязаны к типу материала или материалу)
CREATE TABLE IF NOT EXISTS sales_training_questions (
  id SERIAL PRIMARY KEY,
  material_id INTEGER REFERENCES sales_training_materials(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('call_script', 'objection', 'admin_guide', 'sales_tip', 'general')),
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',  -- ["Вариант A", "Вариант B", ...]
  correct_index INTEGER NOT NULL CHECK (correct_index >= 0),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_training_questions_type ON sales_training_questions(type);
CREATE INDEX IF NOT EXISTS idx_training_questions_material ON sales_training_questions(material_id);

-- Прогресс: менеджер отметил материал как прочитанный
CREATE TABLE IF NOT EXISTS manager_material_completions (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES sales_training_materials(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, material_id)
);

-- Результаты тестов
CREATE TABLE IF NOT EXISTS manager_quiz_attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL,
  score_percent INTEGER NOT NULL CHECK (score_percent >= 0 AND score_percent <= 100),
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON manager_quiz_attempts(user_id);

-- Примеры вопросов для теста по возражениям
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sales_training_questions WHERE type = 'objection' LIMIT 1) THEN
    INSERT INTO sales_training_questions (type, question_text, options, correct_index, sort_order) VALUES
      ('objection', 'Клиент говорит «У вас дорого». Ваш первый шаг:', '["Сразу предложить скидку", "Уточнить: «Какой бюджет вы закладывали?»", "Сравнять с конкурентами", "Завершить разговор"]', 1, 10),
      ('objection', '«Мне нужно подумать» — лучший ответ:', '["«Хорошо, перезвоните когда решите»", "«Что именно хотите обдумать?»", "«У нас акция только сегодня»", "«Тогда не тратьте наше время»"]', 1, 20),
      ('objection', '«Сейчас нет денег» — уместно:', '["«На какой квартал запланируем?»", "«Тогда до свидания»", "«Возьмите кредит»", "«Мы работаем бесплатно»"]', 0, 30);
  END IF;
END $$;
