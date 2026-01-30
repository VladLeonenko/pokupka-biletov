-- Ensure tag tables/columns exist for AI tagging flow
CREATE TABLE IF NOT EXISTS blog_tags (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blog_post_tags (
  post_slug TEXT NOT NULL,
  tag_slug TEXT NOT NULL
);

-- Add missing columns if table already existed with different shape
ALTER TABLE blog_post_tags ADD COLUMN IF NOT EXISTS post_slug TEXT;
ALTER TABLE blog_post_tags ADD COLUMN IF NOT EXISTS tag_slug TEXT;

-- Ensure uniqueness and lookup indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ux_blog_post_tags_post_tag'
  ) THEN
    CREATE UNIQUE INDEX ux_blog_post_tags_post_tag ON blog_post_tags(post_slug, tag_slug);
  END IF;
END$$;




