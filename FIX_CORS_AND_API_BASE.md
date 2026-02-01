# Исправление CORS и API Base URL

## Проблема
Фронтенд обращается к `http://localhost:3000` вместо `https://prime-coder.ru/api`, что вызывает CORS ошибки.

## Решение

### 1. Исправлен код (уже сделано)
- `frontend/src/utils/apiBase.ts` - теперь использует `window.location.origin` в продакшене

### 2. На сервере - обновить CORS в .env

```bash
cd /var/www/primecoder-gulp/backend
nano .env
```

Убедитесь, что есть:
```env
CORS_ORIGIN=https://prime-coder.ru,https://www.prime-coder.ru
```

Если нет - добавьте.

### 3. Перезапустить бэкенд с обновленными переменными окружения

```bash
pm2 restart all --update-env
```

**ВАЖНО:** Используйте `--update-env` чтобы обновить переменные окружения!

### 4. Пересобрать и задеплоить фронтенд

**Локально:**
```bash
cd frontend
npm run build
```

**Скопировать на сервер:**
```bash
scp -r dist/* root@85.239.44.40:/var/www/primecoder-gulp/frontend/dist/
```

### 5. Проверить результат

После деплоя:
1. Очистите кеш браузера (Ctrl+Shift+R / Cmd+Shift+R)
2. Попробуйте войти в ЛК
3. Проверьте консоль - не должно быть CORS ошибок
4. Запросы должны идти на `https://prime-coder.ru/api/...` а не на `localhost:3000`

## Если проблема остается

Проверьте на сервере:

```bash
# 1. Проверить переменные окружения в PM2
pm2 env 0

# 2. Проверить .env файл
cat /var/www/primecoder-gulp/backend/.env | grep CORS

# 3. Проверить логи бэкенда
pm2 logs primecoder-backend --lines 50 | grep -i cors

# 4. Проверить, что бэкенд запущен
pm2 status
```

## Альтернативное решение (если не помогает)

Если CORS все еще не работает, можно временно разрешить все источники:

В `backend/app.js` изменить:
```javascript
app.use(cors({ 
  origin: '*', // Временно разрешить все
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id']
}));
```

**НО:** Это менее безопасно, лучше использовать правильный CORS_ORIGIN.
