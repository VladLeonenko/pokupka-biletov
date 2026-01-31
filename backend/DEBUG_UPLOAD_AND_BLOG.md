# Отладка загрузки изображений и генерации статей

## Проблема 1: Загрузка обложки продукта - нет ошибки, но ничего не происходит

**Симптомы:**
- Нет ошибки в консоли
- Нет алерта/уведомления
- Изображение не загружается

**Возможные причины:**
1. FormData не отправляется корректно (проблема с заголовками)
2. Ответ от сервера не обрабатывается
3. Ошибка в обработчике onchange

**Исправления:**
- ✅ Исправлена функция `uploadImage` - теперь не использует `doFetch` для FormData (браузер сам устанавливает Content-Type с boundary)
- ✅ Добавлено логирование в консоль для отладки
- ✅ Улучшена обработка ошибок

**Проверка на сервере:**

```bash
# Проверить логи бэкенда при загрузке
pm2 logs primecoder-backend --lines 50 | grep -i "image\|upload"

# Проверить права на папку uploads
ls -la uploads/images/
chmod -R 755 uploads/
chown -R www-data:www-data uploads/

# Проверить Nginx конфигурацию
sudo nginx -t
# Убедиться что есть: client_max_body_size 50M;
```

**Отладка в браузере:**
1. Откройте DevTools → Network
2. Попробуйте загрузить изображение
3. Найдите запрос к `/api/images`
4. Проверьте:
   - Request Headers (должен быть `Content-Type: multipart/form-data; boundary=...`)
   - Request Payload (должен содержать файл)
   - Response (должен быть JSON с `{url: "...", filename: "..."}`)

## Проблема 2: Генерация статей и запросов не работает

**Симптомы:**
- При клике на тему не генерируются запросы ВЧ/СЧ/НЧ
- При клике на запрос не генерируется статья (500 ошибка)

**Схема работы:**
1. Клик на тему → `/api/ai/semantic?seed=тема` → генерация запросов ВЧ/СЧ/НЧ
2. Клик на запрос → `/api/ai/generate-article` → генерация статьи

**Исправления:**
- ✅ Улучшена обработка ошибок в `/api/ai/semantic`
- ✅ Добавлено логирование для отладки
- ✅ Улучшена обработка ошибок в `/api/ai/generate-article`
- ✅ Добавлено логирование на фронтенде

**Проверка на сервере:**

```bash
# Проверить логи при генерации запросов
pm2 logs primecoder-backend --lines 100 | grep -i "semantic"

# Проверить логи при генерации статьи
pm2 logs primecoder-backend --lines 100 | grep -i "generate-article"

# Проверить OpenAI API ключ
cd /var/www/primecoder-gulp/backend
cat .env | grep OPENAI_API_KEY

# Проверить таблицу semantic_topics
psql -U primeuser -d primecoder_prod -c "SELECT * FROM semantic_topics LIMIT 10;"
```

**Отладка в браузере:**
1. Откройте DevTools → Console
2. При клике на тему проверьте:
   - Запрос к `/api/ai/semantic?seed=...`
   - Логи `[BlogListPage] Loading keywords for seed: ...`
   - Логи `[BlogListPage] Keywords received: ...`
3. При клике на запрос проверьте:
   - Запрос к `/api/ai/generate-article`
   - Логи `[BlogListPage] Generating article for keyword: ...`
   - Логи `[generateArticleFromKeyword] ...`

**Возможные проблемы:**
1. OpenAI API ключ неверный или истек
2. Таблица `semantic_topics` не существует (нужна миграция 047)
3. Проблемы с сетью/прокси для OpenAI API
4. Ошибки в обработке ответа от OpenAI

## Следующие шаги

1. **Установить @mui/lab** для Timeline компонентов
2. **Продолжить исправление TypeScript ошибок**
3. **Обновить типы для всех API ответов**
