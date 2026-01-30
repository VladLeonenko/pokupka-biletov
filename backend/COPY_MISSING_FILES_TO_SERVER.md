# Копирование отсутствующих файлов на сервер

## Проблема
После `git reset --hard origin/main` файлы `routes/pages.js` и `routes/quiz.js` отсутствуют на сервере, хотя они есть в репозитории.

## Решение

### Вариант 1: Скопировать файлы напрямую через scp (с локальной машины)

```bash
# С вашей локальной машины
cd /Users/vladislavleonenko/Desktop/primecoder-gulp

# Скопировать файлы на сервер
scp backend/routes/pages.js root@ваш_сервер:/var/www/primecoder-gulp/backend/routes/
scp backend/routes/quiz.js root@ваш_сервер:/var/www/primecoder-gulp/backend/routes/
```

### Вариант 2: Создать файлы на сервере вручную

На сервере выполните:

```bash
cd /var/www/primecoder-gulp

# Проверить, какие файлы отсутствуют
ls -la backend/routes/pages.js
ls -la backend/routes/quiz.js

# Если файлов нет, скопировать содержимое из репозитория GitHub
# Или использовать git show для получения содержимого
```

### Вариант 3: Использовать git show для получения файлов

```bash
cd /var/www/primecoder-gulp

# Получить содержимое файла из последнего коммита
git show HEAD:backend/routes/pages.js > backend/routes/pages.js
git show HEAD:backend/routes/quiz.js > backend/routes/quiz.js

# Проверить
ls -la backend/routes/pages.js backend/routes/quiz.js
```

### Вариант 4: Проверить другую ветку или тег

```bash
cd /var/www/primecoder-gulp

# Проверить все ветки
git branch -a

# Проверить, есть ли файлы в других коммитах
git log --all --full-history -- backend/routes/pages.js
git log --all --full-history -- backend/routes/quiz.js

# Если файлы есть в другом коммите, переключиться на него
git checkout <commit-hash>
```

## После копирования файлов

```bash
# 1. Перезапустить backend
pm2 restart all --update-env

# 2. Проверить логи
pm2 logs primecoder-backend --lines 20

# 3. Проверить, что backend запустился
curl http://localhost:3000/api/public/pages
curl http://localhost:3000/api/public/quiz/questions
```

## Исправление trust proxy

Файл `app.js` уже обновлен с `app.set('trust proxy', true)`. После копирования файлов и перезапуска ошибка с `X-Forwarded-For` должна исчезнуть.
