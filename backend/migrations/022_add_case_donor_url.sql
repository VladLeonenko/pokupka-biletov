-- Добавляем поле для ссылки на сайт-донор для кейсов портфолио
ALTER TABLE cases ADD COLUMN IF NOT EXISTS donor_url TEXT DEFAULT NULL;

