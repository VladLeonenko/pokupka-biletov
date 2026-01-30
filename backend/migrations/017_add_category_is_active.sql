-- Добавляем колонку is_active в product_categories
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'product_categories') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_attribute 
      WHERE attrelid = 'product_categories'::regclass 
      AND attname = 'is_active' 
      AND attnum > 0
    ) THEN
      ALTER TABLE product_categories ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
      
      -- Обновляем существующие записи только если колонка существует
      -- UPDATE будет выполнен после создания колонки автоматически через DEFAULT
    END IF;
    
    -- Создаем индекс на is_active
    BEGIN
      CREATE INDEX IF NOT EXISTS idx_product_categories_active ON product_categories(is_active);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END $$;

