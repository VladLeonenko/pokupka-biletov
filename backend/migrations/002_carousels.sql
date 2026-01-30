CREATE TABLE IF NOT EXISTS carousels (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carousel_slides (
  id SERIAL PRIMARY KEY,
  carousel_id INTEGER NOT NULL REFERENCES carousels(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'image', -- 'image' | 'text'
  image_url TEXT,
  caption_html TEXT,
  width INTEGER,
  height INTEGER,
  link_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carousel_slides_carousel ON carousel_slides(carousel_id);



