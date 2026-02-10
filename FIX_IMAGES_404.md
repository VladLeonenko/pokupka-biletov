# Исправление 404 на загруженные изображения

## 🎯 Проблема

**Симптомы:**
- Изображения загружаются через `/api/images` ✅
- Но на фронте показывают 404 ❌
- Ошибки: `Failed to load resource: 404` для всех новых изображений

**Причина:**
- Файлы сохраняются в `backend/uploads/images/`
- Но не синхронизируются в `frontend/dist/uploads/images/`
- Nginx отдает из `frontend/dist` → 404

## ✅ Решение

### FileSyncService восстановлен

- Автоматически синхронизирует файлы после каждого upload
- `backend/uploads/images/` → `frontend/dist/uploads/images/`

## 🚀 Деплой на сервер

```bash
# 1. Обновить код
cd /var/www/primecoder-gulp
git fetch origin
git checkout feature/safari-auth-fix
git pull origin feature/safari-auth-fix

# 2. Создать директорию для uploads
mkdir -p /var/www/primecoder-gulp/frontend/dist/uploads/images
chown -R www-data:www-data /var/www/primecoder-gulp/frontend/dist/uploads
chmod -R 755 /var/www/primecoder-gulp/frontend/dist/uploads

# 3. Синхронизировать существующие файлы
cd /var/www/primecoder-gulp/backend
npm run sync:uploads

# 4. Перезапустить backend
pm2 restart backend --update-env

# 5. Проверить логи
pm2 logs backend | grep FileSync
# Должно показать: [FileSync] ✅ Synced: filename.png
```

## 🔍 Проверка

```bash
# 1. Проверить что файлы скопированы
ls -la /var/www/primecoder-gulp/frontend/dist/uploads/images/

# 2. Проверить доступность через nginx
curl -I https://prime-coder.ru/uploads/images/новый_файл.png
# Должен вернуть 200 OK

# 3. Проверить в браузере
# Открыть https://prime-coder.ru/uploads/images/новый_файл.png
# Должно показать изображение
```

## 📝 Что происходит

1. **Загрузка через `/api/images`:**
   - Multer сохраняет в `backend/uploads/images/` ✅
   - FileSyncService автоматически копирует в `frontend/dist/uploads/images/` ✅

2. **Nginx отдает:**
   - `root /var/www/primecoder-gulp/frontend/dist;`
   - Запрос `/uploads/images/file.png` → `frontend/dist/uploads/images/file.png` → **200 OK** ✅

## ⚠️ Если все еще 404

1. **Проверить что FileSyncService работает:**
   ```bash
   pm2 logs backend | grep "FileSync"
   # Должны быть логи: [FileSync] ✅ Synced: ...
   ```

2. **Проверить права:**
   ```bash
   ls -la /var/www/primecoder-gulp/frontend/dist/uploads/images/
   # Должно быть www-data:www-data
   ```

3. **Проверить nginx конфиг:**
   ```bash
   cat /etc/nginx/sites-available/prime-coder.ru | grep root
   # Должно быть: root /var/www/primecoder-gulp/frontend/dist;
   ```

4. **Перезагрузить nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## 🎯 Результат

После деплоя:
- ✅ Новые изображения автоматически синхронизируются
- ✅ Nginx отдает файлы (200 OK)
- ✅ Нет 404 ошибок на фронте
