# Исправление проблем на сервере

## Проблема 1: 404 для /api/quiz

### Причина
Роут зарегистрирован в `app.js`, но файл `routes/quiz.js` может отсутствовать на сервере или backend не перезапущен.

### Решение
```bash
cd /var/www/primecoder-gulp

# 1. Проверить наличие файла
ls -la backend/routes/quiz.js

# 2. Если файла нет, скопировать из репозитория или создать вручную
# (файл должен быть в репозитории, но если его нет - см. инструкцию ниже)

# 3. Перезапустить backend
pm2 restart all

# 4. Проверить логи
pm2 logs primecoder-backend --lines 50
```

## Проблема 2: Не загружаются обложки товаров

### Причина
Возможные причины:
- Лимит размера файла в Nginx
- Проблемы с правами доступа к папке uploads
- Ошибка в роуте images

### Решение
```bash
cd /var/www/primecoder-gulp/backend

# 1. Проверить права на папку uploads
ls -la uploads/
chmod -R 755 uploads/
chown -R www-data:www-data uploads/  # или root:root

# 2. Проверить лимит в Nginx
sudo nano /etc/nginx/sites-available/prime-coder.ru
# Найти client_max_body_size и установить:
# client_max_body_size 50M;

# 3. Перезагрузить Nginx
sudo nginx -t
sudo systemctl reload nginx

# 4. Проверить логи backend
pm2 logs primecoder-backend --lines 50 | grep -i "image\|upload\|413"
```

## Проблема 3: Кнопка "Заполнить карточку" не работает

### Причина
Кнопка использует AI для генерации контента. Возможные проблемы:
- AI API не настроен
- Нет API ключа OpenAI
- Эндпоинт не работает

### Решение
```bash
cd /var/www/primecoder-gulp/backend

# 1. Проверить переменные окружения
cat .env | grep OPENAI

# 2. Если нет OPENAI_API_KEY, добавить:
nano .env
# Добавить: OPENAI_API_KEY=your_key_here

# 3. Перезапустить backend
pm2 restart all --update-env

# 4. Проверить логи при нажатии кнопки
pm2 logs primecoder-backend --lines 100 | grep -i "openai\|ai\|generate"
```

## Полная проверка после деплоя

```bash
cd /var/www/primecoder-gulp

# 1. Проверить все файлы на месте
ls -la backend/routes/quiz.js
ls -la backend/migrations/052_add_quiz_system.sql

# 2. Применить миграцию (если еще не применена)
cd backend
export PGPASSWORD=$(grep PGPASSWORD .env | cut -d '=' -f2)
psql -h localhost -U primeuser -d primecoder_prod -f migrations/052_add_quiz_system.sql

# 3. Проверить права на uploads
chmod -R 755 ../backend/uploads
chown -R www-data:www-data ../backend/uploads

# 4. Пересобрать фронтенд
cd ../frontend
npm run build

# 5. Перезапустить все
pm2 restart all --update-env

# 6. Проверить логи
pm2 logs --lines 50
```

## Проверка работы API

```bash
# Проверить quiz API
curl -X GET https://prime-coder.ru/api/public/quiz/questions

# Проверить загрузку изображений (нужен токен)
curl -X POST https://prime-coder.ru/api/images \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/image.jpg"
```
