-- Делаем FK constraints для products.slug DEFERRABLE
-- Это позволит обновлять slug продуктов без ошибок FK

-- Удаляем старые constraints
ALTER TABLE product_analytics 
  DROP CONSTRAINT IF EXISTS product_analytics_product_slug_fkey;

ALTER TABLE product_cases 
  DROP CONSTRAINT IF EXISTS product_cases_product_slug_fkey;

ALTER TABLE cart 
  DROP CONSTRAINT IF EXISTS cart_product_slug_fkey;

ALTER TABLE wishlist 
  DROP CONSTRAINT IF EXISTS wishlist_product_slug_fkey;

-- Создаем новые DEFERRABLE constraints
ALTER TABLE product_analytics 
  ADD CONSTRAINT product_analytics_product_slug_fkey 
  FOREIGN KEY (product_slug) 
  REFERENCES products(slug) 
  ON DELETE CASCADE 
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE product_cases 
  ADD CONSTRAINT product_cases_product_slug_fkey 
  FOREIGN KEY (product_slug) 
  REFERENCES products(slug) 
  ON DELETE CASCADE 
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE cart 
  ADD CONSTRAINT cart_product_slug_fkey 
  FOREIGN KEY (product_slug) 
  REFERENCES products(slug) 
  ON DELETE CASCADE 
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE wishlist 
  ADD CONSTRAINT wishlist_product_slug_fkey 
  FOREIGN KEY (product_slug) 
  REFERENCES products(slug) 
  ON DELETE CASCADE 
  DEFERRABLE INITIALLY IMMEDIATE;


