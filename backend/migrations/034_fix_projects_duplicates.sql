-- Исправление: добавляем уникальное ограничение для проектов
-- чтобы избежать дублей при повторных миграциях

-- Добавляем уникальное ограничение на (user_id, name)
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS unique_user_project_name;

ALTER TABLE projects 
ADD CONSTRAINT unique_user_project_name UNIQUE (user_id, name);

-- Теперь ON CONFLICT DO NOTHING в миграции 032 будет работать корректно


