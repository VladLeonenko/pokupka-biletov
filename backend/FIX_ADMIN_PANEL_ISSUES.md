# Исправление проблем с админ панелью

## Проблемы

1. **502 ошибка на `/api/errors`** - backend не отвечает
2. **`useState` не найден** - проблема с React импортами или сборкой frontend

## Решение

### Шаг 1: Проверить что routes/errors.js существует на сервере

```bash
cd /var/www/primecoder-gulp/backend
ls -la routes/errors.js
cat routes/errors.js | head -20
```

Если файл не существует или поврежден, скопировать из репозитория.

### Шаг 2: Перезапустить backend

```bash
cd /var/www/primecoder-gulp/backend
pm2 restart all --update-env
pm2 logs --lines 50
```

Проверить логи на наличие ошибок.

### Шаг 3: Проверить что frontend собран

```bash
cd /var/www/primecoder-gulp/frontend
ls -la dist/
```

Если `dist/` пуст или старый, пересобрать:

```bash
cd /var/www/primecoder-gulp/frontend
npm run build
```

### Шаг 4: Проверить проблему с useState

Ошибка `Can't find variable: useState` означает что React не загружается правильно.

Возможные причины:
1. Проблема с импортами в коде
2. Проблема со сборкой frontend
3. Кэш браузера

**Быстрое решение:**
1. Очистить кэш браузера (Cmd+Shift+R на Mac, Ctrl+Shift+R на Windows)
2. Пересобрать frontend
3. Проверить что все импорты React правильные

### Шаг 5: Проверить логи Nginx

```bash
sudo tail -50 /var/log/nginx/error.log
```

Если есть ошибки 502, они будут в логах.

## Полная последовательность исправления

```bash
# 1. Обновить код
cd /var/www/primecoder-gulp
git pull origin main

# 2. Проверить что routes/errors.js существует
ls -la backend/routes/errors.js

# 3. Перезапустить backend
cd backend
pm2 restart all --update-env
pm2 logs --lines 50

# 4. Пересобрать frontend
cd ../frontend
npm run build

# 5. Проверить логи
pm2 logs --lines 20
sudo tail -20 /var/log/nginx/error.log
```

## Если проблема остается

### Проверить что backend запущен

```bash
pm2 status
pm2 logs primecoder-backend --lines 100
```

### Проверить что Nginx правильно проксирует

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Проверить что порт 3000 слушается

```bash
sudo netstat -tlnp | grep 3000
# или
sudo ss -tlnp | grep 3000
```
