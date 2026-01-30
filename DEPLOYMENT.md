# 🚀 Руководство по деплою PrimeCoder

## Подготовка к production

### 1. Настройка переменных окружения

Создайте файл `backend/.env` с production значениями:

```env
# База данных
DATABASE_URL=postgresql://username:password@localhost:5432/primecoder_prod

# CORS (ваш домен)
CORS_ORIGIN=https://primecoder.ru

# JWT секрет (используйте сложный рандомный ключ)
JWT_SECRET=your-very-long-random-secret-key-here

# OpenAI (если используется)
OPENAI_API_KEY=sk-...

# Email (если используется)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Режим работы
NODE_ENV=production
PORT=3000
```

### 2. Сборка frontend

```bash
cd frontend
npm run build
```

Это создаст production сборку в `frontend/dist/`.

### 3. Настройка базы данных

```bash
cd backend

# Запустите миграции
psql -U username -d primecoder_prod -f migrations/001_initial_schema.sql
psql -U username -d primecoder_prod -f migrations/002_add_blog.sql
# ... запустите все миграции по порядку
```

### 4. Установка зависимостей на сервере

```bash
# Backend зависимости
cd backend
npm ci --production

# Frontend уже собран, дополнительная установка не нужна
```

## Деплой на VPS/dedicated сервер

### Вариант 1: PM2 (рекомендуется)

1. **Установите PM2 глобально:**

```bash
npm install -g pm2
```

2. **Создайте ecosystem файл `backend/ecosystem.config.cjs`:**

```javascript
module.exports = {
  apps: [{
    name: 'primecoder-backend',
    script: './app.js',
    cwd: '/path/to/primecoder-gulp/backend',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/primecoder/error.log',
    out_file: '/var/log/primecoder/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

3. **Запустите приложение:**

```bash
cd backend
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### Вариант 2: Systemd service

1. **Создайте файл `/etc/systemd/system/primecoder.service`:**

```ini
[Unit]
Description=PrimeCoder Backend
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/primecoder-gulp/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node app.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=primecoder

[Install]
WantedBy=multi-user.target
```

2. **Запустите сервис:**

```bash
sudo systemctl enable primecoder
sudo systemctl start primecoder
sudo systemctl status primecoder
```

## Настройка Nginx

### Установка SSL с Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d primecoder.ru -d www.primecoder.ru
```

### Конфигурация Nginx

Создайте файл `/etc/nginx/sites-available/primecoder`:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name primecoder.ru www.primecoder.ru;
    
    return 301 https://primecoder.ru$request_uri;
}

# Redirect www to non-www
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.primecoder.ru;
    
    ssl_certificate /etc/letsencrypt/live/primecoder.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/primecoder.ru/privkey.pem;
    
    return 301 https://primecoder.ru$request_uri;
}

# Main server block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name primecoder.ru;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/primecoder.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/primecoder.ru/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/primecoder_access.log;
    error_log /var/log/nginx/primecoder_error.log;

    # Root directory
    root /path/to/primecoder-gulp/frontend/dist;
    index index.html;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/javascript application/json;

    # Static files
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }

    # Proxy uploads
    location /uploads/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # SPA fallback - все остальные запросы на index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Активируйте конфигурацию:

```bash
sudo ln -s /etc/nginx/sites-available/primecoder /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Деплой на shared hosting

Если у вас нет доступа к серверу и используется shared hosting:

1. **Загрузите файлы:**
   - `frontend/dist/*` → в корень сайта (public_html)
   - `.htaccess` уже включен в `frontend/dist`

2. **Backend на отдельном сервере:**
   - Backend должен быть запущен на VPS
   - Обновите CORS_ORIGIN в .env

## Обновление сайта

### Обновление frontend

```bash
cd frontend
git pull
npm install
npm run build

# Если используется PM2
pm2 restart primecoder-backend
```

### Обновление backend

```bash
cd backend
git pull
npm install

# Если используется PM2
pm2 restart primecoder-backend

# Если используется systemd
sudo systemctl restart primecoder
```

## Резервное копирование

### Автоматический бэкап базы данных

Создайте скрипт `/usr/local/bin/backup-primecoder.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/backups/primecoder"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="primecoder_prod"
DB_USER="username"

mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /path/to/primecoder-gulp/backend/uploads

# Keep only last 30 days
find $BACKUP_DIR -mtime +30 -delete

echo "Backup completed: $DATE"
```

Добавьте в cron:

```bash
# Ежедневный бэкап в 3:00
0 3 * * * /usr/local/bin/backup-primecoder.sh
```

## Мониторинг

### Проверка статуса

```bash
# PM2
pm2 status
pm2 logs primecoder-backend

# Systemd
sudo systemctl status primecoder
sudo journalctl -u primecoder -f
```

### Мониторинг ресурсов

```bash
# Использование памяти
pm2 monit

# Логи Nginx
tail -f /var/log/nginx/primecoder_access.log
tail -f /var/log/nginx/primecoder_error.log
```

## Troubleshooting

### Проблема: 502 Bad Gateway

```bash
# Проверьте что backend запущен
pm2 status
sudo systemctl status primecoder

# Проверьте логи
pm2 logs primecoder-backend --lines 100
```

### Проблема: Статические файлы не загружаются

```bash
# Проверьте права доступа
chmod -R 755 /path/to/primecoder-gulp/frontend/dist
chown -R www-data:www-data /path/to/primecoder-gulp/frontend/dist

# Проверьте конфигурацию Nginx
sudo nginx -t
```

### Проблема: База данных не подключается

```bash
# Проверьте PostgreSQL
sudo systemctl status postgresql

# Проверьте подключение
psql -U username -d primecoder_prod -c "SELECT 1;"

# Проверьте переменные окружения
cat backend/.env
```

## Оптимизация производительности

### 1. Включите HTTP/2

Уже включено в конфигурации Nginx выше (`http2`).

### 2. Настройте кэширование

```nginx
# В конфигурации Nginx добавьте:
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=primecoder_cache:10m max_size=1g inactive=60m;
proxy_cache_key "$scheme$request_method$host$request_uri";

location /api/public/ {
    proxy_cache primecoder_cache;
    proxy_cache_valid 200 10m;
    # ... остальная proxy конфигурация
}
```

### 3. Настройте CDN (Cloudflare)

1. Добавьте домен в Cloudflare
2. Обновите DNS записи
3. Включите "Auto Minify" для JS/CSS/HTML
4. Включите "Brotli compression"
5. Настройте Page Rules для кэширования статики

## Безопасность

### Регулярные обновления

```bash
# Обновление системных пакетов
sudo apt update && sudo apt upgrade

# Обновление Node.js зависимостей
cd backend && npm audit fix
cd frontend && npm audit fix
```

### Firewall

```bash
# Разрешите только необходимые порты
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable
```

---

**Для дополнительной помощи обращайтесь: info@primecoder.ru**

