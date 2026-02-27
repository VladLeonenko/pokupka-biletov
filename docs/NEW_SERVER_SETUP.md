# Развёртывание на новом пустом сервере

## Текущий сервер

- **IP:** 31.31.196.77
- **Логин:** u3396604
- **Корень сайта:** /www/prime-coder.ru/

## Подготовка

1. **Имейте доступ по SSH** — `ssh u3396604@31.31.196.77`
2. **Репозиторий** — GitHub: `https://github.com/VladLeonenko/primecoder-gulp`
3. **Домен** указывает на IP сервера (A-запись).

---

## Вариант A: Полная автоматическая настройка

Скопируйте скрипт на сервер и выполните:

```bash
# С вашего локального компьютера
scp scripts/setup-new-server.sh u3396604@31.31.196.77:~/
ssh u3396604@31.31.196.77 "chmod +x ~/setup-new-server.sh && ~/setup-new-server.sh"
```

Скрипт установит: Node.js 20, Git, nginx, PostgreSQL, PM2, клонирует репозиторий.

---

## Вариант B: Ручная установка

### 1. Подключение и базовая установка

```bash
ssh u3396604@31.31.196.77

# Обновление и необходимые пакеты
apt update && apt upgrade -y
apt install -y curl git nginx postgresql postgresql-contrib certbot python3-certbot-nginx

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PM2
npm install -g pm2
```

### 2. Клонирование проекта

```bash
cd /www
git clone https://github.com/VladLeonenko/primecoder-gulp.git prime-coder.ru
cd prime-coder.ru
```

Если репозиторий приватный — настройте SSH-ключ или используйте Personal Access Token в URL:
`https://TOKEN@github.com/VladLeonenko/primecoder-gulp.git`

### 3. База данных PostgreSQL

```bash
sudo -u postgres psql
```

В psql:

```sql
CREATE USER primecoder WITH PASSWORD 'ваш_надёжный_пароль';
CREATE DATABASE primecoder_prod OWNER primecoder;
\q
```

### 4. Файл backend/.env

```bash
nano /www/prime-coder.ru/backend/.env
```

Минимальный набор:

```env
NODE_ENV=production
PORT=3000

PGUSER=primecoder
PGHOST=localhost
PGDATABASE=primecoder_prod
PGPASSWORD=ваш_надёжный_пароль
PGPORT=5432

JWT_SECRET=длинная_случайная_строка_минимум_32_символа
CORS_ORIGIN=https://prime-coder.ru
SITE_URL=https://prime-coder.ru
API_INTERNAL_URL=http://127.0.0.1:3000
```

Скопируйте остальные переменные со старого сервера (если есть): `OPENAI_API_KEY`, `EMAIL_*`, и т.д.

### 5. PM2 ecosystem

Файл `backend/ecosystem.config.cjs` уже создаётся скриптом setup-new-server.sh. Или создайте вручную:

```javascript
module.exports = {
  apps: [{
    name: 'primecoder-backend',
    script: './app.js',
    cwd: '/www/prime-coder.ru/backend',
    instances: 1,
    env: { NODE_ENV: 'production', PORT: 3000 },
    autorestart: true,
    max_memory_restart: '1G',
  }],
};
```

### 6. Nginx

Создайте `/etc/nginx/sites-available/primecoder` (см. DEPLOYMENT.md для полной конфигурации с SSL).

Базовый блок:

```nginx
server {
    listen 80;
    server_name prime-coder.ru www.prime-coder.ru;
    root /www/prime-coder.ru/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3000;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/primecoder /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 7. Первый деплой

```bash
cd /www/prime-coder.ru
./scripts/deploy-via-git.sh main
```

Скрипт: `git pull`, `npm ci`, `npm run build` во frontend, миграции, `pm2 restart`.

### 8. PM2 автозапуск

```bash
pm2 save
pm2 startup
```

### 9. SSL (Let's Encrypt)

После того как DNS указывает на сервер:

```bash
certbot --nginx -d prime-coder.ru -d www.prime-coder.ru
```

---

## Перенос данных со старого сервера

### База данных

```bash
# На старом сервере
ssh root@85.239.44.40 "pg_dump -U primecoder primecoder_prod | gzip" > backup.sql.gz
scp backup.sql.gz u3396604@31.31.196.77:/tmp/

# На новом сервере
ssh u3396604@31.31.196.77 "gunzip -c /tmp/backup.sql.gz | psql -U primecoder -d primecoder_prod"
```

### uploads и .env

```bash
# Со старого
scp -r root@85.239.44.40:/var/www/primecoder-gulp/backend/uploads u3396604@31.31.196.77:/www/prime-coder.ru/backend/
scp root@85.239.44.40:/var/www/primecoder-gulp/backend/.env u3396604@31.31.196.77:/www/prime-coder.ru/backend/
```

---

## Обновление deploy-commands

После переноса замените IP в `.cursor/rules/deploy-commands.mdc`:

```
ssh u3396604@31.31.196.77 "cd /www/prime-coder.ru && ./scripts/deploy-via-git.sh main"
```
