-- Добавляем SEO поля для кейсов
DO $$
BEGIN
  -- SEO заголовок
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cases' AND column_name = 'seo_title'
  ) THEN
    ALTER TABLE cases ADD COLUMN seo_title TEXT;
  END IF;
  
  -- SEO описание
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cases' AND column_name = 'seo_description'
  ) THEN
    ALTER TABLE cases ADD COLUMN seo_description TEXT;
  END IF;
  
  -- SEO ключевые слова
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cases' AND column_name = 'seo_keywords'
  ) THEN
    ALTER TABLE cases ADD COLUMN seo_keywords TEXT;
  END IF;
  
  -- OG изображение для соцсетей
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cases' AND column_name = 'og_image_url'
  ) THEN
    ALTER TABLE cases ADD COLUMN og_image_url TEXT;
  END IF;
END $$;
