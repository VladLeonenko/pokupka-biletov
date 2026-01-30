# Настройка прокси для OpenAI API

OpenAI API недоступен в некоторых регионах (включая Россию и некоторые страны СНГ). Для использования API необходимо настроить прокси.

## Вариант 1: Использование бесплатного прокси-сервиса (рекомендуется для тестирования)

### Шаг 1: Получите прокси URL

Некоторые варианты прокси-сервисов:
- **API-Proxy.com** - https://api-proxy.com (может требовать регистрации)
- **Custom прокси** - настройте свой прокси-сервер

### Шаг 2: Добавьте прокси URL в .env

Откройте файл `backend/.env` и добавьте строку:

```env
OPENAI_PROXY_URL=https://ваш-прокси-домен.com/v1/chat/completions
```

**Пример для API-Proxy:**
```env
OPENAI_PROXY_URL=https://api-proxy.com/openai/v1/chat/completions
```

### Шаг 3: Перезапустите backend

```bash
cd backend
# Остановите текущий процесс (Ctrl+C или kill процесс)
node app.js
```

## Вариант 2: Использование собственного прокси через Cloudflare Workers

### Шаг 1: Создайте Cloudflare Worker

1. Зарегистрируйтесь на https://workers.cloudflare.com
2. Создайте новый Worker со следующим кодом:

```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    // Заменяем URL на OpenAI API
    const targetUrl = 'https://api.openai.com' + url.pathname + url.search;
    
    // Копируем заголовки, но удаляем Host
    const headers = new Headers(request.headers);
    headers.delete('host');
    
    // Создаем новый запрос
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.body
    });
    
    // Отправляем запрос к OpenAI
    const response = await fetch(modifiedRequest);
    
    // Возвращаем ответ
    return response;
  }
};
```

3. Деплойте Worker и получите URL (например: `https://your-worker.workers.dev`)

### Шаг 2: Добавьте Worker URL в .env

```env
OPENAI_PROXY_URL=https://your-worker.workers.dev/v1/chat/completions
```

## Вариант 3: Использование VPN прокси

Если у вас есть VPN с прокси-сервером:

```env
OPENAI_PROXY_URL=http://proxy-server:port/v1/chat/completions
```

## Проверка работы

После настройки прокси:

1. Перезапустите backend
2. Попробуйте сгенерировать SEO-контент в админ-панели
3. Проверьте логи backend - не должно быть ошибок "unsupported_country_region_territory"

## Отладка

Если прокси не работает, проверьте:

1. **Логи backend** - должны показывать успешные запросы или конкретные ошибки
2. **URL прокси** - должен быть полным (включая `/v1/chat/completions`)
3. **Доступность прокси** - проверьте, что прокси-сервер доступен:

```bash
curl -X POST https://your-proxy.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"test"}]}'
```

## Альтернативные решения

Если прокси не подходит, можно:
1. Использовать альтернативные AI API (Claude, Gemini и т.д.)
2. Временно отключить функцию генерации
3. Использовать VPN на сервере



