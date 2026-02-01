# Исправление ошибки 413 при загрузке изображений

## Проблема
Ошибка `413 Payload Too Large` при загрузке изображений в продукты. Nginx блокирует запросы размером больше установленного лимита.

## Решение

### 1. Обновить конфигурацию Nginx на сервере

```bash
# Подключиться к серверу
ssh user@prime-coder.ru

# Отредактировать конфигурацию Nginx
sudo nano /etc/nginx/sites-available/prime-coder.ru
# или если используется общий конфиг:
sudo nano /etc/nginx/nginx.conf
```

### 2. Найти блок `server` или `http` и добавить/изменить:

```nginx
http {
    # ... другие настройки ...
    
    # Увеличить лимит размера тела запроса до 50MB
    client_max_body_size 50M;
    
    # Также можно добавить таймауты для больших файлов
    client_body_timeout 300s;
    client_header_timeout 300s;
    
    server {
        # ... настройки сервера ...
        
        # Можно также установить локально для этого сервера
        client_max_body_size 50M;
        
        location /api/images {
            # Увеличить лимит специально для загрузки изображений
            client_max_body_size 50M;
            client_body_timeout 300s;
            
            proxy_pass http://localhost:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Увеличить таймауты для прокси
            proxy_connect_timeout 300s;
            proxy_send_timeout 300s;
            proxy_read_timeout 300s;
        }
    }
}
```

### 3. Проверить конфигурацию и перезагрузить Nginx

```bash
# Проверить синтаксис конфигурации
sudo nginx -t

# Если проверка прошла успешно, перезагрузить Nginx
sudo systemctl reload nginx
# или
sudo service nginx reload
```

### 4. Проверить текущие настройки

```bash
# Проверить текущий лимит
sudo nginx -T 2>/dev/null | grep client_max_body_size

# Проверить логи Nginx на наличие ошибок 413
sudo tail -f /var/log/nginx/error.log | grep 413
```

### 5. Проверить настройки бэкенда (уже настроено)

- `backend/routes/images.js` - лимит Multer: **50MB** ✅
- `backend/app.js` - лимит express.json: **50mb** ✅

### 6. Тестирование

После обновления конфигурации:

1. Попробовать загрузить изображение в продукт
2. Проверить логи:
   ```bash
   # Логи Nginx
   sudo tail -f /var/log/nginx/error.log
   
   # Логи бэкенда
   pm2 logs primecoder-backend --lines 50
   ```

### Альтернативное решение (если не помогает)

Если проблема сохраняется, можно также проверить:

1. **Лимиты системы:**
   ```bash
   # Проверить лимиты процесса nginx
   cat /proc/$(pgrep nginx | head -1)/limits | grep filesize
   ```

2. **Лимиты в systemd (если Nginx запущен через systemd):**
   ```bash
   sudo systemctl edit nginx
   # Добавить:
   [Service]
   LimitRequestBody=52428800  # 50MB в байтах
   ```

3. **Проверить другие прокси/балансировщики:**
   Если перед Nginx есть Cloudflare или другой прокси, нужно проверить их настройки тоже.

## Проверка после исправления

```bash
# Проверить, что лимит установлен
curl -I -X POST https://prime-coder.ru/api/images

# Попробовать загрузить тестовое изображение
curl -X POST https://prime-coder.ru/api/images \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@test-image.jpg"
```

## Примечания

- Размер файла в запросе: **1,487,677 байт** (~1.4 MB)
- Текущий лимит в Multer: **50MB**
- Рекомендуемый лимит в Nginx: **50M** (должен быть >= лимита Multer)
