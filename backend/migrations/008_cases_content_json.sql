ALTER TABLE cases ADD COLUMN IF NOT EXISTS content_json JSONB DEFAULT '{}'::jsonb;



