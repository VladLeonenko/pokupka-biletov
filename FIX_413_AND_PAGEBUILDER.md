# Исправление ошибки 413 и активация Page Builder

## Проблема 1: Ошибка 413 при загрузке изображений

Ошибка возникает из-за того, что Nginx на сервере блокирует запросы размером больше установленного лимита (по умолчанию 1MB).

### Решение на сервере:

**Вариант 1: Автоматическое исправление (рекомендуется)**

```bash
# Подключиться к серверу
ssh user@prime-coder.ru

# Перейти в директорию проекта
cd /var/www/primecoder-gulp/backend

# Запустить скрипт обновления
sudo bash UPDATE_NGINX_413.sh
```

**Вариант 2: Ручное исправление**

```bash
# Подключиться к серверу
ssh user@prime-coder.ru

# Отредактировать конфигурацию Nginx
sudo nano /etc/nginx/sites-available/prime-coder.ru
# или
sudo nano /etc/nginx/nginx.conf
```

Найти блок `http {` и добавить/изменить:
```nginx
http {
    client_max_body_size 50M;
    client_body_timeout 300s;
    
    # ... остальные настройки ...
    
    server {
        # ... настройки сервера ...
        
        location /api/images {
            client_max_body_size 50M;
            client_body_timeout 300s;
            proxy_pass http://localhost:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 300s;
            proxy_send_timeout 300s;
            proxy_read_timeout 300s;
        }
    }
}
```

Проверить и перезагрузить:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Проблема 2: Page Builder не виден

Page Builder нужно пересобрать и задеплоить на сервер.

### Решение:

**1. Локально (для проверки):**

```bash
cd frontend
npm run build
```

**2. На сервере (деплой):**

```bash
# Подключиться к серверу
ssh user@prime-coder.ru

# Перейти в директорию проекта
cd /var/www/primecoder-gulp

# Обновить код (если используете git)
git pull origin main

# Пересобрать фронтенд
cd frontend
npm install  # если нужно обновить зависимости
npm run build

# Перезапустить фронтенд (если используете PM2 или другой процесс-менеджер)
# Или просто скопировать build в нужную директорию
```

**3. Проверка:**

После деплоя:
1. Откройте любую статью/страницу/кейс/продукт в редакторе
2. Должна появиться кнопка "Page Builder"
3. Нажмите на неё - должен открыться Page Builder

**Если кнопка не появляется:**

1. Проверьте консоль браузера на ошибки (F12)
2. Проверьте, что роуты правильно зарегистрированы в `AppRoutes.tsx`
3. Убедитесь, что компоненты экспортированы правильно
4. Очистите кеш браузера (Ctrl+Shift+R или Cmd+Shift+R)

## Быстрая проверка после исправлений

1. **Проверка 413:**
   - Попробуйте загрузить изображение размером 1-2 MB
   - Должно работать без ошибки 413

2. **Проверка Page Builder:**
   - Откройте `/admin/blog/любая-статья`
   - Должна быть кнопка "Page Builder"
   - При клике должен открыться Page Builder

## Если проблемы остаются

**Для 413:**
```bash
# Проверить логи Nginx
sudo tail -f /var/log/nginx/error.log

# Проверить текущий лимит
sudo nginx -T 2>/dev/null | grep client_max_body_size
```

**Для Page Builder:**
```bash
# Проверить логи фронтенда
pm2 logs primecoder-frontend --lines 50

# Проверить, что файлы собраны
ls -la /var/www/primecoder-gulp/frontend/dist/
```
