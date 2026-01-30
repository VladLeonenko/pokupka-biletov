-- Таблица для хранения изображений упражнений, книг, блюд и т.д.
CREATE TABLE IF NOT EXISTS exercise_images (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL, -- Название упражнения/книги/блюда
    category VARCHAR(50) NOT NULL, -- 'workout', 'book', 'meal', 'course', 'finance_tip'
    image_url TEXT NOT NULL, -- URL изображения
    source VARCHAR(50) DEFAULT 'unsplash', -- 'unsplash', 'upload', 'manual'
    unsplash_id VARCHAR(100), -- ID изображения из Unsplash (если используется)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (name, category)
);

CREATE INDEX IF NOT EXISTS idx_exercise_images_category ON exercise_images(category);
CREATE INDEX IF NOT EXISTS idx_exercise_images_name ON exercise_images(name);

-- Функция для автоматического обновления updated_at (если еще не существует)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_exercise_images_updated_at ON exercise_images;
CREATE TRIGGER update_exercise_images_updated_at
  BEFORE UPDATE ON exercise_images
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

