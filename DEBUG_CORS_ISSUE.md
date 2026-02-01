# Отладка проблемы CORS и localhost:3000

## Проблемы:
1. CORS ошибки остаются
2. Запросы идут на `localhost:3000` вместо `prime-coder.ru`
3. `pm2 env 0 | grep CORS` ничего не показывает

## Возможные причины:

### 1. CORS_ORIGIN не загружается из .env

**Проверка на сервере:**

```bash
cd /var/www/primecoder-gulp/backend

# Проверить, что CORS_ORIGIN есть в .env
cat .env | grep CORS

# Проверить, что dotenv загружает переменные
node -e "require('dotenv').config(); console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN)"
```

**Если не выводится - проблема в загрузке .env**

### 2. Фронтенд не пересобран

**Проблема:** Изменения в `apiBase.ts` не попали в собранный бандл.

**Решение:**
```bash
# Локально
cd frontend
npm run build

# Скопировать на сервер
scp -r dist/* root@85.239.44.40:/var/www/primecoder-gulp/frontend/dist/
```

### 3. PM2 не обновляет переменные окружения

**Проверка:**
```bash
# Проверить все переменные окружения
pm2 env 0

# Проверить конкретно CORS
pm2 env 0 | grep -i cors

# Если нет - нужно перезапустить правильно
pm2 delete all
cd /var/www/primecoder-gulp/backend
pm2 start app.js --name primecoder-backend -i 2
pm2 save
```

### 4. Кеш браузера

**Очистить полностью:**
- Chrome: Ctrl+Shift+Delete → Очистить кеш
- Или открыть в режиме инкогнито

### 5. Проверить логи бэкенда

```bash
pm2 logs primecoder-backend --lines 100 | grep -i cors
```

## Быстрое решение:

### Шаг 1: Проверить .env на сервере

```bash
cd /var/www/primecoder-gulp/backend
cat .env | grep -i cors
```

Должно быть:
```
CORS_ORIGIN=https://prime-coder.ru,https://www.prime-coder.ru
```

### Шаг 2: Добавить CORS_ORIGIN если его нет

```bash
echo "CORS_ORIGIN=https://prime-coder.ru,https://www.prime-coder.ru" >> .env
```

### Шаг 3: Перезапустить PM2 правильно

```bash
pm2 delete all
cd /var/www/primecoder-gulp/backend
pm2 start app.js --name primecoder-backend -i 2 --update-env
pm2 save
```

### Шаг 4: Пересобрать фронтенд

**Локально:**
```bash
cd frontend
npm run build
scp -r dist/* root@85.239.44.40:/var/www/primecoder-gulp/frontend/dist/
```

### Шаг 5: Проверить в браузере

1. Откройте DevTools (F12)
2. Вкладка Network
3. Попробуйте войти
4. Посмотрите на какой URL идут запросы
5. Проверьте заголовки ответа - должны быть CORS заголовки

## Альтернативное решение (временно):

Если ничего не помогает, можно временно разрешить все источники в коде:

В `backend/app.js` изменить:
```javascript
app.use(cors({ 
  origin: '*', // Временно разрешить все
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id']
}));
```

Затем перезапустить и пересобрать фронтенд.
