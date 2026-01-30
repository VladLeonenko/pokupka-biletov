-- Комментарии к проектам клиентов
CREATE TABLE IF NOT EXISTS client_project_comments (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  stage_id INTEGER REFERENCES client_project_stages(id) ON DELETE CASCADE,
  task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  comment TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL, -- null для комментариев от клиента
  created_by_client BOOLEAN DEFAULT FALSE, -- true если комментарий от клиента
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE, -- для комментариев от клиента
  is_internal BOOLEAN DEFAULT FALSE, -- внутренний комментарий (только для PM/команды)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_comments_project ON client_project_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_stage ON client_project_comments(stage_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_task ON client_project_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_client ON client_project_comments(client_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_created_at ON client_project_comments(created_at DESC);

-- Обновление updated_at
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_project_comments_updated_at ON client_project_comments;
    CREATE TRIGGER update_project_comments_updated_at
      BEFORE UPDATE ON client_project_comments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


