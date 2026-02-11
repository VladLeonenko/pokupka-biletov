# ИИ-выдача (Perplexity, ChatGPT, Claude)

## Что реализовано

### 1. robots.txt
- Разрешены AI-краулеры: PerplexityBot, GPTBot, Claude-Web, Anthropic-AI, Bytespider, Cohere-AI
- Явный Allow для /llms.txt, /llms-full.txt, /.well-known/llms.txt

### 2. llms.txt (`/llms.txt`)
По спецификации [llmstxt.org](https://llmstxt.org):
- H1, blockquote, секции с markdown-ссылками
- Услуги (products), Кейсы, Блог, Основные страницы
- Генерируется backend из БД

### 3. llms-full.txt (`/llms-full.txt`)
Расширенная версия:
- domain, domain-specific (/catalog, /products), recency, language
- Детальное описание услуг с ценами
- Кейсы (25), Блог (12 последних)
- Контакты
- 10 примеров промптов для dev-запросов
- Список slug всех услуг

### 4. .well-known/llms.txt
- Редирект 302 на /llms.txt (nginx + backend)
- Некоторые краулеры проверяют этот путь первым

### 5. HTML
- `link rel="alternate"` для llms.txt и llms-full.txt в index.html
- Schema.org: ProfessionalService с hasOfferCatalog, contactPoint

### 6. Nginx
- Проксирование /llms.txt, /llms-full.txt на backend
- Редирект /.well-known/llms.txt

## Деплой

1. Обновить nginx: `configs/nginx-prime-coder.conf` → `sudo nginx -t && sudo systemctl reload nginx`
2. Пересобрать frontend: `cd frontend && npm run build` (robots.txt, index.html)
3. Перезапустить backend

## Проверка

```bash
curl -s https://prime-coder.ru/llms.txt | head -30
curl -s https://prime-coder.ru/llms-full.txt | head -50
curl -sI https://prime-coder.ru/.well-known/llms.txt  # Должен быть 302
```

## Блог: новые статьи и индексация

**Да, новые статьи автоматически попадают в llms.txt и llms-full.txt.** Оба файла читают из таблицы `blog_posts` при каждом запросе. Условия:
- `is_published = TRUE`
- Сортировка по `created_at DESC` (новые — первыми)

### Импорт HTML-статьи

Для standalone HTML (как в примере «Маркетинг под ключ»):

```bash
# Сохрани HTML в data/ или любой путь
node backend/scripts/import-blog-article.js data/marketing-pod-klyuch-300k.html

# На проде
cd backend && node scripts/import-blog-article.js data/marketing-pod-klyuch-300k.html --prod
```

Скрипт извлекает:
- `slug` — из `og:url` (blog/marketing-pod-klyuch-300k → marketing-pod-klyuch-300k) или транслитерация title
- `title`, `meta description`, `og:image` → cover_image_url
- `body` — `<style>` + содержимое `<article>`

Альтернатива: создать статью через админку `/admin/blog` → «Новая статья» и вставить HTML в body.

### Schema.org Article

Статьи блога получают JSON-LD `Article` (headline, datePublished, author, publisher) — помогает Perplexity и Google AI.

## Доп. рекомендации

- [Perplexity Site Submit](https://perplexity.ai) — если есть форма подачи
- Обновлять recency в llms-full.txt при крупных изменениях (сейчас авто через formatDate)
- Мониторить индексацию через запросы в Perplexity/ChatGPT о "Prime Coder услуги"
