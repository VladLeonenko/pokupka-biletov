-- Отдельное превью для списка /portfolio (если NULL — берётся hero_image_url)
ALTER TABLE cases ADD COLUMN IF NOT EXISTS listing_preview_image_url TEXT DEFAULT NULL;

COMMENT ON COLUMN cases.listing_preview_image_url IS 'Обложка в карусели /portfolio; если NULL — hero_image_url';
