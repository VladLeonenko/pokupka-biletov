-- Commercial Proposals (КП) system for creating and managing presentation proposals

CREATE TABLE IF NOT EXISTS commercial_proposals (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  client_name TEXT,
  client_email TEXT,
  description TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'draft', -- draft, sent, viewed, accepted, rejected
  share_token VARCHAR(64) UNIQUE, -- Token for public sharing
  pdf_path TEXT, -- Path to generated PDF file
  settings JSONB DEFAULT '{}', -- Additional settings (theme colors, etc.)
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commercial_proposals_client ON commercial_proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_commercial_proposals_deal ON commercial_proposals(deal_id);
CREATE INDEX IF NOT EXISTS idx_commercial_proposals_user ON commercial_proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_commercial_proposals_status ON commercial_proposals(status);
CREATE INDEX IF NOT EXISTS idx_commercial_proposals_share_token ON commercial_proposals(share_token);

CREATE TABLE IF NOT EXISTS proposal_slides (
  id SERIAL PRIMARY KEY,
  proposal_id INTEGER NOT NULL REFERENCES commercial_proposals(id) ON DELETE CASCADE,
  slide_type VARCHAR(32) NOT NULL, -- hero, services, metrics, roadmap, guarantees, contacts, etc.
  sort_order INTEGER NOT NULL DEFAULT 0,
  content JSONB NOT NULL DEFAULT '{}', -- Slide content based on type
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_slides_proposal ON proposal_slides(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_slides_sort_order ON proposal_slides(proposal_id, sort_order);

-- Triggers for updated_at
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_commercial_proposals_updated_at ON commercial_proposals;
    CREATE TRIGGER update_commercial_proposals_updated_at
      BEFORE UPDATE ON commercial_proposals
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_proposal_slides_updated_at ON proposal_slides;
    CREATE TRIGGER update_proposal_slides_updated_at
      BEFORE UPDATE ON proposal_slides
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

