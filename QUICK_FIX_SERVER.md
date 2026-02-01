# Быстрое исправление на сервере

## Проблема
- CORS ошибки
- Запросы идут на localhost:3000
- Вход в ЛК не работает

## Решение (выполните на сервере):

### 1. Добавить CORS_ORIGIN в .env

```bash
cd /var/www/primecoder-gulp/backend

# Проверить, есть ли CORS_ORIGIN
cat .env | grep CORS

# Если нет или неправильный - добавить/исправить
nano .env
```

**Добавьте в конец файла (если нет):**
```env
CORS_ORIGIN=https://prime-coder.ru,https://www.prime-coder.ru
```

**Сохраните (Ctrl+O, Enter, Ctrl+X)**

### 2. Перезапустить PM2 правильно

```bash
# Удалить все процессы
pm2 delete all

# Запустить заново
cd /var/www/primecoder-gulp/backend
pm2 start app.js --name primecoder-backend -i 2

# Сохранить конфигурацию
pm2 save

# Проверить статус
pm2 status
```

### 3. Проверить, что CORS загрузился

```bash
# Проверить логи при старте
pm2 logs primecoder-backend --lines 30

# Или проверить переменные (может не показать, но это нормально)
pm2 env 0 | grep CORS
```

### 4. Пересобрать и задеплоить фронтенд

**Локально выполните:**
```bash
cd /Users/vladislavleonenko/Desktop/primecoder-gulp/frontend
npm run build
scp -r dist/* root@85.239.44.40:/var/www/primecoder-gulp/frontend/dist/
```

### 5. Очистить кеш браузера

- Откройте в режиме инкогнито
- Или Ctrl+Shift+Delete → Очистить кеш

### 6. Проверить

1. Откройте DevTools (F12)
2. Вкладка Network
3. Попробуйте войти
4. Проверьте URL запросов - должны быть на `https://prime-coder.ru/api/...`
5. Проверьте заголовки ответа - должны быть CORS заголовки

## Если не помогает

Временно разрешить все источники в `backend/app.js`:

```bash
cd /var/www/primecoder-gulp/backend
nano app.js
```

Найдите строку 83 и измените:
```javascript
app.use(cors({ 
  origin: '*', // Временно разрешить все
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id']
}));
```

Сохраните и перезапустите:
```bash
pm2 restart all
```
