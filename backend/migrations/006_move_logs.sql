CREATE TABLE IF NOT EXISTS page_move_log (
  id SERIAL PRIMARY KEY,
  from_slug TEXT NOT NULL,
  to_type TEXT NOT NULL, -- 'case' | 'product' | 'blog'
  to_slug TEXT NOT NULL,
  page_row JSONB NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_move_log_created ON page_move_log(created_at DESC);



