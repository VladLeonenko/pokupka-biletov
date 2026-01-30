-- Add content_json field to products table for structured content (like /ads template)
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_json JSONB DEFAULT NULL;

-- Add index for content_json queries if needed
CREATE INDEX IF NOT EXISTS idx_products_content_json ON products USING GIN (content_json);



