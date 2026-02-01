-- Добавляем content_json для blog_posts
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS content_json JSONB DEFAULT NULL;

-- Добавляем content_json для pages
ALTER TABLE pages ADD COLUMN IF NOT EXISTS content_json JSONB DEFAULT NULL;

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_blog_posts_content_json ON blog_posts USING GIN (content_json);
CREATE INDEX IF NOT EXISTS idx_pages_content_json ON pages USING GIN (content_json);
