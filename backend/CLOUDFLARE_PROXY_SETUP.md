# Быстрая настройка прокси через Cloudflare Workers

Это самый простой и бесплатный способ получить прокси для OpenAI API.

## Шаг 1: Регистрация на Cloudflare

1. Зайдите на https://workers.cloudflare.com
2. Зарегистрируйтесь или войдите в аккаунт (бесплатно)
3. Нажмите "Create a Worker"

## Шаг 2: Создание Worker

1. Удалите весь код из редактора
2. Вставьте следующий код:

```javascript
export default {
  async fetch(request) {
    // Разрешаем CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    const url = new URL(request.url);
    
    // Перенаправляем на OpenAI API
    const targetUrl = 'https://api.openai.com' + url.pathname + url.search;
    
    // Копируем заголовки
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('cf-connecting-ip');
    headers.delete('cf-ray');
    headers.delete('cf-visitor');
    
    // Создаем новый запрос к OpenAI
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
    });
    
    try {
      // Отправляем запрос к OpenAI
      const response = await fetch(modifiedRequest);
      
      // Клонируем ответ для модификации заголовков
      const responseClone = response.clone();
      const newHeaders = new Headers(responseClone.headers);
      newHeaders.set('Access-Control-Allow-Origin', '*');
      
      // Возвращаем ответ с CORS заголовками
      return new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: newHeaders,
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};
```

3. Нажмите "Save and deploy"

## Шаг 3: Получите URL вашего Worker

После деплоя вы получите URL вида:
`https://your-worker-name.your-subdomain.workers.dev`

Скопируйте этот URL.

## Шаг 4: Добавьте URL в .env

Откройте файл `backend/.env` и добавьте:

```env
OPENAI_PROXY_URL=https://your-worker-name.your-subdomain.workers.dev
```

**Важно:** Не добавляйте `/v1/chat/completions` - это добавится автоматически!

## Шаг 5: Перезапустите backend

```bash
cd backend
# Остановите текущий процесс
lsof -ti:3000 | xargs kill -9
# Запустите заново
node app.js
```

## Шаг 6: Проверьте работу

Запустите тестовый скрипт:

```bash
cd backend
node scripts/testOpenAIProxy.js
```

Вы должны увидеть "✅ Подключение успешно!"

## Готово! 🎉

Теперь генерация SEO-контента должна работать через прокси Cloudflare.



