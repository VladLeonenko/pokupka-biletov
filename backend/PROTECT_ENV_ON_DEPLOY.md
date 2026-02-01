# Защита .env файла при деплое

## Проблема

При `git pull` на сервере `.env` файл может перезаписаться, что приводит к:
- Неправильным настройкам БД
- Невозможности войти в админку
- Падению приложения

## Решение

### 1. Убедиться что .env в .gitignore

```bash
# Проверить что .env игнорируется
cd /var/www/primecoder-gulp
git check-ignore backend/.env
# Должно вывести: backend/.env

# Если не игнорируется, добавить в .gitignore
echo "backend/.env" >> .gitignore
echo "frontend/.env" >> .gitignore
echo "frontend/.env.*" >> .gitignore
git add .gitignore
git commit -m "Add: защита .env файлов от коммита"
```

### 2. На сервере защитить .env от перезаписи

```bash
cd /var/www/primecoder-gulp/backend

# Создать резервную копию текущего .env
cp .env .env.backup

# Убедиться что .env не отслеживается git
git update-index --assume-unchanged backend/.env

# Или использовать более надежный способ - добавить в .git/info/exclude
echo "backend/.env" >> .git/info/exclude
```

### 3. Создать скрипт для безопасного git pull

```bash
# Создать скрипт deploy.sh на сервере
cat > /var/www/primecoder-gulp/deploy.sh << 'EOF'
#!/bin/bash
cd /var/www/primecoder-gulp

# Сохранить текущий .env
if [ -f backend/.env ]; then
    cp backend/.env backend/.env.backup.$(date +%Y%m%d_%H%M%S)
fi

# Сделать pull
git pull origin main

# Восстановить .env если он был перезаписан
if [ ! -f backend/.env ] || [ -f backend/.env.backup.* ]; then
    LATEST_BACKUP=$(ls -t backend/.env.backup.* 2>/dev/null | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        cp "$LATEST_BACKUP" backend/.env
        echo "✅ .env восстановлен из резервной копии"
    fi
fi

# Перезапустить приложение
cd backend
pm2 restart all --update-env
EOF

chmod +x /var/www/primecoder-gulp/deploy.sh
```

### 4. Использовать скрипт для деплоя

```bash
# Вместо git pull использовать:
/var/www/primecoder-gulp/deploy.sh
```

### 5. Альтернатива: использовать .env.local или .env.production

```bash
# На сервере создать .env.production
cd /var/www/primecoder-gulp/backend
cp .env .env.production

# В скриптах использовать .env.production если он есть
# Или использовать переменные окружения системы
```

## Проверка

```bash
# 1. Убедиться что .env не в git
cd /var/www/primecoder-gulp
git ls-files | grep "\.env$"
# Должно быть пусто

# 2. Убедиться что .env существует на сервере
ls -la backend/.env
# Должен существовать

# 3. Проверить содержимое .env
cat backend/.env | grep PGUSER
# Должен быть правильный пользователь для сервера
```

## Автоматическая защита в скриптах

Скрипты уже обновлены для поддержки разных вариантов переменных окружения, но важно чтобы `.env` файл на сервере не перезаписывался при `git pull`.
