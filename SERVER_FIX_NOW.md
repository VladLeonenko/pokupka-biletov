# СРОЧНОЕ ИСПРАВЛЕНИЕ НА СЕРВЕРЕ

## Проблема
- CORS ошибки
- Запросы идут на localhost:3000
- Вход в ЛК не работает

## Решение (выполните ВСЕ команды на сервере):

### Шаг 1: Добавить CORS_ORIGIN в .env

```bash
cd /var/www/primecoder-gulp/backend

# Проверить текущий .env
cat .env | grep -i cors

# Добавить CORS_ORIGIN если его нет
echo "" >> .env
echo "CORS_ORIGIN=https://prime-coder.ru,https://www.prime-coder.ru" >> .env

# Проверить, что добавилось
cat .env | grep -i cors
```

**Должно показать:**
```
CORS_ORIGIN=https://prime-coder.ru,https://www.prime-coder.ru
```

### Шаг 2: Перезапустить PM2 правильно

```bash
# Удалить все процессы
pm2 delete all

# Запустить заново (это загрузит .env заново)
cd /var/www/primecoder-gulp/backend
pm2 start app.js --name primecoder-backend -i 2

# Сохранить
pm2 save

# Проверить статус
pm2 status
```

### Шаг 3: Проверить логи

```bash
pm2 logs primecoder-backend --lines 20
```

Должны быть сообщения о запуске без ошибок.

### Шаг 4: Временно разрешить все CORS (если не помогает)

Если после шагов 1-3 проблема остается, временно разрешите все источники:

```bash
cd /var/www/primecoder-gulp/backend
nano app.js
```

Найдите строку 83:
```javascript
app.use(cors({ 
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
```

Замените на:
```javascript
app.use(cors({ 
  origin: '*', // Временно разрешить все
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id']
}));
```

Сохраните (Ctrl+O, Enter, Ctrl+X) и перезапустите:
```bash
pm2 restart all
```

### Шаг 5: Пересобрать фронтенд (после исправления ошибок компиляции)

**Локально:**
```bash
cd frontend
npm install  # если нужно установить зависимости
npm run build
```

**Скопировать на сервер:**
```bash
scp -r dist/* root@85.239.44.40:/var/www/primecoder-gulp/frontend/dist/
```

### Шаг 6: Очистить кеш браузера

- Откройте в режиме инкогнито
- Или Ctrl+Shift+Delete → Очистить все

## Проверка

После всех шагов:
1. Откройте DevTools (F12)
2. Вкладка Network
3. Попробуйте войти
4. Проверьте URL запросов - должны быть на `https://prime-coder.ru/api/...`
5. Проверьте заголовки ответа - должны быть `Access-Control-Allow-Origin: *` (если использовали временное решение)
