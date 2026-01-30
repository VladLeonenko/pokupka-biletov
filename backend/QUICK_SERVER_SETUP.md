# Быстрая настройка на сервере

## Проблема: файл create-initial-quiz.js отсутствует

Файл не может быть запушен из-за больших файлов в истории git. Решение - создать файл напрямую на сервере.

## Решение 1: Скопировать файл вручную

На сервере выполните:

```bash
cd /var/www/primecoder-gulp/backend/scripts

# Создать файл (скопируйте содержимое из локального файла)
nano create-initial-quiz.js
# Вставьте содержимое файла, сохраните (Ctrl+O, Enter, Ctrl+X)

chmod +x create-initial-quiz.js
```

## Решение 2: Использовать готовый SQL вместо скрипта

Если скрипт не нужен, можно создать вопросы через SQL:

```bash
cd /var/www/primecoder-gulp/backend

# Применить миграцию
export PGPASSWORD=ваш_пароль
psql -h localhost -U primeuser -d primecoder_prod -f migrations/052_add_quiz_system.sql

# Создать вопросы через админ-панель:
# Зайдите на https://prime-coder.ru/admin/quiz
# Добавьте вопросы вручную
```

## Решение 3: Создать вопросы через SQL напрямую

```bash
cd /var/www/primecoder-gulp/backend
export PGPASSWORD=ваш_пароль

psql -h localhost -U primeuser -d primecoder_prod << 'EOF'
-- Вопрос 1
INSERT INTO quiz_questions (question_text, question_type, sort_order, is_active)
VALUES ('Какой у вас бюджет на проект?', 'single', 1, true)
ON CONFLICT DO NOTHING
RETURNING id;

-- Варианты для вопроса 1 (замените question_id на реальный ID)
INSERT INTO quiz_options (question_id, option_text, option_description, points_start, points_business, points_premium, sort_order, is_active)
VALUES 
  ((SELECT id FROM quiz_questions WHERE question_text = 'Какой у вас бюджет на проект?'), 'До 500 000 ₽', 'Ограниченный бюджет', 3, 1, 0, 0, true),
  ((SELECT id FROM quiz_questions WHERE question_text = 'Какой у вас бюджет на проект?'), '500 000 - 1 500 000 ₽', 'Средний бюджет', 1, 3, 1, 1, true),
  ((SELECT id FROM quiz_questions WHERE question_text = 'Какой у вас бюджет на проект?'), 'Свыше 1 500 000 ₽', 'Гибкий бюджет', 0, 2, 3, 2, true);
EOF
```

## Рекомендуемый подход

1. Применить миграцию
2. Создать вопросы через админ-панель `/admin/quiz` - это проще и нагляднее
