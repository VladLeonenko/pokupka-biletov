-- Добавляем категорию задач в таблицу tasks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'category'
  ) THEN
    ALTER TABLE tasks ADD COLUMN category VARCHAR(50) DEFAULT 'development';
  END IF;
END $$;

-- Создаем индекс для быстрого поиска по категориям
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);

-- Комментарий к колонке
COMMENT ON COLUMN tasks.category IS 'Категория задачи: development, marketing, business, operations, support, other';

