# Исправление ошибок загрузки изображений и генерации статей

## Проблема 1: 413 ошибка при загрузке обложки продукта

**Ошибка:** `Failed to load resource: the server responded with a status of 413`

**Причина:** Лимит размера файла в Nginx меньше, чем размер загружаемого файла.

**Решение:**

1. **Увеличить лимит в Nginx конфигурации:**

```bash
# На сервере отредактировать конфигурацию Nginx
sudo nano /etc/nginx/sites-available/prime-coder.ru
# или
sudo nano /etc/nginx/nginx.conf
```

Найти или добавить в блок `server` или `http`:
```nginx
client_max_body_size 50M;
```

2. **Проверить и перезагрузить Nginx:**

```bash
sudo nginx -t
sudo systemctl reload nginx
```

3. **Проверить лимиты в backend:**

- `backend/routes/images.js` - лимит Multer: **50MB** (уже исправлено)
- `backend/app.js` - лимит express.json: **50mb** (уже установлено)

## Проблема 2: 500 ошибка при генерации статьи

**Ошибка:** `Failed to load resource: the server responded with a status of 500 () (generate-article, line 0)`

**Причина:** Ошибки в обработке исключений и работе с базой данных.

**Исправления:**

1. ✅ Улучшена обработка ошибок в `backend/routes/ai.js`
2. ✅ Добавлено логирование для отладки
3. ✅ Исправлена работа с пулом соединений БД
4. ✅ Добавлена функция `slugify` если не импортирована

**Проверка на сервере:**

```bash
# Проверить логи бэкенда
pm2 logs primecoder-backend --lines 100 | grep -i "generate-article"

# Перезапустить бэкенд
pm2 restart all --update-env
```

## Дополнительные проверки

1. **Проверить переменные окружения:**
```bash
cd /var/www/primecoder-gulp/backend
cat .env | grep OPENAI_API_KEY
```

2. **Проверить права на папку uploads:**
```bash
ls -la uploads/
chmod -R 755 uploads/
chown -R www-data:www-data uploads/
```

3. **Проверить доступность OpenAI API:**
```bash
# В логах должно быть видно ошибки OpenAI если они есть
pm2 logs primecoder-backend | grep -i "openai"
```
