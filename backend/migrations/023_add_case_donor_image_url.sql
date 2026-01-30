-- Добавляем поле для изображения с сайта-донора для кейсов портфолио
ALTER TABLE cases ADD COLUMN IF NOT EXISTS donor_image_url TEXT DEFAULT NULL;

