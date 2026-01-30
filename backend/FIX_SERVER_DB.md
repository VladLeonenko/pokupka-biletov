# Исправление проблемы с БД на сервере

## Проблема
Backend пытается подключиться к `primecoder_db`, но БД не существует. Импорт прошел в `primecoder_prod`.

## Решение 1: Использовать primecoder_prod (быстро)

```bash
cd /var/www/primecoder-gulp/backend

# 1. Вернуть .env на primecoder_prod
nano .env
# Измените: PGDATABASE=primecoder_db → PGDATABASE=primecoder_prod
# Сохраните: Ctrl+O, Enter, Ctrl+X

# 2. Перезапустить с обновлением env
pm2 restart all --update-env
pm2 logs --lines 20
```

## Решение 2: Создать primecoder_db (правильно)

```bash
cd /var/www/primecoder-gulp/backend

# 1. Создать БД
sudo -u postgres psql -c "CREATE DATABASE primecoder_db OWNER primeuser;"

# 2. Обновить код (чтобы получить скрипт миграций)
cd /var/www/primecoder-gulp
git pull origin main

# 3. Применить миграции
cd backend
node scripts/apply-migrations-to-db.js primecoder_db

# 4. Импортировать данные
node scripts/import-database.js primecoder-data-export.json

# 5. Проверить .env (должно быть primecoder_db)
cat .env | grep PGDATABASE

# 6. Перезапустить
pm2 restart all --update-env
```

## Проверка после исправления

```bash
# Проверить данные
node scripts/check-server-db.js

# Проверить статус backend
pm2 status
pm2 logs --lines 20
```
