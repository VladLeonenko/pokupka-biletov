# Исправление CORS в .env файле

## Проблема
В `.env` файле две строки `CORS_ORIGIN`, вторая перезаписывает первую:
```
CORS_ORIGIN=https://prime-coder.ru,https://www.prime-coder.ru
CORS_ORIGIN=http://localhost:5173
```

## Решение на сервере

Выполните на сервере:

```bash
cd /var/www/primecoder-gulp/backend

# Отредактировать .env
nano .env
```

**Найдите обе строки CORS_ORIGIN и замените их на ОДНУ строку:**

```env
CORS_ORIGIN=https://prime-coder.ru,https://www.prime-coder.ru,http://localhost:5173
```

**Или только для продакшена (рекомендуется):**

```env
CORS_ORIGIN=https://prime-coder.ru,https://www.prime-coder.ru
```

**Сохраните файл (Ctrl+O, Enter, Ctrl+X)**

**Затем перезапустите с обновлением переменных:**

```bash
pm2 restart all --update-env
```

**Проверьте, что переменные обновились:**

```bash
pm2 env 0 | grep CORS
```

Должно показать правильные значения.

**Пересоберите и задеплойте фронтенд:**

Локально:
```bash
cd frontend
npm run build
scp -r dist/* root@85.239.44.40:/var/www/primecoder-gulp/frontend/dist/
```

**Очистите кеш браузера и попробуйте войти снова.**
