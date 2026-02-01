# Проверка переменных окружения для скриптов

## Проблема: password authentication failed for user "primecoder_user"

Скрипты пытаются подключиться с неправильным именем пользователя.

## Решение:

### 1. Проверить .env файл на сервере

```bash
cd /var/www/primecoder-gulp/backend
cat .env | grep -E "PGUSER|PGHOST|PGDATABASE|PGPASSWORD|PGPORT"
```

Должно быть что-то вроде:
```
PGUSER=primeuser
PGHOST=localhost
PGDATABASE=primecoder_prod
PGPASSWORD=primepass
PGPORT=5432
```

### 2. Если переменные неправильные, исправить:

```bash
cd /var/www/primecoder-gulp/backend
nano .env
```

Или через sed:
```bash
sed -i 's/PGUSER=primecoder_user/PGUSER=primeuser/g' .env
```

### 3. Проверить что переменные загружаются:

```bash
cd /var/www/primecoder-gulp/backend
source .env 2>/dev/null || true
echo "PGUSER=$PGUSER"
echo "PGDATABASE=$PGDATABASE"
```

### 4. Запустить скрипт с явным указанием переменных (если нужно):

```bash
cd /var/www/primecoder-gulp/backend
PGUSER=primeuser PGHOST=localhost PGDATABASE=primecoder_prod PGPASSWORD=primepass PGPORT=5432 node scripts/create-initial-carousels.js
```

### 5. Или использовать правильный .env файл:

```bash
cd /var/www/primecoder-gulp/backend
# Убедиться что .env файл существует и содержит правильные значения
cat .env

# Если файла нет или он неправильный, создать/обновить:
cat > .env << EOF
PGUSER=primeuser
PGHOST=localhost
PGDATABASE=primecoder_prod
PGPASSWORD=primepass
PGPORT=5432
JWT_SECRET=your_jwt_secret_here
OPENAI_API_KEY=your_openai_key_here
EOF
```

## Скрипт теперь поддерживает:

- `PGUSER` или `DB_USER` (по умолчанию: `primeuser`)
- `PGHOST` или `DB_HOST` (по умолчанию: `localhost`)
- `PGDATABASE` или `DB_NAME` (по умолчанию: `primecoder_prod`)
- `PGPASSWORD` или `DB_PASSWORD` (обязательно)
- `PGPORT` или `DB_PORT` (по умолчанию: `5432`)
