# Исправление проблемы с паролем PostgreSQL

## Проблема

Пароль читается правильно из `.env` (20 символов: `primePass_2001-1995!`), но PostgreSQL все равно выдает ошибку `password authentication failed`.

## Решение

### Шаг 1: Проверить текущий пароль пользователя

```bash
sudo -u postgres psql -c "\du primecoder_user"
```

### Шаг 2: Сбросить пароль пользователя

```bash
sudo -u postgres psql << EOF
ALTER USER primecoder_user WITH PASSWORD 'primePass_2001-1995!';
\q
EOF
```

### Шаг 3: Проверить подключение напрямую

```bash
cd /var/www/primecoder-gulp/backend
PGPASSWORD='primePass_2001-1995!' psql -h localhost -U primecoder_user -d primecoder_prod -c "SELECT 1;"
```

Если это работает, значит пароль правильный, но возможно проблема в pg_hba.conf.

### Шаг 4: Проверить pg_hba.conf

```bash
# Найти файл
sudo find /etc -name pg_hba.conf 2>/dev/null

# Посмотреть настройки
sudo cat /etc/postgresql/*/main/pg_hba.conf | grep -v "^#" | grep -v "^$"
```

Должно быть что-то вроде:
```
host    all             all             127.0.0.1/32            md5
```

Если там `ident` или `peer`, нужно изменить на `md5` или `password`.

### Шаг 5: Если нужно изменить pg_hba.conf

```bash
# Сделать backup
sudo cp /etc/postgresql/*/main/pg_hba.conf /etc/postgresql/*/main/pg_hba.conf.backup

# Изменить метод аутентификации для localhost
sudo sed -i 's/host.*all.*all.*127.0.0.1\/32.*ident/host    all             all             127.0.0.1\/32            md5/g' /etc/postgresql/*/main/pg_hba.conf
sudo sed -i 's/host.*all.*all.*127.0.0.1\/32.*peer/host    all             all             127.0.0.1\/32            md5/g' /etc/postgresql/*/main/pg_hba.conf

# Перезагрузить PostgreSQL
sudo systemctl reload postgresql
```

### Шаг 6: Перезапустить backend

```bash
cd /var/www/primecoder-gulp/backend
pm2 restart all --update-env
pm2 logs --lines 20
```

## Быстрое решение (если ничего не помогает)

```bash
# 1. Сбросить пароль
sudo -u postgres psql -c "ALTER USER primecoder_user WITH PASSWORD 'primePass_2001-1995!';"

# 2. Проверить подключение
PGPASSWORD='primePass_2001-1995!' psql -h localhost -U primecoder_user -d primecoder_prod -c "SELECT 1;"

# 3. Если не работает, проверить pg_hba.conf
sudo cat /etc/postgresql/*/main/pg_hba.conf | grep -v "^#" | grep -v "^$" | grep "127.0.0.1"

# 4. Если нужно, изменить на md5 и перезагрузить
sudo systemctl reload postgresql

# 5. Перезапустить backend
pm2 restart all --update-env
```
