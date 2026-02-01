# Полное тестирование проблемы подключения к БД

## Проблема

Ошибка: `password authentication failed for user "primecoder_user"`

Пользователь существует, пароль читается из .env, но подключение не работает.

## Диагностика

### Шаг 1: Запустить скрипт тестирования

```bash
cd /var/www/primecoder-gulp/backend
node scripts/test-db-connection.js
```

Скрипт покажет:
- Что в .env файле
- Какие переменные загружены
- Детальную информацию об ошибке
- Рекомендации по исправлению

### Шаг 2: Проверить подключение напрямую через psql

```bash
cd /var/www/primecoder-gulp/backend

# Прочитать пароль из .env
PASSWORD=$(grep PGPASSWORD .env | cut -d '=' -f2)

# Попробовать подключиться
PGPASSWORD="$PASSWORD" psql -h localhost -U primecoder_user -d primecoder_prod -c "SELECT 1;"
```

Если это работает, проблема в скриптах Node.js.
Если не работает, проблема в PostgreSQL или пароле.

### Шаг 3: Проверить pg_hba.conf

```bash
# Найти файл конфигурации
sudo find /etc -name pg_hba.conf 2>/dev/null

# Посмотреть настройки аутентификации
sudo cat /etc/postgresql/*/main/pg_hba.conf | grep -v "^#" | grep -v "^$"
```

Должно быть что-то вроде:
```
local   all             all                                     peer
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

Если там `ident` или `peer` вместо `md5` или `password`, нужно изменить.

### Шаг 4: Проверить пароль пользователя

```bash
# Подключиться как postgres
sudo -u postgres psql

# Проверить пользователя
\du primecoder_user

# Сбросить пароль (если нужно)
ALTER USER primecoder_user WITH PASSWORD 'primePass_2001-1995!';

# Дать права на базу
GRANT ALL PRIVILEGES ON DATABASE primecoder_prod TO primecoder_user;

\q
```

### Шаг 5: Проверить что пароль правильно читается

```bash
cd /var/www/primecoder-gulp/backend

# Проверить что пароль без лишних символов
node -e "
const dotenv = require('dotenv');
dotenv.config();
const pass = process.env.PGPASSWORD;
console.log('Длина пароля:', pass ? pass.length : 0);
console.log('Пароль (первые 3 и последние 3):', pass ? pass.substring(0,3) + '...' + pass.slice(-3) : 'НЕТ');
console.log('Есть ли кавычки:', pass ? (pass.includes('\"') || pass.includes(\"'\") ? 'ДА' : 'НЕТ') : 'НЕТ');
"
```

### Шаг 6: Проверить формат пароля в .env

Пароль `primePass_2001-1995!` содержит специальные символы (`!`).

В .env файле пароль должен быть БЕЗ кавычек:
```
PGPASSWORD=primePass_2001-1995!
```

НЕ так:
```
PGPASSWORD='primePass_2001-1995!'
PGPASSWORD="primePass_2001-1995!"
```

## Возможные решения

### Решение 1: Сбросить пароль в PostgreSQL

```bash
sudo -u postgres psql << EOF
ALTER USER primecoder_user WITH PASSWORD 'primePass_2001-1995!';
\q
EOF
```

### Решение 2: Использовать DATABASE_URL вместо отдельных переменных

Если отдельные переменные не работают, можно использовать DATABASE_URL:

```bash
# В .env добавить:
DATABASE_URL=postgresql://primecoder_user:primePass_2001-1995!@localhost:5432/primecoder_prod
```

И изменить скрипты для использования DATABASE_URL.

### Решение 3: Проверить pg_hba.conf и изменить метод аутентификации

```bash
# Сделать backup
sudo cp /etc/postgresql/*/main/pg_hba.conf /etc/postgresql/*/main/pg_hba.conf.backup

# Изменить метод на md5 для localhost
sudo sed -i 's/host.*all.*all.*127.0.0.1\/32.*ident/host    all             all             127.0.0.1\/32            md5/g' /etc/postgresql/*/main/pg_hba.conf
sudo sed -i 's/host.*all.*all.*127.0.0.1\/32.*peer/host    all             all             127.0.0.1\/32            md5/g' /etc/postgresql/*/main/pg_hba.conf

# Перезагрузить PostgreSQL
sudo systemctl reload postgresql
```

## Быстрая проверка

```bash
cd /var/www/primecoder-gulp/backend

# 1. Запустить тест
node scripts/test-db-connection.js

# 2. Если не работает, попробовать напрямую
PASSWORD=$(grep "^PGPASSWORD=" .env | cut -d '=' -f2)
PGPASSWORD="$PASSWORD" psql -h localhost -U primecoder_user -d primecoder_prod -c "SELECT 1;"
```

Если psql работает, а Node.js нет - проблема в коде.
Если psql не работает - проблема в PostgreSQL или пароле.
