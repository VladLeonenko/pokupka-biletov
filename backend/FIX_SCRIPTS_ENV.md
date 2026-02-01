# Исправление скриптов для правильного чтения .env

## Проблема

Скрипты пытаются подключиться с пользователем "primecoder_user" вместо "primeuser".

## Решение

### Вариант 1: Проверить и исправить .env на сервере

```bash
cd /var/www/primecoder-gulp/backend

# Проверить что в .env
cat .env | grep PGUSER

# Если там primecoder_user, исправить:
sed -i 's/PGUSER=primecoder_user/PGUSER=primeuser/g' .env

# Или отредактировать вручную
nano .env
# Убедиться что там:
# PGUSER=primeuser
# PGHOST=localhost
# PGDATABASE=primecoder_prod
# PGPASSWORD=primepass
# PGPORT=5432
```

### Вариант 2: Запустить скрипты с явными переменными

```bash
cd /var/www/primecoder-gulp/backend

# С явным указанием переменных
PGUSER=primeuser PGHOST=localhost PGDATABASE=primecoder_prod PGPASSWORD=primepass PGPORT=5432 node scripts/create-initial-carousels.js

PGUSER=primeuser PGHOST=localhost PGDATABASE=primecoder_prod PGPASSWORD=primepass PGPORT=5432 node scripts/create-promotions.js
```

### Вариант 3: Использовать правильный .env файл

```bash
cd /var/www/primecoder-gulp/backend

# Проверить что dotenv правильно загружает .env
node -e "require('dotenv').config(); console.log('PGUSER:', process.env.PGUSER)"

# Если показывает неправильное значение, проверить путь к .env
ls -la .env

# Загрузить переменные вручную перед запуском скрипта
export $(cat .env | grep -v '^#' | xargs)
node scripts/create-initial-carousels.js
node scripts/create-promotions.js
```

## Быстрое решение

```bash
cd /var/www/primecoder-gulp/backend

# 1. Проверить .env
cat .env | grep PGUSER

# 2. Если неправильно - исправить
nano .env
# Или:
sed -i 's/PGUSER=.*/PGUSER=primeuser/g' .env

# 3. Запустить скрипты с явными переменными (надежнее)
export $(cat .env | grep -v '^#' | xargs)
node scripts/create-initial-carousels.js
node scripts/create-promotions.js
```
