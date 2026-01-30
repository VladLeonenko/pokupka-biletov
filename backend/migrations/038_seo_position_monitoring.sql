-- Таблица для мониторинга позиций сайта
CREATE TABLE IF NOT EXISTS seo_position_monitoring (
  id SERIAL PRIMARY KEY,
  site_url TEXT NOT NULL,
  keyword TEXT NOT NULL,
  search_engine VARCHAR(50) NOT NULL DEFAULT 'google', -- google, yandex, bing
  current_position INTEGER, -- текущая позиция (NULL если не найдено)
  previous_position INTEGER, -- предыдущая позиция
  url TEXT, -- URL страницы, которая находится в поиске
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(site_url, keyword, search_engine, checked_at)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_seo_monitoring_site_keyword ON seo_position_monitoring(site_url, keyword);
CREATE INDEX IF NOT EXISTS idx_seo_monitoring_checked_at ON seo_position_monitoring(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_monitoring_search_engine ON seo_position_monitoring(search_engine);

-- Таблица для настроек мониторинга
CREATE TABLE IF NOT EXISTS seo_monitoring_settings (
  id SERIAL PRIMARY KEY,
  site_url TEXT NOT NULL,
  keyword TEXT NOT NULL,
  search_engine VARCHAR(50) NOT NULL DEFAULT 'google',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  check_frequency VARCHAR(50) NOT NULL DEFAULT 'daily', -- daily, weekly, monthly
  notify_on_change BOOLEAN NOT NULL DEFAULT TRUE, -- уведомлять при изменении позиции
  notify_on_top_10 BOOLEAN NOT NULL DEFAULT TRUE, -- уведомлять при попадании в топ-10
  target_position INTEGER, -- целевая позиция
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(site_url, keyword, search_engine)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_seo_settings_active ON seo_monitoring_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_seo_settings_site_keyword ON seo_monitoring_settings(site_url, keyword);

-- Таблица для истории изменений позиций
CREATE TABLE IF NOT EXISTS seo_position_history (
  id SERIAL PRIMARY KEY,
  monitoring_id INTEGER REFERENCES seo_position_monitoring(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  change_from INTEGER, -- предыдущая позиция
  change_delta INTEGER, -- изменение (положительное = улучшение, отрицательное = ухудшение)
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_history_monitoring_id ON seo_position_history(monitoring_id);
CREATE INDEX IF NOT EXISTS idx_seo_history_checked_at ON seo_position_history(checked_at DESC);







