-- Таблица связи товаров и категорий (many-to-many)
CREATE TABLE IF NOT EXISTS product_category_links (
  product_slug TEXT NOT NULL REFERENCES products(slug) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_slug, category_id)
);

CREATE INDEX IF NOT EXISTS idx_product_category_links_product ON product_category_links(product_slug);
CREATE INDEX IF NOT EXISTS idx_product_category_links_category ON product_category_links(category_id);

-- Миграция: копируем существующие category_id в product_category_links
INSERT INTO product_category_links (product_slug, category_id)
SELECT slug, category_id FROM products WHERE category_id IS NOT NULL
ON CONFLICT (product_slug, category_id) DO NOTHING;
