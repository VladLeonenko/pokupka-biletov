-- Add template_type field to cases table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cases' AND column_name='template_type') THEN
    ALTER TABLE cases ADD COLUMN template_type VARCHAR(50) DEFAULT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cases' AND column_name='is_template') THEN
    ALTER TABLE cases ADD COLUMN is_template BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create index for template lookups
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cases_template_type') THEN
    CREATE INDEX idx_cases_template_type ON cases(template_type);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cases_is_template') THEN
    CREATE INDEX idx_cases_is_template ON cases(is_template);
  END IF;
END $$;

