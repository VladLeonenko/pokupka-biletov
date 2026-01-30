-- Таблица для отслеживания прочитанных книг и оценок
CREATE TABLE IF NOT EXISTS user_reading_books (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    book_title VARCHAR(500) NOT NULL,
    book_author VARCHAR(255),
    book_genre VARCHAR(100),
    is_read BOOLEAN DEFAULT FALSE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- Оценка от 1 до 5
    read_date DATE, -- Дата прочтения
    notes TEXT, -- Заметки о книге
    replaced BOOLEAN DEFAULT FALSE, -- Заменена ли книга
    replaced_with VARCHAR(500), -- На что заменена
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, book_title, book_author)
);

CREATE INDEX IF NOT EXISTS idx_user_reading_books_user_id ON user_reading_books(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reading_books_is_read ON user_reading_books(is_read);
CREATE INDEX IF NOT EXISTS idx_user_reading_books_replaced ON user_reading_books(replaced);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_user_reading_books_updated_at ON user_reading_books;
CREATE TRIGGER update_user_reading_books_updated_at
  BEFORE UPDATE ON user_reading_books
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


