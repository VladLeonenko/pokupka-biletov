-- Forms management tables
CREATE TABLE IF NOT EXISTS forms (
  id SERIAL PRIMARY KEY,
  form_id VARCHAR(255) UNIQUE NOT NULL, -- e.g., 'contact-form', 'quiz-form'
  form_name VARCHAR(255) NOT NULL, -- Human-readable name
  page_path VARCHAR(500), -- Which page this form appears on
  fields JSONB DEFAULT '[]'::jsonb, -- Array of field definitions
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS form_submissions (
  id SERIAL PRIMARY KEY,
  form_id VARCHAR(255) NOT NULL REFERENCES forms(form_id) ON DELETE CASCADE,
  form_data JSONB NOT NULL, -- All submitted field values
  status VARCHAR(50) DEFAULT 'new', -- new, read, replied, archived
  ip_address VARCHAR(45),
  user_agent TEXT,
  referrer TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP,
  replied_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS form_abandonments (
  id SERIAL PRIMARY KEY,
  form_id VARCHAR(255) NOT NULL REFERENCES forms(form_id) ON DELETE CASCADE,
  form_data JSONB NOT NULL, -- Partial data from abandoned form
  started_at TIMESTAMP NOT NULL,
  abandoned_at TIMESTAMP NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  referrer TEXT
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_at ON form_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_abandonments_form_id ON form_abandonments(form_id);
CREATE INDEX IF NOT EXISTS idx_form_abandonments_abandoned_at ON form_abandonments(abandoned_at DESC);

-- Insert known forms from the site
INSERT INTO forms (form_id, form_name, page_path, fields) VALUES
  ('contact-form', 'Форма обратной связи', '/contacts', '[
    {"name": "name", "label": "Имя", "type": "text", "required": true},
    {"name": "tel", "label": "Телефон", "type": "tel", "required": true},
    {"name": "email", "label": "Email", "type": "email", "required": true},
    {"name": "question", "label": "Ваш вопрос", "type": "textarea", "required": false}
  ]'::jsonb)
ON CONFLICT (form_id) DO NOTHING;



