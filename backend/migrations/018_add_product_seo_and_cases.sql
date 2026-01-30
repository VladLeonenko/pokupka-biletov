-- Добавляем поля для SEO и примеров работ к товарам
DO $$
BEGIN
  -- SEO метаданные
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'meta_title'
  ) THEN
    ALTER TABLE products ADD COLUMN meta_title TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'meta_description'
  ) THEN
    ALTER TABLE products ADD COLUMN meta_description TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'meta_keywords'
  ) THEN
    ALTER TABLE products ADD COLUMN meta_keywords TEXT;
  END IF;
  
  -- Поле для примеров работ (JSON массив slug кейсов)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'case_slugs'
  ) THEN
    ALTER TABLE products ADD COLUMN case_slugs TEXT[];
  END IF;
  
  -- Поле для краткого описания (анонс)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'summary'
  ) THEN
    ALTER TABLE products ADD COLUMN summary TEXT;
  END IF;
  
  -- Поле для расширенного описания
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'full_description_html'
  ) THEN
    ALTER TABLE products ADD COLUMN full_description_html TEXT;
  END IF;
END $$;

