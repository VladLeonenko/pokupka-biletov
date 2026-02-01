# 100% РЕШЕНИЕ ПРОБЛЕМЫ С LOCALHOST:3000

## Проблема
В собранном фронтенде все запросы идут на `http://localhost:3000` вместо относительных путей `/api/...`

## Решение

### 1. Локально - пересобрать фронтенд правильно

```bash
cd /Users/vladislavleonenko/Desktop/primecoder-gulp/frontend

# Убедиться что нет VITE_API_URL в .env (если есть - удалить)
# cat .env 2>/dev/null | grep VITE_API_URL || echo "OK - нет VITE_API_URL"

# Очистить предыдущую сборку
rm -rf dist

# Собрать в production режиме
npm run build

# Проверить что в собранном бандле НЕТ localhost:3000
grep -r "localhost:3000" dist/ || echo "OK - localhost:3000 не найден"

# Если нашли localhost:3000 - значит проблема в коде, нужно исправить
```

### 2. Задеплоить на сервер

```bash
# С локальной машины
cd /Users/vladislavleonenko/Desktop/primecoder-gulp/frontend
scp -r dist/* root@85.239.44.40:/var/www/primecoder-gulp/frontend/dist/
```

### 3. На сервере - проверить CORS

```bash
ssh root@85.239.44.40

cd /var/www/primecoder-gulp/backend

# Проверить .env
cat .env | grep CORS_ORIGIN

# Должно быть ОДНА строка:
# CORS_ORIGIN=https://prime-coder.ru,https://www.prime-coder.ru

# Если нет или неправильно - исправить:
sed -i '/CORS_ORIGIN/d' .env
echo "CORS_ORIGIN=https://prime-coder.ru,https://www.prime-coder.ru" >> .env

# Проверить app.js - НЕ должно быть origin: '*'
grep -n "origin:" app.js
# Должно быть:
# origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],

# Перезапустить PM2
pm2 delete all
cd /var/www/primecoder-gulp/backend
pm2 start app.js --name primecoder-backend -i 2
pm2 save
```

### 4. Очистить кеш браузера

Ctrl+Shift+R / Cmd+Shift+R

## Проверка

После всех шагов:
1. Открыть DevTools → Network
2. Проверить что все запросы идут на `/api/...` (относительные пути)
3. НЕ должно быть запросов на `http://localhost:3000`
4. CORS должен работать
5. Вход в ЛК должен работать

## Если проблема осталась

Проверить что в собранном бандле действительно нет localhost:3000:

```bash
cd /Users/vladislavleonenko/Desktop/primecoder-gulp/frontend/dist
grep -r "localhost:3000" . || echo "OK"
```

Если нашли - значит проблема в коде, нужно найти где используется localhost:3000 и исправить.
