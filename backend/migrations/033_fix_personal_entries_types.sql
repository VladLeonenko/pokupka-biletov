-- Исправление типов данных в personal_entries
-- workout_exercises должен быть TEXT, а не JSONB

ALTER TABLE personal_entries 
ALTER COLUMN workout_exercises TYPE TEXT;

-- Также убедимся, что все остальные поля корректны
COMMENT ON COLUMN personal_entries.workout_exercises IS 'Текстовое описание упражнений';


