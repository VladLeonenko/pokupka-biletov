-- Client projects and stages for project-based services (result-based mode)

CREATE TABLE IF NOT EXISTS client_projects (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  mode VARCHAR(32) NOT NULL DEFAULT 'RESULT_BASED', -- RESULT_BASED / TASK_BASED
  status VARCHAR(32) NOT NULL DEFAULT 'active',     -- active, paused, completed, cancelled
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  budget_total_cents BIGINT,
  budget_used_cents BIGINT,
  deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_projects_client ON client_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_user ON client_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_status ON client_projects(status);

CREATE TABLE IF NOT EXISTS client_project_stages (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',   -- pending, in_progress, done
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  planned_hours INTEGER,
  spent_hours INTEGER,
  budget_planned_cents BIGINT,
  budget_spent_cents BIGINT,
  upsell_potential_cents BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_project_stages_project ON client_project_stages(project_id);
CREATE INDEX IF NOT EXISTS idx_client_project_stages_status ON client_project_stages(status);

CREATE TABLE IF NOT EXISTS client_project_change_requests (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  stage_id INTEGER REFERENCES client_project_stages(id) ON DELETE SET NULL,
  change_type VARCHAR(32),              -- design, frontend, backend, content, other
  description TEXT,
  priority VARCHAR(16) NOT NULL DEFAULT 'medium', -- low, medium, high
  status VARCHAR(32) NOT NULL DEFAULT 'pending',  -- pending, proposed, approved, rejected, cancelled
  estimated_hours INTEGER,
  estimated_price_cents BIGINT,
  client_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_project_change_requests_project ON client_project_change_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_client_project_change_requests_stage ON client_project_change_requests(stage_id);
CREATE INDEX IF NOT EXISTS idx_client_project_change_requests_status ON client_project_change_requests(status);

CREATE TABLE IF NOT EXISTS client_project_upsell_offers (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  stage_id INTEGER REFERENCES client_project_stages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  specialist_type VARCHAR(32) NOT NULL, -- designer, frontend, backend, mobile, pm, qa
  complexity VARCHAR(16) NOT NULL,      -- simple, medium, complex
  urgency VARCHAR(16) NOT NULL,         -- standard, fast, urgent
  integrations_count INTEGER NOT NULL DEFAULT 0,
  hours INTEGER NOT NULL,
  rate_per_hour_cents BIGINT NOT NULL,
  price_cents BIGINT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'suggested', -- suggested, accepted, declined, expired
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_project_upsell_offers_project ON client_project_upsell_offers(project_id);
CREATE INDEX IF NOT EXISTS idx_client_project_upsell_offers_stage ON client_project_upsell_offers(stage_id);
CREATE INDEX IF NOT EXISTS idx_client_project_upsell_offers_status ON client_project_upsell_offers(status);

-- Reuse common updated_at trigger if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_client_projects_updated_at ON client_projects;
    CREATE TRIGGER update_client_projects_updated_at
      BEFORE UPDATE ON client_projects
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_client_project_stages_updated_at ON client_project_stages;
    CREATE TRIGGER update_client_project_stages_updated_at
      BEFORE UPDATE ON client_project_stages
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_client_project_change_requests_updated_at ON client_project_change_requests;
    CREATE TRIGGER update_client_project_change_requests_updated_at
      BEFORE UPDATE ON client_project_change_requests
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_client_project_upsell_offers_updated_at ON client_project_upsell_offers;
    CREATE TRIGGER update_client_project_upsell_offers_updated_at
      BEFORE UPDATE ON client_project_upsell_offers
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;






