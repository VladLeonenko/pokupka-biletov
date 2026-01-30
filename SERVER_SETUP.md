# 🖥️ Настройка сервера для prime-coder.ru

## Информация о сервере
- **IP:** 85.239.44.40
- **Домен:** prime-coder.ru
- **SSH:** `ssh root@85.239.44.40`

---

## 1. Подключение к серверу

```bash
ssh root@85.239.44.40
```

---

## 2. Базовая настройка сервера

### Обновление системы
```bash
apt update && apt upgrade -y
```

### Установка необходимых пакетов
```bash
apt install -y curl wget git build-essential nginx postgresql postgresql-contrib certbot python3-certbot-nginx ufw
```

### Установка Node.js (LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt install -y nodejs
node --version  # Проверка версии
npm --version
```

### Установка PM2
```bash
npm install -g pm2
pm2 startup  # Настройка автозапуска
```

---

## 3. Настройка базы данных PostgreSQL

### Создание базы данных и пользователя
```bash
sudo -u postgres psql

# В psql:
CREATE DATABASE primecoder_prod;
CREATE USER primecoder_user WITH PASSWORD 'ВАШ_СИЛЬНЫЙ_ПАРОЛЬ';
GRANT ALL PRIVILEGES ON DATABASE primecoder_prod TO primecoder_user;
\q  # Выход из psql
```

**💡 Полезные команды для работы с psql:**

- `\q` или `\quit` или `exit` - выйти из psql
- `\l` - показать все базы данных
- `\c database_name` - подключиться к базе данных
- `\dt` - показать все таблицы в текущей базе
- `\du` - показать всех пользователей
- `\?` - показать справку по командам psql
- `\h` - показать справку по SQL командам
- `Ctrl+D` - альтернативный способ выхода

### Настройка PostgreSQL для удаленного доступа (если нужно)

> **Важно:** По умолчанию PostgreSQL слушает только localhost (127.0.0.1), что безопасно для production. Если ваш backend работает на том же сервере, удаленный доступ не нужен. Настройте удаленный доступ только если:
> - Backend работает на другом сервере
> - Нужен доступ из внешних инструментов (pgAdmin, DBeaver и т.д.)

#### Шаг 1: Определение версии PostgreSQL и пути к конфигурации

Сначала узнайте версию PostgreSQL:
```bash
sudo -u postgres psql -c "SELECT version();"
```

Или найдите путь к конфигурационным файлам:
```bash
# Найти путь к postgresql.conf
sudo find /etc -name "postgresql.conf" 2>/dev/null

