-- Добавляем поле category в таблицу cases для фильтрации в портфолио
ALTER TABLE cases ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT NULL;

-- Создаем индекс для быстрой фильтрации
CREATE INDEX IF NOT EXISTS idx_cases_category ON cases(category) WHERE category IS NOT NULL;

-- Комментарий к колонке
COMMENT ON COLUMN cases.category IS 'Категория кейса: website (сайт), mobile (приложение), ai (AI Boost Team), seo (SEO продвижение), advertising (реклама), design (дизайн). Используется для фильтрации на странице портфолио.';








