# Исправление проблем на сервере

## Проблемы:

1. **Git pull не прошел** - локальные изменения в `frontend/vite.config.js` и неотслеживаемый файл `backend/UPDATE_NGINX_413.sh`
2. **Скрипт не найден** - `create-initial-carousels.js` не существует (git pull не прошел)
3. **Права доступа к таблице** - "must be owner of table promotions" при применении миграции
4. **psql не подключается** - Peer authentication failed

## Решение:

### 1. Исправить git pull

```bash
cd /var/www/primecoder-gulp

# Сохранить локальные изменения
git stash

# Удалить неотслеживаемый файл
rm -f backend/UPDATE_NGINX_413.sh

# Теперь можно сделать pull
git pull origin main
```

### 2. Исправить права доступа к таблице promotions

Проблема: скрипт пытается добавить колонки, но у пользователя `primeuser` нет прав.

**Вариант 1: Использовать суперпользователя PostgreSQL**

```bash
# Подключиться как postgres (суперпользователь)
sudo -u postgres psql -d primecoder_prod

# Дать права пользователю primeuser
ALTER TABLE promotions OWNER TO primeuser;
\q
```

**Вариант 2: Запустить скрипт от имени postgres**

```bash
# Сначала применить миграцию вручную
sudo -u postgres psql -d primecoder_prod << EOF
ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS conditions TEXT;

CREATE INDEX IF NOT EXISTS idx_promotions_slug ON promotions(slug) WHERE slug IS NOT NULL;

ALTER TABLE promotions 
ADD CONSTRAINT IF NOT EXISTS promotions_slug_unique UNIQUE (slug);
EOF

# Теперь запустить скрипт (он пропустит миграцию, т.к. колонки уже есть)
cd backend
node scripts/create-promotions.js
```

### 3. Исправить подключение к psql

Проблема: Peer authentication требует подключения через Unix socket с тем же пользователем системы.

**Вариант 1: Использовать -h localhost**

```bash
psql -h localhost -U primeuser -d primecoder_prod -c "SELECT slug, title FROM carousels WHERE slug IN ('vertical-carousel-home', 'team');"
```

**Вариант 2: Использовать PGPASSWORD**

```bash
export PGPASSWORD=primepass
psql -h localhost -U primeuser -d primecoder_prod -c "SELECT slug, title FROM carousels WHERE slug IN ('vertical-carousel-home', 'team');"
```

**Вариант 3: Использовать .pgpass файл**

```bash
echo "localhost:5432:primecoder_prod:primeuser:primepass" > ~/.pgpass
chmod 600 ~/.pgpass
psql -h localhost -U primeuser -d primecoder_prod -c "SELECT slug, title FROM carousels WHERE slug IN ('vertical-carousel-home', 'team');"
```

## Полная последовательность команд:

```bash
cd /var/www/primecoder-gulp

# 1. Исправить git
git stash
rm -f backend/UPDATE_NGINX_413.sh
git pull origin main

# 2. Применить миграцию для promotions (от имени postgres)
sudo -u postgres psql -d primecoder_prod << EOF
ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS conditions TEXT;

CREATE INDEX IF NOT EXISTS idx_promotions_slug ON promotions(slug) WHERE slug IS NOT NULL;

DO \$\$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'promotions_slug_unique'
    ) THEN
        ALTER TABLE promotions ADD CONSTRAINT promotions_slug_unique UNIQUE (slug);
    END IF;
END \$\$;
EOF

# 3. Создать карусели
cd backend
node scripts/create-initial-carousels.js

# 4. Создать акции
node scripts/create-promotions.js

# 5. Перезапустить бэкенд
pm2 restart all --update-env

# 6. Проверить карусели (с правильным подключением)
export PGPASSWORD=primepass
psql -h localhost -U primeuser -d primecoder_prod -c "SELECT slug, title FROM carousels WHERE slug IN ('vertical-carousel-home', 'team');"

# 7. Проверить акции
psql -h localhost -U primeuser -d primecoder_prod -c "SELECT id, slug, title, is_active FROM promotions ORDER BY sort_order;"
```
