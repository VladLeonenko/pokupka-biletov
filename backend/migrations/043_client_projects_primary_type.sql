-- Add primary_type to client_projects for project type classification

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_projects' AND column_name = 'primary_type'
  ) THEN
    ALTER TABLE client_projects
      ADD COLUMN primary_type VARCHAR(32);
  END IF;
END $$;

-- Optional index to filter by primary_type if needed later
CREATE INDEX IF NOT EXISTS idx_client_projects_primary_type
  ON client_projects(primary_type);
