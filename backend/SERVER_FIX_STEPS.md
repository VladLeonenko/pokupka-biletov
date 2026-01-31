# Исправление проблем на сервере

## Проблема 1: Пароль PostgreSQL неверный

### Решение:
```bash
cd /var/www/primecoder-gulp/backend

# Проверить текущий пароль в .env
cat .env | grep PGPASSWORD

# Если пароль неверный, отредактировать:
nano .env
# Изменить PGPASSWORD=правильный_пароль

# Или использовать пароль напрямую:
export PGPASSWORD=правильный_пароль
psql -h localhost -U primeuser -d primecoder_prod -f migrations/052_add_quiz_system.sql
```

### Альтернатива: Использовать .pgpass
```bash
# Создать файл ~/.pgpass
echo "localhost:5432:primecoder_prod:primeuser:правильный_пароль" > ~/.pgpass
chmod 600 ~/.pgpass

# Теперь psql не будет спрашивать пароль
psql -h localhost -U primeuser -d primecoder_prod -f migrations/052_add_quiz_system.sql
```

## Проблема 2: Скрипт create-initial-quiz.js не найден

### Решение:
```bash
cd /var/www/primecoder-gulp

# Проверить, есть ли файл
ls -la backend/scripts/create-initial-quiz.js

# Если файла нет, возможно нужно еще раз сделать pull
git fetch origin
git pull origin main

# Или проверить, что файл существует в репозитории
git ls-files | grep create-initial-quiz

# Если файла нет в репозитории, применить миграцию вручную:
cd backend
export PGPASSWORD=$(grep PGPASSWORD .env | cut -d '=' -f2)
psql -h localhost -U primeuser -d primecoder_prod -f migrations/052_add_quiz_system.sql

# Затем создать вопросы вручную через SQL или админ-панель
```

## Проблема 3: Применить миграцию вручную

Если скрипт недоступен, можно применить миграцию напрямую:

```bash
cd /var/www/primecoder-gulp/backend

# Вариант 1: Через psql с правильным паролем
export PGPASSWORD=правильный_пароль
psql -h localhost -U primeuser -d primecoder_prod << 'EOF'
-- Создать таблицы для квиза
CREATE TABLE IF NOT EXISTS quiz_questions (
  id SERIAL PRIMARY KEY,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) DEFAULT 'single',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_options (
  id SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_description TEXT,
  points_start INTEGER DEFAULT 0,
  points_business INTEGER DEFAULT 0,
  points_premium INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_results (
  id SERIAL PRIMARY KEY,
  recommended_tariff VARCHAR(50),
  answers JSONB,
  user_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_sort ON quiz_questions(sort_order, is_active);
CREATE INDEX IF NOT EXISTS idx_quiz_options_question ON quiz_options(question_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_quiz_results_tariff ON quiz_results(recommended_tariff);
CREATE INDEX IF NOT EXISTS idx_quiz_results_created ON quiz_results(created_at);
EOF
```

## Полная последовательность действий

```bash
cd /var/www/primecoder-gulp/backend

# 1. Проверить/исправить пароль
nano .env
# Убедитесь что PGPASSWORD правильный

# 2. Применить миграцию
export PGPASSWORD=$(grep PGPASSWORD .env | cut -d '=' -f2)
psql -h localhost -U primeuser -d primecoder_prod -f migrations/052_add_quiz_system.sql

# 3. Если скрипт есть - создать начальные вопросы
if [ -f "scripts/create-initial-quiz.js" ]; then
  node scripts/create-initial-quiz.js
else
  echo "Скрипт не найден, создайте вопросы через админ-панель /admin/quiz"
fi

# 4. Пересобрать фронтенд
cd ../frontend
npm run build
pm2 restart all
```
