-- Migration: Create carousels table
-- Created: 2025-01-02

CREATE TABLE IF NOT EXISTS carousels (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'horizontal', -- horizontal, vertical, filter
    settings JSONB DEFAULT '{}'::jsonb,
    items JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Добавляем недостающие колонки, если таблица уже существует
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'carousels') THEN
        -- Добавляем колонки по одной
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'carousels' AND column_name = 'slug'
        ) THEN
            ALTER TABLE carousels ADD COLUMN slug VARCHAR(255) UNIQUE;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'carousels' AND column_name = 'name'
        ) THEN
            ALTER TABLE carousels ADD COLUMN name VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'carousels' AND column_name = 'type'
        ) THEN
            ALTER TABLE carousels ADD COLUMN type VARCHAR(50) DEFAULT 'horizontal';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'carousels' AND column_name = 'settings'
        ) THEN
            ALTER TABLE carousels ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'carousels' AND column_name = 'items'
        ) THEN
            ALTER TABLE carousels ADD COLUMN items JSONB DEFAULT '[]'::jsonb;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'carousels' AND column_name = 'is_active'
        ) THEN
            ALTER TABLE carousels ADD COLUMN is_active BOOLEAN DEFAULT true;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'carousels' AND column_name = 'created_at'
        ) THEN
            ALTER TABLE carousels ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'carousels' AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE carousels ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_carousels_slug ON carousels(slug);

-- Создаем индекс на is_active только если колонка существует
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'carousels' AND column_name = 'is_active'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_carousels_active ON carousels(is_active);
    END IF;
END $$;

COMMENT ON TABLE carousels IS 'Stores carousel configurations and items';
COMMENT ON COLUMN carousels.slug IS 'Unique identifier for carousel (e.g., blog-filters, team-carousel)';
COMMENT ON COLUMN carousels.name IS 'Display name for admin panel';
COMMENT ON COLUMN carousels.type IS 'Type of carousel: horizontal, vertical, filter';
COMMENT ON COLUMN carousels.settings IS 'JSON object with carousel settings (autoplay, speed, items, responsive, etc.)';
COMMENT ON COLUMN carousels.items IS 'JSON array of carousel items (images, text, links, etc.)';



