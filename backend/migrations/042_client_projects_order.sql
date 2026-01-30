-- Add order_id reference to client_projects for linkage with ecommerce orders

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_projects' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE client_projects
      ADD COLUMN order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Ensure we don't accidentally create duplicate projects per order
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_projects_order
  ON client_projects(order_id)
  WHERE order_id IS NOT NULL;