# Или используйте psql
sudo -u postgres psql -c "SHOW config_file;"
```

Обычно файлы находятся в:
- `/etc/postgresql/14/main/` (для PostgreSQL 14)
- `/etc/postgresql/15/main/` (для PostgreSQL 15)
- `/etc/postgresql/16/main/` (для PostgreSQL 16)

#### Шаг 2: Настройка postgresql.conf

Откройте файл конфигурации:
```bash
# Замените * на вашу версию PostgreSQL (например, 14, 15, 16)
sudo nano /etc/postgresql/*/main/postgresql.conf
```

Найдите строку (обычно около строки 59):
```
#listen_addresses = 'localhost'
```

Раскомментируйте и измените на:
```
listen_addresses = 'localhost'          # Только localhost (безопасно)
# или
listen_addresses = '*'                  # Все интерфейсы (менее безопасно)
```

**Рекомендации:**
- Для production используйте `'localhost'` если backend на том же сервере
- Используйте `'*'` только если нужен доступ с других серверов
- Можно указать конкретные IP: `listen_addresses = 'localhost,192.168.1.100'`

**💡 Как работать с nano:**
- `Ctrl+O` - сохранить файл (Write Out)
- `Enter` - подтвердить имя файла
- `Ctrl+X` - выйти из nano
- `Ctrl+K` - вырезать строку
- `Ctrl+U` - вставить строку
- `Ctrl+W` - поиск
- `Ctrl+\` - поиск и замена

#### Шаг 3: Настройка pg_hba.conf (Host-Based Authentication)

Откройте файл аутентификации:
```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

В конце файла добавьте строки для разрешения подключений. Структура строки:
```
TYPE  DATABASE  USER  ADDRESS  METHOD
```

**Вариант 1: Только localhost (рекомендуется для production)**
```
# Разрешить подключение с localhost для всех баз данных и пользователей
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

**Вариант 2: Специфичный пользователь и база данных (более безопасно)**
```
# Разрешить подключение только для конкретного пользователя и базы
host    primecoder_prod    primecoder_user    127.0.0.1/32    md5
```

**Вариант 3: Доступ с конкретного IP (если backend на другом сервере)**
```
# Разрешить подключение с конкретного IP адреса
host    primecoder_prod    primecoder_user    192.168.1.100/32    md5
```

**Вариант 4: Доступ с подсети (менее безопасно)**
```
# Разрешить подключение со всей подсети
host    primecoder_prod    primecoder_user    192.168.1.0/24    md5
```

**Методы аутентификации:**
- `md5` - пароль в MD5 (рекомендуется)
- `scram-sha-256` - более безопасный метод (PostgreSQL 10+)
- `trust` - без пароля (только для localhost в dev)
- `reject` - запретить подключение

**Пример полного блока в pg_hba.conf:**
```
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# "local" is for Unix domain socket connections only
local   all             all                                     peer

# IPv4 local connections:
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5

# Разрешить подключение для приложения
host    primecoder_prod    primecoder_user    127.0.0.1/32    md5
```

**💡 Сохранение и выход из nano:**
- `Ctrl+O` - сохранить (Write Out)
- `Enter` - подтвердить
- `Ctrl+X` - выйти

**💡 Если используете vim вместо nano:**
- `Esc` - выйти из режима редактирования
- `:w` - сохранить (write)
- `:q` - выйти (quit)
- `:wq` - сохранить и выйти
- `:q!` - выйти без сохранения

#### Шаг 4: Перезапуск PostgreSQL

Примените изменения:
```bash
sudo systemctl restart postgresql
```

Проверьте статус:
```bash
sudo systemctl status postgresql
```

#### Шаг 5: Проверка подключения

**Проверка с localhost:**
```bash
# Проверка подключения
psql -h localhost -U primecoder_user -d primecoder_prod

# Или с указанием пароля через переменную окружения
PGPASSWORD='ВАШ_ПАРОЛЬ' psql -h localhost -U primecoder_user -d primecoder_prod -c "SELECT 1;"
```

**Проверка что PostgreSQL слушает правильный адрес:**
```bash
sudo netstat -tlnp | grep postgres
# или
sudo ss -tlnp | grep postgres
```

**Возможные результаты:**

✅ **Правильный результат (слушает localhost) - ИДЕАЛЬНО ДЛЯ PRODUCTION:**

Пример вывода через `ss`:
```
LISTEN 0      200        127.0.0.1:5432       0.0.0.0:*    users:(("postgres",pid=8778,fd=7))
LISTEN 0      200            [::1]:5432          [::]:*    users:(("postgres",pid=8778,fd=6))
```

Или через `netstat`:
```
tcp  0  0  127.0.0.1:5432  0.0.0.0:*  LISTEN  12345/postgres
tcp6 0  0  ::1:5432        :::*       LISTEN  12345/postgres
```

**Что это означает:**
- ✅ `127.0.0.1:5432` - PostgreSQL слушает на IPv4 localhost (безопасно)
- ✅ `[::1]:5432` или `::1:5432` - PostgreSQL слушает на IPv6 localhost (безопасно)
- ✅ PostgreSQL доступен только с самого сервера (localhost)
- ✅ Недоступен извне (безопасная конфигурация для production)

**Это правильная настройка!** Если ваш backend работает на том же сервере, это именно то, что нужно.

✅ **Если слушает на всех интерфейсах:**
```
tcp  0  0  0.0.0.0:5432  0.0.0.0:*  LISTEN  12345/postgres
tcp  0  0  :::5432       :::*        LISTEN  12345/postgres
```
Это означает что PostgreSQL доступен со всех сетевых интерфейсов (если настроено `listen_addresses = '*'`).

❌ **Если ничего не выводится:**
- PostgreSQL может быть не запущен: `sudo systemctl status postgresql`
- Или используется другой порт: проверьте `postgresql.conf` → `port = 5432`
- Или PostgreSQL запущен от другого пользователя: `sudo ps aux | grep postgres`

**Альтернативные способы проверки:**

```bash
# Проверка через systemctl
sudo systemctl status postgresql

# Проверка процесса PostgreSQL
sudo ps aux | grep postgres

# Проверка порта напрямую
sudo lsof -i :5432

# Или через netstat без grep
sudo netstat -tlnp | grep 5432

# Проверка через psql (самый надежный способ)
sudo -u postgres psql -c "SHOW listen_addresses;"
```

**Если PostgreSQL не слушает на нужном адресе:**

1. Проверьте конфигурацию:
```bash
sudo grep listen_addresses /etc/postgresql/*/main/postgresql.conf
```

2. Убедитесь что значение правильное:
```bash
# Должно быть (для localhost):
listen_addresses = 'localhost'

