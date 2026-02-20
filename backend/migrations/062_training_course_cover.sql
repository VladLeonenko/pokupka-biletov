-- Обложка курса обучения
ALTER TABLE training_courses ADD COLUMN IF NOT EXISTS cover_image_url TEXT DEFAULT NULL;
COMMENT ON COLUMN training_courses.cover_image_url IS 'URL изображения обложки курса (например /uploads/images/...)';
