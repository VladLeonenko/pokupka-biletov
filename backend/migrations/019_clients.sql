-- Таблица клиентов
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  source TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'form', 'chatbot', 'phone', 'email', 'other'
  source_details TEXT, -- Дополнительная информация об источнике (например, название формы)
  status TEXT NOT NULL DEFAULT 'lead', -- 'lead', 'client', 'inactive', 'lost'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Кто создал запись (для ручных записей)
  
  -- Метрики (вычисляемые из заказов)
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_revenue_cents BIGINT NOT NULL DEFAULT 0, -- LTV в копейках
  average_order_value_cents INTEGER, -- Средний чек в копейках
  last_order_date TIMESTAMPTZ,
  first_order_date TIMESTAMPTZ
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_source ON clients(source);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at);

-- Таблица связи клиентов с заказами (для отслеживания покупок)
CREATE TABLE IF NOT EXISTS client_orders (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_client_orders_client ON client_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_client_orders_order ON client_orders(order_id);

-- Функция для обновления метрик клиента
CREATE OR REPLACE FUNCTION update_client_metrics(client_id_param INTEGER)
RETURNS void AS $$
DECLARE
  total_orders_count INTEGER;
  total_revenue BIGINT;
  avg_order_value INTEGER;
  last_order TIMESTAMPTZ;
  first_order TIMESTAMPTZ;
BEGIN
  -- Подсчитываем метрики из заказов
  SELECT 
    COUNT(DISTINCT o.id),
    COALESCE(SUM(o.total_cents), 0),
    COALESCE(AVG(o.total_cents), 0)::INTEGER,
    MAX(o.created_at),
    MIN(o.created_at)
  INTO 
    total_orders_count,
    total_revenue,
    avg_order_value,
    last_order,
    first_order
  FROM client_orders co
  JOIN orders o ON co.order_id = o.id
  WHERE co.client_id = client_id_param
    AND o.status != 'cancelled';
  
  -- Обновляем метрики клиента
  UPDATE clients
  SET 
    total_orders = COALESCE(total_orders_count, 0),
    total_revenue_cents = COALESCE(total_revenue, 0),
    average_order_value_cents = avg_order_value,
    last_order_date = last_order,
    first_order_date = first_order,
    updated_at = NOW()
  WHERE id = client_id_param;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления метрик при изменении заказов
CREATE OR REPLACE FUNCTION trigger_update_client_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM update_client_metrics(NEW.client_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_client_metrics(OLD.client_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'client_orders_update_metrics'
  ) THEN
    CREATE TRIGGER client_orders_update_metrics
    AFTER INSERT OR UPDATE OR DELETE ON client_orders
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_client_metrics();
  END IF;
END;
$$;

-- Комментарии к таблицам
COMMENT ON TABLE clients IS 'Таблица клиентов с метриками LTV, среднего чека и количества заказов';
COMMENT ON COLUMN clients.source IS 'Источник клиента: manual (вручную), form (форма), chatbot (чат-бот), phone (телефон), email (email), other (другое)';
COMMENT ON COLUMN clients.status IS 'Статус: lead (лид), client (клиент), inactive (неактивный), lost (потерян)';
COMMENT ON COLUMN clients.total_revenue_cents IS 'LTV (Lifetime Value) - общая выручка от клиента в копейках';
COMMENT ON COLUMN clients.average_order_value_cents IS 'Средний чек в копейках';

