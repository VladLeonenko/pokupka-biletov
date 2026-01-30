ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS carousel_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS carousel_title TEXT,
  ADD COLUMN IF NOT EXISTS carousel_items JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Ensure carousel_items defaults to empty array for existing records
UPDATE blog_posts
SET carousel_items = '[]'::jsonb
WHERE carousel_items IS NULL;

