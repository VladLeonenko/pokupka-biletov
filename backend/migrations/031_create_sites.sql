-- Таблица для управления несколькими сайтами
CREATE TABLE IF NOT EXISTS sites (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'main', 'blog', 'enterprise', 'landing'
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'active', 'inactive', 'maintenance'
    template VARCHAR(100) DEFAULT 'default', -- Название шаблона
    settings JSONB DEFAULT '{}', -- Настройки сайта (цвета, лого, контакты и тд)
    seo_settings JSONB DEFAULT '{}', -- SEO настройки
    is_primary BOOLEAN DEFAULT FALSE, -- Главный сайт
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sites_domain ON sites(domain);
CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status);
CREATE INDEX IF NOT EXISTS idx_sites_type ON sites(type);

-- Таблица для страниц сайтов
CREATE TABLE IF NOT EXISTS site_pages (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
    slug VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    content JSONB DEFAULT '{}', -- Структурированный контент страницы
    meta_title VARCHAR(255),
    meta_description TEXT,
    og_image VARCHAR(500),
    template VARCHAR(100) DEFAULT 'default',
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    UNIQUE(site_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_site_pages_site_id ON site_pages(site_id);
CREATE INDEX IF NOT EXISTS idx_site_pages_slug ON site_pages(slug);
CREATE INDEX IF NOT EXISTS idx_site_pages_published ON site_pages(is_published);

-- Таблица для блоков контента (переиспользуемые блоки)
CREATE TABLE IF NOT EXISTS site_blocks (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- 'hero', 'calculator', 'tariffs', 'testimonials', 'faq', 'cta', etc.
    content JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_blocks_site_id ON site_blocks(site_id);
CREATE INDEX IF NOT EXISTS idx_site_blocks_type ON site_blocks(type);
CREATE INDEX IF NOT EXISTS idx_site_blocks_active ON site_blocks(is_active);

-- Таблица для связи блоков со страницами
CREATE TABLE IF NOT EXISTS site_page_blocks (
    id SERIAL PRIMARY KEY,
    page_id INTEGER REFERENCES site_pages(id) ON DELETE CASCADE,
    block_id INTEGER REFERENCES site_blocks(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    settings_override JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_site_page_blocks_page_id ON site_page_blocks(page_id);
CREATE INDEX IF NOT EXISTS idx_site_page_blocks_block_id ON site_page_blocks(block_id);

-- Таблица для форм и лидов с разных сайтов
CREATE TABLE IF NOT EXISTS site_leads (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
    page_id INTEGER REFERENCES site_pages(id) ON DELETE SET NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    message TEXT,
    form_data JSONB DEFAULT '{}', -- Дополнительные поля формы
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_content VARCHAR(255),
    utm_term VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(50) DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'converted', 'rejected'
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_leads_site_id ON site_leads(site_id);
CREATE INDEX IF NOT EXISTS idx_site_leads_status ON site_leads(status);
CREATE INDEX IF NOT EXISTS idx_site_leads_created_at ON site_leads(created_at);
CREATE INDEX IF NOT EXISTS idx_site_leads_email ON site_leads(email);

-- Добавляем главный сайт по умолчанию
INSERT INTO sites (domain, name, type, status, is_primary, settings) 
VALUES (
    'localhost:5173',
    'Primecoder - Главный сайт',
    'main',
    'active',
    TRUE,
    '{"brand": "Primecoder", "colors": {"primary": "#667eea", "secondary": "#764ba2"}}'
) ON CONFLICT (domain) DO NOTHING;

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_sites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автоматического обновления updated_at
DROP TRIGGER IF EXISTS sites_update_timestamp ON sites;
CREATE TRIGGER sites_update_timestamp
    BEFORE UPDATE ON sites
    FOR EACH ROW
    EXECUTE FUNCTION update_sites_updated_at();

DROP TRIGGER IF EXISTS site_pages_update_timestamp ON site_pages;
CREATE TRIGGER site_pages_update_timestamp
    BEFORE UPDATE ON site_pages
    FOR EACH ROW
    EXECUTE FUNCTION update_sites_updated_at();

DROP TRIGGER IF EXISTS site_blocks_update_timestamp ON site_blocks;
CREATE TRIGGER site_blocks_update_timestamp
    BEFORE UPDATE ON site_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_sites_updated_at();

DROP TRIGGER IF EXISTS site_leads_update_timestamp ON site_leads;
CREATE TRIGGER site_leads_update_timestamp
    BEFORE UPDATE ON site_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_sites_updated_at();

