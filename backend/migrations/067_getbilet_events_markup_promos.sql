-- GetBilet: мероприятия (ручные поля + внешний id), группы для наценки, правила наценки, промокоды

-- Группы мероприятий (для режима наценки «группа»)
CREATE TABLE IF NOT EXISTS getbilet_event_groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_getbilet_event_groups_name ON getbilet_event_groups (name);

-- Карточки мероприятий: связь с внешним id GetBilet + ручные поля поверх API
CREATE TABLE IF NOT EXISTS getbilet_events (
  id SERIAL PRIMARY KEY,
  getbilet_external_id TEXT NOT NULL,
  title_manual TEXT,
  description_manual TEXT,
  notes_internal TEXT,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_getbilet_events_external UNIQUE (getbilet_external_id)
);

CREATE INDEX IF NOT EXISTS idx_getbilet_events_sort ON getbilet_events (sort_order, id);
CREATE INDEX IF NOT EXISTS idx_getbilet_events_published ON getbilet_events (is_published);

-- Состав групп (мероприятие может быть только в одной группе — проще для менеджеров)
CREATE TABLE IF NOT EXISTS getbilet_event_group_members (
  event_id INT NOT NULL REFERENCES getbilet_events(id) ON DELETE CASCADE,
  group_id INT NOT NULL REFERENCES getbilet_event_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id),
  UNIQUE (group_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_getbilet_group_members_group ON getbilet_event_group_members (group_id);

-- Наценка: один глобальный режим, опционально — по группе, опционально — по событию (приоритет: событие > группа > глобальная)
-- markup_kind: percent — процент к цене поставщика; fixed — фикс в валюте (руб) на билет
CREATE TABLE IF NOT EXISTS getbilet_markup_rules (
  id SERIAL PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('global', 'group', 'event')),
  group_id INT REFERENCES getbilet_event_groups(id) ON DELETE CASCADE,
  event_id INT REFERENCES getbilet_events(id) ON DELETE CASCADE,
  markup_kind TEXT NOT NULL CHECK (markup_kind IN ('percent', 'fixed')),
  markup_value NUMERIC(14, 4) NOT NULL CHECK (markup_value >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_getbilet_markup_scope_targets CHECK (
    (scope = 'global' AND group_id IS NULL AND event_id IS NULL)
    OR (scope = 'group' AND group_id IS NOT NULL AND event_id IS NULL)
    OR (scope = 'event' AND event_id IS NOT NULL AND group_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_getbilet_markup_global ON getbilet_markup_rules (scope) WHERE scope = 'global';
CREATE UNIQUE INDEX IF NOT EXISTS uq_getbilet_markup_per_group ON getbilet_markup_rules (group_id) WHERE scope = 'group';
CREATE UNIQUE INDEX IF NOT EXISTS uq_getbilet_markup_per_event ON getbilet_markup_rules (event_id) WHERE scope = 'event';

-- Промокоды (скидка к итогу; лимиты и окно действия)
CREATE TABLE IF NOT EXISTS getbilet_promo_codes (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL,
  discount_kind TEXT NOT NULL CHECK (discount_kind IN ('percent', 'fixed')),
  discount_value NUMERIC(14, 4) NOT NULL CHECK (discount_value >= 0),
  max_uses_total INT,
  max_uses_per_user INT,
  uses_count INT NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  min_order_amount NUMERIC(14, 2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_getbilet_promo_dates CHECK (valid_from IS NULL OR valid_until IS NULL OR valid_from <= valid_until),
  CONSTRAINT chk_getbilet_promo_percent CHECK (
    discount_kind <> 'percent' OR (discount_value >= 0 AND discount_value <= 100)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_getbilet_promo_code_lower ON getbilet_promo_codes (lower(trim(code)));

COMMENT ON TABLE getbilet_events IS 'Мероприятия: getbilet_external_id — id в GetBilet; остальное — ручные поля для витрины/заметок';
COMMENT ON TABLE getbilet_markup_rules IS 'Наценка: global — все билеты; group — группа; event — одно мероприятие. При расчёте: event > group > global';
COMMENT ON TABLE getbilet_promo_codes IS 'Промокоды GetBilet: скидка % или фикс, лимиты использований, сроки';
