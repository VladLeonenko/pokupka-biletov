-- Расширение таблицы users для OAuth и телефона
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS oauth_provider TEXT,
  ADD COLUMN IF NOT EXISTS oauth_id TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verification_code TEXT,
  ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON users(phone) WHERE phone IS NOT NULL;

-- Категории продуктов - создаем или обновляем безопасно
DO $$
BEGIN
  -- Создаем таблицу, если не существует
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_categories') THEN
    CREATE TABLE product_categories (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      parent_id INTEGER,
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
    );
    
    ALTER TABLE product_categories
      ADD CONSTRAINT product_categories_parent_id_fkey 
      FOREIGN KEY (parent_id) REFERENCES product_categories(id) ON DELETE SET NULL;
  ELSE
    -- Добавляем колонки по одной с проверкой
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_categories' AND column_name = 'description') THEN
      ALTER TABLE product_categories ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_categories' AND column_name = 'parent_id') THEN
      ALTER TABLE product_categories ADD COLUMN parent_id INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_categories' AND column_name = 'sort_order') THEN
      ALTER TABLE product_categories ADD COLUMN sort_order INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_categories' AND column_name = 'is_active') THEN
      ALTER TABLE product_categories ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_categories' AND column_name = 'created_at') THEN
      ALTER TABLE product_categories ADD COLUMN created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_categories' AND column_name = 'updated_at') THEN
      ALTER TABLE product_categories ADD COLUMN updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Внешний ключ
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'product_categories_parent_id_fkey') THEN
      ALTER TABLE product_categories
        ADD CONSTRAINT product_categories_parent_id_fkey 
        FOREIGN KEY (parent_id) REFERENCES product_categories(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Индексы для product_categories
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_categories') THEN
    CREATE INDEX IF NOT EXISTS idx_product_categories_slug ON product_categories(slug);
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_categories' AND column_name = 'parent_id') THEN
      CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON product_categories(parent_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_categories' AND column_name = 'is_active') THEN
      CREATE INDEX IF NOT EXISTS idx_product_categories_active ON product_categories(is_active);
    END IF;
  END IF;
END $$;

-- Добавляем категории к продуктам
DO $$
BEGIN
  ALTER TABLE products 
    ADD COLUMN IF NOT EXISTS category_id INTEGER,
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS gallery TEXT[],
    ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sku TEXT,
    ADD COLUMN IF NOT EXISTS tags TEXT[];
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_categories') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'products_category_id_fkey') THEN
      ALTER TABLE products
        ADD CONSTRAINT products_category_id_fkey 
        FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL;
    END IF;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category_id') THEN
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'sku') THEN
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
  END IF;
END $$;

-- Корзина
CREATE TABLE IF NOT EXISTS cart (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT,
  product_slug TEXT NOT NULL REFERENCES products(slug) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_slug),
  UNIQUE(session_id, product_slug)
);

CREATE INDEX IF NOT EXISTS idx_cart_user ON cart(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_session ON cart(session_id);

-- Избранное
CREATE TABLE IF NOT EXISTS wishlist (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_slug TEXT NOT NULL REFERENCES products(slug) ON DELETE CASCADE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_slug)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id);

-- Заказы
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT,
  order_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RUB',
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  shipping_address JSONB,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Позиции заказа
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_slug TEXT NOT NULL,
  product_title TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- Аналитика продуктов
CREATE TABLE IF NOT EXISTS product_analytics (
  id SERIAL PRIMARY KEY,
  product_slug TEXT NOT NULL REFERENCES products(slug) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_analytics_product ON product_analytics(product_slug);
CREATE INDEX IF NOT EXISTS idx_product_analytics_event ON product_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_product_analytics_created ON product_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_product_analytics_user ON product_analytics(user_id);

-- Связь продуктов с кейсами
CREATE TABLE IF NOT EXISTS product_cases (
  product_slug TEXT NOT NULL REFERENCES products(slug) ON DELETE CASCADE,
  case_slug TEXT NOT NULL REFERENCES cases(slug) ON DELETE CASCADE,
  PRIMARY KEY (product_slug, case_slug)
);

CREATE INDEX IF NOT EXISTS idx_product_cases_product ON product_cases(product_slug);
CREATE INDEX IF NOT EXISTS idx_product_cases_case ON product_cases(case_slug);

