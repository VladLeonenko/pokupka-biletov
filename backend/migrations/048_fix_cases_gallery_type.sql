-- Исправляем тип колонок gallery и tools в таблице cases на jsonb
-- gallery должна быть JSONB (создана как JSONB в миграции 005, но могла измениться)
-- tools создана как TEXT[], но для консистентности лучше использовать JSONB

DO $$
BEGIN
  -- Исправляем gallery
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cases' AND column_name = 'gallery'
  ) THEN
    -- Если тип text[] или другой массив, преобразуем в jsonb
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'cases' 
      AND column_name = 'gallery' 
      AND data_type = 'ARRAY'
    ) THEN
      ALTER TABLE cases 
        ALTER COLUMN gallery TYPE jsonb 
        USING CASE 
          WHEN gallery IS NULL THEN NULL::jsonb
          WHEN array_length(gallery, 1) IS NULL THEN '[]'::jsonb
          ELSE to_jsonb(gallery)::jsonb
        END;
      
      RAISE NOTICE 'Column gallery converted from array to jsonb';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'cases' 
      AND column_name = 'gallery' 
      AND udt_name != 'jsonb'
    ) THEN
      ALTER TABLE cases 
        ALTER COLUMN gallery TYPE jsonb 
        USING gallery::jsonb;
      
      RAISE NOTICE 'Column gallery converted to jsonb';
    END IF;
  END IF;

  -- Исправляем tools (должен быть text[], но меняем на jsonb для консистентности)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cases' AND column_name = 'tools'
  ) THEN
    -- Если тип text[] или другой массив, преобразуем в jsonb
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'cases' 
      AND column_name = 'tools' 
      AND data_type = 'ARRAY'
    ) THEN
      ALTER TABLE cases 
        ALTER COLUMN tools TYPE jsonb 
        USING CASE 
          WHEN tools IS NULL THEN NULL::jsonb
          WHEN array_length(tools, 1) IS NULL THEN '[]'::jsonb
          ELSE to_jsonb(tools)::jsonb
        END;
      
      RAISE NOTICE 'Column tools converted from text[] to jsonb';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'cases' 
      AND column_name = 'tools' 
      AND udt_name != 'jsonb'
    ) THEN
      ALTER TABLE cases 
        ALTER COLUMN tools TYPE jsonb 
        USING tools::jsonb;
      
      RAISE NOTICE 'Column tools converted to jsonb';
    END IF;
  END IF;
END $$;
