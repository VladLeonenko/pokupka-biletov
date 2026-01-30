-- Добавить client_id в deals для связи с клиентами
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deals' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE deals
    ADD COLUMN client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_deals_client_id ON deals(client_id);
  END IF;
END $$;

-- Добавить client_id в sales_funnels для связи воронки с клиентом
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales_funnels' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE sales_funnels
    ADD COLUMN client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_sales_funnels_client_id ON sales_funnels(client_id);
  END IF;
END $$;

-- Обновить существующие сделки: если есть client_projects с deal_id, связать deal с client_id из проекта
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN 
    SELECT DISTINCT d.id AS deal_id, p.client_id
    FROM deals d
    JOIN client_projects p ON p.deal_id = d.id
    WHERE d.client_id IS NULL AND p.client_id IS NOT NULL
  LOOP
    UPDATE deals SET client_id = rec.client_id WHERE id = rec.deal_id;
  END LOOP;
END $$;

