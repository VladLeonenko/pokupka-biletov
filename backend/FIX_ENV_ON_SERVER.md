# Исправление .env на сервере после git pull

## Проблема

После `git pull` `.env` файл перезаписывается локальными настройками, что ломает подключение к БД на сервере.

## Быстрое решение

### 1. На сервере защитить .env от перезаписи

```bash
cd /var/www/primecoder-gulp/backend

# Убедиться что .env не отслеживается git
git update-index --assume-unchanged backend/.env

# Или добавить в .git/info/exclude (локальный gitignore)
echo "backend/.env" >> .git/info/exclude
```

### 2. Восстановить правильный .env на сервере

```bash
cd /var/www/primecoder-gulp/backend

# Создать/обновить .env с правильными настройками для сервера
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
SITE_URL=https://prime-coder.ru
CORS_ORIGIN=https://prime-coder.ru,https://www.prime-coder.ru

# База данных (правильные настройки для сервера)
PGUSER=primeuser
PGHOST=localhost
PGDATABASE=primecoder_prod
PGPASSWORD=primepass
PGPORT=5432

# JWT
JWT_SECRET=ваш_секретный_ключ_здесь

# OpenAI (если используется)
OPENAI_API_KEY=sk-...

# Email (если используется)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
AUTH_RATE_LIMIT_MAX=5
EOF

# Перезапустить приложение
pm2 restart all --update-env
```

### 3. Использовать скрипт безопасного деплоя

```bash
cd /var/www/primecoder-gulp
chmod +x backend/deploy-safe.sh
./backend/deploy-safe.sh
```

Скрипт автоматически:
- Сохраняет текущий `.env` перед `git pull`
- Восстанавливает `.env` после `git pull` если он был изменен
- Защищает `.env` от отслеживания git

## Долгосрочное решение

### Вариант 1: Использовать .env.production

```bash
# На сервере создать .env.production
cd /var/www/primecoder-gulp/backend
cp .env .env.production

# В скриптах использовать .env.production если NODE_ENV=production
```

### Вариант 2: Использовать переменные окружения системы

```bash
# На сервере установить переменные окружения
export PGUSER=primeuser
export PGHOST=localhost
export PGDATABASE=primecoder_prod
export PGPASSWORD=primepass
export PGPORT=5432

# В PM2 ecosystem.config.cjs добавить:
env: {
  PGUSER: 'primeuser',
  PGHOST: 'localhost',
  PGDATABASE: 'primecoder_prod',
  PGPASSWORD: 'primepass',
  PGPORT: 5432
}
```

## Проверка

```bash
# 1. Убедиться что .env не в git
cd /var/www/primecoder-gulp
git ls-files | grep "\.env$"
# Должно быть пусто

# 2. Убедиться что .env существует и правильный
cat backend/.env | grep PGUSER
# Должен быть: PGUSER=primeuser (для сервера)

# 3. Проверить что приложение работает
pm2 logs primecoder-backend --lines 20
# Не должно быть ошибок подключения к БД
```
