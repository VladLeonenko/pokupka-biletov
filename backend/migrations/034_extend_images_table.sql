-- Расширение таблицы images для хранения информации о загруженных файлах
ALTER TABLE images
  ADD COLUMN IF NOT EXISTS filename TEXT,
  ADD COLUMN IF NOT EXISTS size BIGINT,
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Индекс для быстрого поиска по URL
CREATE INDEX IF NOT EXISTS idx_images_url ON images(url) WHERE url IS NOT NULL;

-- Индекс для поиска по filename
CREATE INDEX IF NOT EXISTS idx_images_filename ON images(filename) WHERE filename IS NOT NULL;
