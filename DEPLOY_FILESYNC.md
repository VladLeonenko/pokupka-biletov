# Деплой FileSyncService на сервер

## 🚀 Шаги для деплоя

### 1. Обновить код на сервере

```bash
cd /var/www/primecoder-gulp
git pull origin fix/image-upload-display
# или если ветка уже в main:
git pull origin main
```

### 2. Проверить что скрипт появился

```bash
cd backend
npm run
# Должен быть sync:uploads
```

### 3. Создать директорию для uploads

```bash
mkdir -p /var/www/primecoder-gulp/frontend/dist/uploads/images
chown -R www-data:www-data /var/www/primecoder-gulp/frontend/dist/uploads
chmod -R 755 /var/www/primecoder-gulp/frontend/dist/uploads
```

### 4. Синхронизировать существующие файлы

```bash
cd /var/www/primecoder-gulp/backend
npm run sync:uploads
```

### 5. Перезапустить backend

```bash
# Проверить процессы PM2
pm2 list

# Если backend не запущен:
cd /var/www/primecoder-gulp/backend
pm2 start app.js --name backend

# Если запущен:
pm2 restart backend --update-env
```

### 6. Проверить работу

```bash
# Тест загрузки (через админку или curl)
curl -X POST https://prime-coder.ru/api/images \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@test.png"

# Проверить что файл появился
ls -la /var/www/primecoder-gulp/frontend/dist/uploads/images/

# Проверить доступность через nginx
curl -I https://prime-coder.ru/uploads/images/новый_файл.png
```

## 🔍 Диагностика

### Проблема: npm run sync:uploads не найден

**Решение:**
```bash
# 1. Проверить что изменения задеплоены
cd /var/www/primecoder-gulp
git status
git log --oneline -5

# 2. Если изменений нет - обновить
git pull origin main
# или
git pull origin fix/image-upload-display

# 3. Проверить package.json
cat backend/package.json | grep sync:uploads
```

### Проблема: PM2 процесс не найден

**Решение:**
```bash
# Проверить все процессы
pm2 list

# Если backend не запущен:
cd /var/www/primecoder-gulp/backend
pm2 start app.js --name backend --env production

# Или если используется другой процесс:
pm2 start npm --name backend -- run start
```

### Проблема: 404 на /uploads/images/

**Решение:**
1. Проверить что файл скопирован:
   ```bash
   ls -la /var/www/primecoder-gulp/frontend/dist/uploads/images/
   ```

2. Проверить nginx конфиг:
   ```bash
   cat /etc/nginx/sites-available/prime-coder.ru | grep root
   # Должно быть: root /var/www/primecoder-gulp/frontend/dist;
   ```

3. Проверить права:
   ```bash
   ls -la /var/www/primecoder-gulp/frontend/dist/uploads/images/
   # Должно быть www-data:www-data
   ```

4. Перезагрузить nginx:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## ✅ Чеклист

- [ ] Код обновлен (`git pull`)
- [ ] Скрипт `sync:uploads` доступен (`npm run`)
- [ ] Директория создана (`frontend/dist/uploads/images/`)
- [ ] Права установлены (`www-data:www-data`)
- [ ] Существующие файлы синхронизированы (`npm run sync:uploads`)
- [ ] Backend перезапущен (`pm2 restart backend`)
- [ ] Тест загрузки прошел успешно
- [ ] Файл доступен через nginx (200 OK)
