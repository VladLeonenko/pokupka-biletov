# Исправление pg_hba.conf для работы с Node.js

## Проблема

В `pg_hba.conf` есть две строки:
1. `host    all             all             127.0.0.1/32            scram-sha-256` (общая)
2. `host    primecoder_prod    primecoder_user    127.0.0.1/32    md5` (специфичная)

PostgreSQL использует первую подходящую строку. Если общая строка идет раньше, она будет использоваться, и Node.js должен использовать `scram-sha-256`, а не `md5`.

## Решение

### Вариант 1: Переместить специфичную строку выше общей

```bash
# Сделать backup
sudo cp /etc/postgresql/*/main/pg_hba.conf /etc/postgresql/*/main/pg_hba.conf.backup

# Отредактировать файл
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Убедитесь, что строка для `primecoder_prod` и `primecoder_user` идет ПЕРЕД общей строкой для `all`.

### Вариант 2: Изменить общую строку на md5

```bash
# Сделать backup
sudo cp /etc/postgresql/*/main/pg_hba.conf /etc/postgresql/*/main/pg_hba.conf.backup

# Изменить метод аутентификации для localhost на md5
sudo sed -i 's/host.*all.*all.*127.0.0.1\/32.*scram-sha-256/host    all             all             127.0.0.1\/32            md5/g' /etc/postgresql/*/main/pg_hba.conf

# Перезагрузить PostgreSQL
sudo systemctl reload postgresql
```

### Вариант 3: Использовать DATABASE_URL вместо отдельных переменных

Если ничего не помогает, можно использовать `DATABASE_URL` в `.env`:

```bash
# В .env добавить:
DATABASE_URL=postgresql://primecoder_user:primePass_2001-1995!@localhost:5432/primecoder_prod
```

И изменить `db.js` для использования `DATABASE_URL`.

## Проверка

После изменений:

```bash
# Перезагрузить PostgreSQL
sudo systemctl reload postgresql

# Перезапустить backend
cd /var/www/primecoder-gulp/backend
pm2 restart all --update-env
pm2 logs --lines 20
```

## Текущая конфигурация

```
host    all             all             127.0.0.1/32            scram-sha-256
host    replication     all             127.0.0.1/32            scram-sha-256
host    primecoder_prod    primecoder_user    127.0.0.1/32    md5
```

Проблема: если общая строка идет первой, PostgreSQL будет использовать `scram-sha-256` для всех подключений, включая Node.js.

Решение: переместить специфичную строку выше или изменить общую на `md5`.
