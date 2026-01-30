-- Миграция для личного планировщика с проектами и метриками

-- Таблица проектов
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7) DEFAULT '#667eea', -- HEX color
    description TEXT,
    goals TEXT, -- JSONB with KPIs
    deadline DATE,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    budget DECIMAL(12, 2),
    priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
    status VARCHAR(50) DEFAULT 'active', -- active, paused, completed, archived
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Обновляем таблицу tasks для связи с проектами
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS estimated_time INTEGER, -- в минутах
ADD COLUMN IF NOT EXISTS actual_time INTEGER, -- в минутах
ADD COLUMN IF NOT EXISTS energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
ADD COLUMN IF NOT EXISTS tags TEXT[];

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING GIN(tags);

-- Таблица категорий личного развития
CREATE TABLE IF NOT EXISTS personal_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50),
    color VARCHAR(7),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Вставляем стандартные категории
INSERT INTO personal_categories (name, icon, color, description) VALUES
('workouts', '💪', '#ff6b6b', 'Тренировки и физическая активность'),
('nutrition', '🍎', '#51cf66', 'Питание и здоровье'),
('education', '📚', '#4c6ef5', 'Образование и курсы'),
('reading', '📖', '#f59f00', 'Чтение книг и статей'),
('finance', '💰', '#20c997', 'Финансы и бюджет')
ON CONFLICT (name) DO NOTHING;

-- Таблица записей личного развития
CREATE TABLE IF NOT EXISTS personal_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES personal_categories(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Данные для тренировок
    workout_type VARCHAR(100),
    workout_duration INTEGER, -- в минутах
    workout_exercises JSONB,
    workout_weight DECIMAL(5, 2),
    
    -- Данные для питания
    nutrition_calories INTEGER,
    nutrition_protein DECIMAL(5, 1),
    nutrition_carbs DECIMAL(5, 1),
    nutrition_fats DECIMAL(5, 1),
    nutrition_water DECIMAL(4, 1), -- в литрах
    
    -- Данные для образования
    education_course VARCHAR(255),
    education_hours DECIMAL(4, 2),
    education_progress INTEGER,
    
    -- Данные для чтения
    reading_book VARCHAR(255),
    reading_pages INTEGER,
    reading_notes TEXT,
    
    -- Данные для финансов
    finance_income DECIMAL(12, 2),
    finance_expenses DECIMAL(12, 2),
    finance_category VARCHAR(100),
    finance_notes TEXT,
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personal_entries_user_id ON personal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_entries_category_id ON personal_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_personal_entries_date ON personal_entries(date);

-- Таблица ежедневных метрик
CREATE TABLE IF NOT EXISTS daily_metrics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Метрики продуктивности
    tasks_completed INTEGER DEFAULT 0,
    tasks_total INTEGER DEFAULT 0,
    completion_rate DECIMAL(5, 2), -- %
    
    -- Время по проектам (JSON: {project_id: minutes})
    time_by_project JSONB DEFAULT '{}',
    time_personal INTEGER DEFAULT 0, -- минуты на личное развитие
    
    -- Самочувствие
    energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
    mood INTEGER CHECK (mood >= 1 AND mood <= 10),
    sleep_hours DECIMAL(3, 1),
    
    -- AI инсайты
    ai_insights TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_user_id ON daily_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date);

-- Таблица достижений (gamification)
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- streak, milestone, level
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(type);

-- Таблица стриков
CREATE TABLE IF NOT EXISTS streaks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- tasks, workouts, reading, etc.
    current_count INTEGER DEFAULT 0,
    best_count INTEGER DEFAULT 0,
    last_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, type)
);

CREATE INDEX IF NOT EXISTS idx_streaks_user_id ON streaks(user_id);

-- Таблица AI-рекомендаций
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- task, insight, warning, achievement
    title VARCHAR(255) NOT NULL,
    description TEXT,
    action_text VARCHAR(255),
    action_data JSONB,
    priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user_id ON ai_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_type ON ai_recommendations(type);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_is_read ON ai_recommendations(is_read);

-- Триггеры для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_personal_entries_updated_at ON personal_entries;
CREATE TRIGGER update_personal_entries_updated_at
    BEFORE UPDATE ON personal_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_metrics_updated_at ON daily_metrics;
CREATE TRIGGER update_daily_metrics_updated_at
    BEFORE UPDATE ON daily_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_streaks_updated_at ON streaks;
CREATE TRIGGER update_streaks_updated_at
    BEFORE UPDATE ON streaks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Функция для автоматического обновления прогресса проекта
CREATE OR REPLACE FUNCTION update_project_progress()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE projects
    SET progress = (
        SELECT ROUND(
            (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / 
             NULLIF(COUNT(*), 0) * 100)
        )
        FROM tasks
        WHERE project_id = NEW.project_id
    )
    WHERE id = NEW.project_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_project_progress ON tasks;
CREATE TRIGGER trigger_update_project_progress
    AFTER INSERT OR UPDATE OF status ON tasks
    FOR EACH ROW
    WHEN (NEW.project_id IS NOT NULL)
    EXECUTE FUNCTION update_project_progress();

-- Вставляем стандартные проекты для первого пользователя (если есть)
DO $$
DECLARE
    first_user_id INTEGER;
BEGIN
    SELECT id INTO first_user_id FROM users WHERE role = 'admin' LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
        INSERT INTO projects (user_id, name, color, description, priority) VALUES
        (first_user_id, 'Primecoder', '#667eea', 'Разработка собственного сайта и CMS', 5),
        (first_user_id, 'Umagazine', '#f093fb', 'Модный онлайн-журнал', 4),
        (first_user_id, 'Africa Site', '#4facfe', 'Проект африканского сайта', 3),
        (first_user_id, 'Tickets Site', '#43e97b', 'Платформа продажи билетов', 3),
        (first_user_id, 'Other', '#888888', 'Прочие задачи и проекты', 2)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;


