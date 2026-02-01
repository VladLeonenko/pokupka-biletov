# Откат изменений и правильное исправление

## Что было изменено (и нужно откатить):

1. ✅ `frontend/src/utils/apiBase.ts` - откачено к исходному состоянию (пустая строка в production)
2. Нужно проверить `backend/app.js` - убрать `origin: '*'` если было добавлено

## Правильное решение:

### 1. На сервере - проверить .env

```bash
cd /var/www/primecoder-gulp/backend

# Проверить CORS_ORIGIN
cat .env | grep CORS
```

**Должно быть ОДНА строка:**
```env
CORS_ORIGIN=https://prime-coder.ru,https://www.prime-coder.ru
```

**Если есть две строки или неправильная - исправить:**
```bash
# Удалить все строки CORS_ORIGIN
sed -i '/CORS_ORIGIN/d' .env

# Добавить правильную
echo "CORS_ORIGIN=https://prime-coder.ru,https://www.prime-coder.ru" >> .env

# Проверить
cat .env | grep CORS
```

### 2. Проверить backend/app.js

```bash
cd /var/www/primecoder-gulp/backend
grep -n "origin:" app.js
```

**Должно быть:**
```javascript
origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
```

**НЕ должно быть:**
```javascript
origin: '*',
```

Если есть `origin: '*'` - заменить обратно на правильную строку.

### 3. Перезапустить бэкенд

```bash
pm2 restart all --update-env
```

### 4. Пересобрать и задеплоить фронтенд

**Локально:**
```bash
cd frontend
npm run build
scp -r dist/* root@85.239.44.40:/var/www/primecoder-gulp/frontend/dist/
```

### 5. Очистить кеш браузера

Ctrl+Shift+R / Cmd+Shift+R

## Проверка

После всех шагов:
1. Запросы должны идти на относительные пути `/api/...` (не на localhost:3000)
2. CORS должен работать с правильным origin
3. Вход в ЛК должен работать
