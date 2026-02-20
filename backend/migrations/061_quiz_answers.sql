-- Ответы на вопросы тестов (включая открытые)
CREATE TABLE IF NOT EXISTS manager_quiz_answers (
  id SERIAL PRIMARY KEY,
  attempt_id INTEGER NOT NULL REFERENCES manager_quiz_attempts(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES sales_training_questions(id) ON DELETE SET NULL,
  question_index INTEGER NOT NULL,
  answer_index INTEGER,
  answer_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_attempt ON manager_quiz_answers(attempt_id);
