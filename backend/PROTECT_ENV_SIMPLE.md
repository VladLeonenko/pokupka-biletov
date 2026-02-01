# Простая защита .env на сервере

## Если `git update-index --assume-unchanged` не работает

### Вариант 1: Добавить в локальный exclude (рекомендуется)

```bash
cd /var/www/primecoder-gulp
echo "backend/.env" >> .git/info/exclude
```

Это добавит `.env` в локальный gitignore, который не коммитится в репозиторий.

### Вариант 2: Использовать скрипт безопасного деплоя

```bash
cd /var/www/primecoder-gulp
chmod +x backend/deploy-safe.sh
./backend/deploy-safe.sh
```

Скрипт автоматически защитит `.env` при каждом деплое.

### Вариант 3: Вручную перед каждым pull

```bash
cd /var/www/primecoder-gulp/backend

# Сохранить .env
cp .env .env.backup

# Сделать pull
cd ..
git pull origin main

# Восстановить .env если он изменился
cd backend
if [ -f .env.backup ]; then
    if ! diff -q .env .env.backup > /dev/null 2>&1; then
        echo "⚠️  .env был изменен, восстанавливаем..."
        cp .env.backup .env
    fi
    rm .env.backup
fi

# Перезапустить
pm2 restart all --update-env
```

### Вариант 4: Использовать .env.production

```bash
cd /var/www/primecoder-gulp/backend

# Создать .env.production с серверными настройками
cp .env .env.production

# В будущем использовать .env.production
# (нужно будет изменить скрипты для чтения .env.production в production)
```

## Рекомендуемое решение

Используйте **Вариант 1** (добавить в exclude) - это самое простое и надежное:

```bash
cd /var/www/primecoder-gulp
echo "backend/.env" >> .git/info/exclude
git pull origin main
cd backend
pm2 restart all --update-env
```

После этого `.env` не будет перезаписываться при `git pull`.
