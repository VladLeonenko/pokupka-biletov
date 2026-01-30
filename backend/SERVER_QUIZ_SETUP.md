# Настройка системы квиза на сервере

## Проблема с паролем PostgreSQL

Если возникает ошибка `password authentication failed`, проверьте пароль в `.env`:

```bash
cd /var/www/primecoder-gulp/backend
cat .env | grep PGPASSWORD
```

Если пароль неверный, обновите его:
```bash
nano .env
# Измените PGPASSWORD=ваш_правильный_пароль
```

## Применение миграций

### 1. Миграция для акций (если еще не применена)

```bash
cd /var/www/primecoder-gulp/backend

# Вариант 1: Через Node.js скрипт
node scripts/apply-migration-051.js

# Вариант 2: Через psql напрямую
export PGPASSWORD=$(grep PGPASSWORD .env | cut -d '=' -f2)
psql -h localhost -U primeuser -d primecoder_prod << 'EOF'
ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS conditions TEXT;

CREATE INDEX IF NOT EXISTS idx_promotions_slug ON promotions(slug) WHERE slug IS NOT NULL;
EOF
```

### 2. Миграция для квиза

```bash
cd /var/www/primecoder-gulp/backend

# Вариант 1: Через psql
export PGPASSWORD=$(grep PGPASSWORD .env | cut -d '=' -f2)
psql -h localhost -U primeuser -d primecoder_prod -f migrations/052_add_quiz_system.sql

# Вариант 2: Через Node.js (скрипт автоматически применит миграцию)
node scripts/create-initial-quiz.js
```

### 3. Создание начальных данных

```bash
# Создать акции
node scripts/create-promotions.js

# Создать социальные доказательства (если миграция применена)
node scripts/create-initial-social-proofs.js

# Создать начальные вопросы квиза
node scripts/create-initial-quiz.js
```

## Проверка

```bash
# Проверить акции
psql -h localhost -U primeuser -d primecoder_prod -c "SELECT title, slug FROM promotions LIMIT 5;"

# Проверить вопросы квиза
psql -h localhost -U primeuser -d primecoder_prod -c "SELECT question_text FROM quiz_questions LIMIT 5;"

# Проверить социальные доказательства
psql -h localhost -U primeuser -d primecoder_prod -c "SELECT title, value FROM social_proofs LIMIT 5;"
```

## Перезапуск

```bash
cd /var/www/primecoder-gulp
cd frontend
npm run build
pm2 restart all
```

## Доступ к админ-панели квиза

После деплоя доступно по адресу: `/admin/quiz`
