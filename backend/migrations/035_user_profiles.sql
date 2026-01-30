-- Миграция для профилей пользователя по категориям

-- Таблица профилей тренировок
CREATE TABLE IF NOT EXISTS user_workout_profile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Базовые данные
    height DECIMAL(5, 2), -- в см
    weight DECIMAL(5, 2), -- в кг
    age INTEGER,
    gender VARCHAR(20), -- male, female, other
    
    -- Уровень подготовки
    fitness_level VARCHAR(50), -- beginner, intermediate, advanced, pro
    
    -- Цели
    goals TEXT[], -- weight_loss, muscle_gain, endurance, flexibility, health
    target_weight DECIMAL(5, 2),
    
    -- Ограничения
    injuries TEXT[],
    health_conditions TEXT[],
    
    -- Предпочтения
    preferred_workouts TEXT[], -- strength, cardio, yoga, swimming, etc.
    training_days_per_week INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица профилей питания
CREATE TABLE IF NOT EXISTS user_nutrition_profile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Цели
    daily_calories_goal INTEGER,
    daily_protein_goal DECIMAL(5, 1),
    daily_carbs_goal DECIMAL(5, 1),
    daily_fats_goal DECIMAL(5, 1),
    daily_water_goal DECIMAL(4, 1),
    
    -- Предпочтения
    diet_type VARCHAR(50), -- standard, vegan, vegetarian, keto, paleo, etc.
    allergies TEXT[],
    dislikes TEXT[],
    
    -- Режим питания
    meals_per_day INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица профилей образования
CREATE TABLE IF NOT EXISTS user_education_profile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Интересы
    areas_of_interest TEXT[],
    current_skills TEXT[],
    target_skills TEXT[],
    
    -- Цели
    learning_goals TEXT,
    hours_per_week INTEGER,
    
    -- Предпочтения
    preferred_formats TEXT[], -- video, text, interactive, books
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица профилей чтения
CREATE TABLE IF NOT EXISTS user_reading_profile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Предпочтения
    favorite_genres TEXT[],
    favorite_authors TEXT[],
    reading_speed INTEGER, -- страниц в час
    
    -- Цели
    books_per_month_goal INTEGER,
    pages_per_day_goal INTEGER,
    
    -- История
    books_read TEXT[], -- список прочитанных книг
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица профилей финансов
CREATE TABLE IF NOT EXISTS user_finance_profile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Бюджет
    monthly_income DECIMAL(12, 2),
    monthly_budget DECIMAL(12, 2),
    
    -- Цели
    savings_goal DECIMAL(12, 2),
    investment_goal DECIMAL(12, 2),
    
    -- Категории расходов (custom)
    expense_categories JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Триггеры для updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_workout_profile_updated_at ON user_workout_profile;
CREATE TRIGGER update_user_workout_profile_updated_at
    BEFORE UPDATE ON user_workout_profile
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_nutrition_profile_updated_at ON user_nutrition_profile;
CREATE TRIGGER update_user_nutrition_profile_updated_at
    BEFORE UPDATE ON user_nutrition_profile
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_education_profile_updated_at ON user_education_profile;
CREATE TRIGGER update_user_education_profile_updated_at
    BEFORE UPDATE ON user_education_profile
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_reading_profile_updated_at ON user_reading_profile;
CREATE TRIGGER update_user_reading_profile_updated_at
    BEFORE UPDATE ON user_reading_profile
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_finance_profile_updated_at ON user_finance_profile;
CREATE TRIGGER update_user_finance_profile_updated_at
    BEFORE UPDATE ON user_finance_profile
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


