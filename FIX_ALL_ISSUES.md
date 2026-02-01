# Исправление всех проблем

## Проблема 1: CORS ошибки

**Ошибка:** `Fetch API cannot load https://prime-coder.ru/api/public/cart due to access control checks`

**Решение на сервере:**

1. Проверить/обновить `.env` файл в `/var/www/primecoder-gulp/backend/.env`:

```bash
cd /var/www/primecoder-gulp/backend
nano .env
```

Добавить/изменить:
```env
CORS_ORIGIN=https://prime-coder.ru,https://www.prime-coder.ru,http://localhost:5173
```

2. Перезапустить бэкенд:
```bash
pm2 restart primecoder-backend
# или
pm2 restart all
```

## Проблема 2: Изображения 404

**Ошибка:** `Failed to load resource: the server responded with a status of 404 () (vLHbbkUdFTBJoQmRPn033-1-1769888421725.png)`

**Причина:** Файлы загружаются, но не доступны через веб-сервер.

**Решение:**

1. Проверить, что папка `uploads` существует и доступна:
```bash
cd /var/www/primecoder-gulp/backend
ls -la uploads/images/
```

2. Проверить права доступа:
```bash
chmod -R 755 uploads/
chown -R www-data:www-data uploads/
```

3. Проверить конфигурацию Nginx для `/uploads/`:
```bash
sudo grep -A 5 "location /uploads" /etc/nginx/sites-available/prime-coder.ru
```

Должно быть:
```nginx
location /uploads/ {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Или напрямую:
```nginx
location /uploads/ {
    alias /var/www/primecoder-gulp/backend/uploads/;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Проблема 3: Page Builder не виден

**Решение:**

1. **Убрать ограничение `disabled={isNew}`** - уже исправлено в коде

2. **Задеплоить обновленные файлы на сервер:**

```bash
# Локально - собрать фронтенд
cd frontend
npm run build

# Скопировать на сервер
scp -r dist/* root@85.239.44.40:/var/www/primecoder-gulp/frontend/dist/

# Или через git (если используете)
ssh root@85.239.44.40
cd /var/www/primecoder-gulp
git pull origin main
cd frontend
npm install
npm run build
```

3. **Проверить, что файлы обновились:**
```bash
# На сервере
ls -la /var/www/primecoder-gulp/frontend/dist/
# Должны быть свежие файлы с сегодняшней датой
```

4. **Очистить кеш браузера:**
- Ctrl+Shift+R (Windows/Linux)
- Cmd+Shift+R (Mac)

## Проблема 4: 413 ошибка (если все еще есть)

Если Nginx настроен правильно, но ошибка остается:

1. Проверить, что запрос доходит до бэкенда:
```bash
# На сервере - проверить логи
pm2 logs primecoder-backend --lines 50 | grep -i "413\|image\|upload"
```

2. Проверить лимит в Express:
```bash
# В backend/app.js должно быть:
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
```

3. Проверить лимит в Multer (уже 50MB в routes/images.js)

## Быстрая проверка всех исправлений

После всех изменений:

1. **CORS:** Откройте консоль браузера - не должно быть CORS ошибок
2. **Изображения:** Попробуйте загрузить изображение - должно работать
3. **Page Builder:** Откройте любую статью (новую или существующую) - должна быть кнопка "Page Builder"
4. **413:** Загрузите изображение 1-2 MB - не должно быть ошибки 413

## Полный деплой на сервер

Если нужно задеплоить все изменения:

```bash
# 1. Локально - собрать фронтенд
cd frontend
npm run build

# 2. Скопировать на сервер
scp -r dist/* root@85.239.44.40:/var/www/primecoder-gulp/frontend/dist/

# 3. На сервере - обновить бэкенд
ssh root@85.239.44.40
cd /var/www/primecoder-gulp/backend

# Обновить .env для CORS
nano .env
# Добавить: CORS_ORIGIN=https://prime-coder.ru,https://www.prime-coder.ru

# Перезапустить
pm2 restart all

# 4. Проверить права на uploads
chmod -R 755 uploads/
chown -R www-data:www-data uploads/
```
