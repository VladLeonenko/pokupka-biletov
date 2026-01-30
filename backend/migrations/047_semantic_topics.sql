-- Создание таблицы для сохранения тем семантического ядра
CREATE TABLE IF NOT EXISTS semantic_topics (
  id SERIAL PRIMARY KEY,
  topic TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_semantic_topics_topic ON semantic_topics(topic);

-- Вставляем темы по умолчанию, если их еще нет
INSERT INTO semantic_topics (topic) VALUES 
  ('бизнес запросы'),
  ('маркетинг'),
  ('разработка'),
  ('новости it'),
  ('инструменты для селлеров'),
  ('веб-дизайн'),
  ('новости и фишки современного веб дизайна')
ON CONFLICT (topic) DO NOTHING;