# Или (для всех интерфейсов):
listen_addresses = '*'
```

3. Перезапустите PostgreSQL:
```bash
sudo systemctl restart postgresql
```

4. Проверьте логи на ошибки:
```bash
sudo tail -50 /var/log/postgresql/postgresql-*-main.log
```

#### Шаг 6: Настройка firewall (если нужен внешний доступ)

Если вы настроили `listen_addresses = '*'` и нужен доступ извне:
```bash
# Разрешить PostgreSQL порт (5432) только с конкретного IP
sudo ufw allow from 192.168.1.100 to any port 5432

# Или разрешить со всей подсети (менее безопасно)
sudo ufw allow from 192.168.1.0/24 to any port 5432
```

**⚠️ ВАЖНО:** Не открывайте порт 5432 для всех (`ufw allow 5432/tcp`) без крайней необходимости!

#### Troubleshooting

**Проблема: "connection refused"**
```bash
# Проверьте что PostgreSQL запущен
sudo systemctl status postgresql

# Проверьте listen_addresses
sudo grep listen_addresses /etc/postgresql/*/main/postgresql.conf

# Проверьте логи
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

**Проблема: "password authentication failed"**
```bash
# Проверьте пароль пользователя
sudo -u postgres psql -c "\du"

# Сбросьте пароль если нужно
sudo -u postgres psql -c "ALTER USER primecoder_user WITH PASSWORD 'НОВЫЙ_ПАРОЛЬ';"
```

**Проблема: "no pg_hba.conf entry"**
- Проверьте что добавили правильную строку в pg_hba.conf
- Убедитесь что перезапустили PostgreSQL после изменений
- Проверьте синтаксис строки в pg_hba.conf (пробелы важны!)

---

## 4. Настройка Firewall (UFW)

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
ufw status
```

---

## 5. Клонирование проекта

```bash
cd /var/www
git clone <URL_ВАШЕГО_РЕПОЗИТОРИЯ> primecoder-gulp
cd primecoder-gulp
```

Или загрузите файлы через SCP:

**Способ 1: Найти путь к папке**

Сначала найдите где находится ваша папка `primecoder-gulp`:

```bash
# Если папка в Downloads (Загрузки):
cd ~/Downloads
ls -la | grep primecoder

# Если папка на Desktop (Рабочий стол):
cd ~/Desktop
ls -la | grep primecoder

# Или используйте полный путь:
# Для Downloads:
/Users/ваше_имя_пользователя/Downloads/primecoder-gulp

# Для Desktop:
/Users/ваше_имя_пользователя/Desktop/primecoder-gulp
```

**Способ 2: Загрузка через SCP**

После того как нашли путь, выполните (с локальной машины - Mac):

```bash
# Если папка в Downloads:
scp -r ~/Downloads/primecoder-gulp root@85.239.44.40:/var/www/

# Если папка на Desktop:
scp -r ~/Desktop/primecoder-gulp root@85.239.44.40:/var/www/

# Если папка в другом месте, укажите полный путь:
scp -r /Users/ваше_имя/путь/к/primecoder-gulp root@85.239.44.40:/var/www/

# Пример с полным путем (замените на свой):
scp -r "/Users/vladislavleonenko/Downloads/primecoder-gulp" root@85.239.44.40:/var/www/
```

**💡 Полезные команды для поиска папки:**

```bash
# Найти папку primecoder-gulp в домашней директории
find ~ -name "primecoder-gulp" -type d 2>/dev/null

# Показать текущую директорию
pwd

# Перейти в папку и показать путь
cd ~/Downloads/primecoder-gulp
pwd
```

**⚠️ Важно:**
- Используйте кавычки если в пути есть пробелы: `"/Users/name/My Documents/primecoder-gulp"`
- Команда `scp` выполняется с вашего Mac, а не с сервера
- Убедитесь что вы в правильной директории или используйте полный путь

**Примеры команд для вашего случая:**

```bash
# Если папка в Downloads (Загрузки):
scp -r ~/Downloads/primecoder-gulp root@85.239.44.40:/var/www/

# Если папка на Desktop (как в вашем случае):
scp -r "/Users/vladislavleonenko/Library/Mobile Documents/com~apple~CloudDocs/Desktop/primecoder-gulp" root@85.239.44.40:/var/www/

# Или если скопировали в Downloads:
scp -r ~/Downloads/primecoder-gulp root@85.239.44.40:/var/www/
```

**💡 Быстрый способ - перейти в папку и использовать относительный путь:**

```bash
# Перейти в папку primecoder-gulp
cd ~/Downloads/primecoder-gulp
# или
cd "/Users/vladislavleonenko/Library/Mobile Documents/com~apple~CloudDocs/Desktop/primecoder-gulp"

# Затем загрузить (из папки primecoder-gulp):
scp -r . root@85.239.44.40:/var/www/primecoder-gulp

# Или загрузить родительскую папку:
cd ..
scp -r primecoder-gulp root@85.239.44.40:/var/www/
```

---

## 6. Настройка Backend

### Установка зависимостей
```bash
cd /var/www/primecoder-gulp/backend
npm ci --production
```

### Создание .env файла
```bash
nano .env
```

Содержимое `.env`:
```env
NODE_ENV=production
PORT=3000
SITE_URL=https://prime-coder.ru
CORS_ORIGIN=https://prime-coder.ru,https://www.prime-coder.ru

# База данных
DATABASE_URL=postgresql://primecoder_user:ВАШ_ПАРОЛЬ@localhost:5432/primecoder_prod

# JWT
JWT_SECRET=ВАШ_ОЧЕНЬ_ДЛИННЫЙ_СЛУЧАЙНЫЙ_СЕКРЕТНЫЙ_КЛЮЧ

# OpenAI (если используется)
OPENAI_API_KEY=sk-...

# Email (если используется)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
AUTH_RATE_LIMIT_MAX=5
```

### Выполнение миграций
```bash
npm run migrate
```

### Создание PM2 конфигурации
```bash
nano ecosystem.config.cjs
```

Содержимое `ecosystem.config.cjs`:
```javascript
module.exports = {
  apps: [{
    name: 'primecoder-backend',
    script: './app.js',
    cwd: '/var/www/primecoder-gulp/backend',
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

### Создание директории для логов
```bash
mkdir -p /var/log/primecoder
```

### Запуск приложения
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 status
```

---

## 7. Настройка Frontend

### Сборка production версии
```bash
cd /var/www/primecoder-gulp/frontend
npm ci
npm run build
```

### Проверка прав доступа
```bash
chown -R www-data:www-data /var/www/primecoder-gulp/frontend/dist
chmod -R 755 /var/www/primecoder-gulp/frontend/dist
```

---

## 8. Настройка Nginx

### Создание конфигурации
```bash
nano /etc/nginx/sites-available/prime-coder
```

Содержимое конфигурации:
```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name prime-coder.ru www.prime-coder.ru;
    
    # Для Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://prime-coder.ru$request_uri;
    }
}

# Redirect www to non-www
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.prime-coder.ru;
    
    ssl_certificate /etc/letsencrypt/live/prime-coder.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/prime-coder.ru/privkey.pem;
    
    return 301 https://prime-coder.ru$request_uri;
}

# Main server block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name prime-coder.ru;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/prime-coder.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/prime-coder.ru/privkey.pem;
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
    access_log /var/log/nginx/prime-coder_access.log;
    error_log /var/log/nginx/prime-coder_error.log;

    # Root directory
    root /var/www/primecoder-gulp/frontend/dist;
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

    # Sitemap
    location = /sitemap.xml {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }

    # Robots.txt
    location = /robots.txt {
        try_files $uri =404;
    }

    # SPA fallback - все остальные запросы на index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Активация конфигурации
```bash
ln -s /etc/nginx/sites-available/prime-coder /etc/nginx/sites-enabled/
nginx -t  # Проверка конфигурации
```

---

## 9. Настройка SSL сертификата (Let's Encrypt)

### Получение сертификата
```bash
certbot --nginx -d prime-coder.ru -d www.prime-coder.ru
```

Следуйте инструкциям:
- Введите email
- Согласитесь с условиями
- Выберите редирект HTTP на HTTPS

### Автоматическое обновление
```bash
certbot renew --dry-run  # Тест
```

Сертификат будет автоматически обновляться через cron.

---

## 10. Запуск Nginx

```bash
systemctl restart nginx
systemctl status nginx
```

---

## 11. Настройка DNS

В панели управления доменом добавьте A-записи:
```
prime-coder.ru     A    85.239.44.40
www.prime-coder.ru A    85.239.44.40
```

---

## 12. Проверка работы

### Проверка backend
```bash
curl http://localhost:3000/api/public/pages
pm2 logs primecoder-backend
```

### Проверка frontend
```bash
curl https://prime-coder.ru
```

### Проверка SSL
```bash
openssl s_client -connect prime-coder.ru:443
```

---

## 13. Настройка бэкапов

### Создание скрипта бэкапа
```bash
nano /usr/local/bin/backup-primecoder.sh
```

Содержимое:
```bash
#!/bin/bash
BACKUP_DIR="/backups/primecoder"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="primecoder_prod"
DB_USER="primecoder_user"

mkdir -p $BACKUP_DIR

# Backup database
PGPASSWORD=ВАШ_ПАРОЛЬ pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/primecoder-gulp/backend/uploads

# Keep only last 30 days
find $BACKUP_DIR -mtime +30 -delete

echo "Backup completed: $DATE"
```

```bash
chmod +x /usr/local/bin/backup-primecoder.sh
```

### Настройка cron для бэкапов
```bash
crontab -e
```

Добавить:
```
# Ежедневный бэкап в 3:00
0 3 * * * /usr/local/bin/backup-primecoder.sh
```

---

## 14. Мониторинг

### PM2 мониторинг
```bash
pm2 monit
pm2 logs
```

### Логи Nginx
```bash
tail -f /var/log/nginx/prime-coder_access.log
tail -f /var/log/nginx/prime-coder_error.log
```

---

## 15. Обновление сайта

### Обновление кода
```bash
cd /var/www/primecoder-gulp
git pull

# Backend
cd backend
npm ci --production
npm run migrate  # Если есть новые миграции
pm2 restart primecoder-backend

# Frontend
cd ../frontend
npm ci
npm run build
chown -R www-data:www-data dist
```

---

## Troubleshooting

### Проблема: 502 Bad Gateway
```bash
# Проверьте что backend запущен
pm2 status
pm2 logs primecoder-backend

# Проверьте что порт 3000 слушается
netstat -tlnp | grep 3000
```

### Проблема: Статические файлы не загружаются
```bash
# Проверьте права доступа
ls -la /var/www/primecoder-gulp/frontend/dist
chown -R www-data:www-data /var/www/primecoder-gulp/frontend/dist
chmod -R 755 /var/www/primecoder-gulp/frontend/dist
```

### Проблема: База данных не подключается
```bash
# Проверьте PostgreSQL
systemctl status postgresql

# Проверьте подключение
psql -U primecoder_user -d primecoder_prod -c "SELECT 1;"

# Проверьте переменные окружения
cat /var/www/primecoder-gulp/backend/.env
```

---

**Готово!** Сайт должен быть доступен по адресу https://prime-coder.ru
