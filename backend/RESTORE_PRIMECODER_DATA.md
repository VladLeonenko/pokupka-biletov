# Восстановление данных PrimeCoder

## ✅ Что уже восстановлено:

- ✅ 55 статей блога
- ✅ 16 кейсов
- ✅ 6 товаров (базовые, без полных описаний)
- ✅ 4 воронки продаж
- ✅ 9 сделок
- ✅ 46 задач
- ✅ 1 проект клиента
- ✅ 1 коммерческое предложение
- ✅ 7 клиентов
- ✅ 11 членов команды

## ⚠️ Что нужно восстановить:

### 1. Полные данные товаров (описания, картинки, FAQ)

Товары есть, но без полных описаний, картинок и FAQ. Эти данные должны быть на **боевом сервере**.

**На боевом сервере выполни:**

```bash
ssh root@85.239.44.40
cd /var/www/primecoder-gulp/backend

# Проверь товары с полными данными
psql -h localhost -U твой_пользователь -d твоя_база -c "
SELECT 
  slug, 
  title,
  CASE WHEN full_description_html IS NOT NULL AND LENGTH(full_description_html) > 100 THEN 'Есть' ELSE 'Нет' END as has_full_desc,
  CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 'Есть' ELSE 'Нет' END as has_image,
  CASE WHEN content_json IS NOT NULL AND content_json::text != 'null' THEN 'Есть' ELSE 'Нет' END as has_content_json
FROM products 
WHERE (
  title ILIKE '%tilda%' OR title ILIKE '%seo%' OR title ILIKE '%ai%' OR
  title ILIKE '%аутсорсинг%' OR title ILIKE '%digital%' OR title ILIKE '%блогер%' OR
  title ILIKE '%маркетинг%' OR title ILIKE '%продаж%' OR title ILIKE '%разработка%' OR title ILIKE '%сайт%'
)
AND NOT (
  title ILIKE '%африканск%' OR title ILIKE '%маска%' OR title ILIKE '%картина%'
)
ORDER BY sort_order;
"

# Экспортируй товары с полными данными
node scripts/export-database.js > production-export.json

# Скопируй на локальную машину
# (с локальной машины):
scp root@85.239.44.40:/var/www/primecoder-gulp/backend/production-export.json backend/

# Импортируй товары в локальную БД primecoder_db
cd backend
# Обнови .env на primecoder_db
node scripts/import-database.js production-export.json
```

### 2. Проверка всех данных

После импорта проверь:

```bash
# Проверь товары
psql -h localhost -U primeuser -d primecoder_db -c "
SELECT 
  slug, 
  title,
  CASE WHEN full_description_html IS NOT NULL AND LENGTH(full_description_html) > 100 THEN 'Есть' ELSE 'Нет' END as has_full_desc,
  CASE WHEN image_url IS NOT NULL THEN 'Есть' ELSE 'Нет' END as has_image,
  CASE WHEN content_json IS NOT NULL AND content_json::text != 'null' THEN 'Есть FAQ' ELSE 'Нет FAQ' END as has_faq
FROM products 
ORDER BY sort_order;
"

# Проверь воронки
psql -h localhost -U primeuser -d primecoder_db -c "
SELECT 
  sf.name as funnel_name,
  COUNT(DISTINCT fs.id) as stages_count,
  COUNT(DISTINCT d.id) as deals_count
FROM sales_funnels sf
LEFT JOIN funnel_stages fs ON fs.funnel_id = sf.id
LEFT JOIN deals d ON d.funnel_id = sf.id
GROUP BY sf.id, sf.name;
"

# Проверь задачи
psql -h localhost -U primeuser -d primecoder_db -c "
SELECT 
  category,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed
FROM tasks
GROUP BY category;
"

# Проверь проекты
psql -h localhost -U primeuser -d primecoder_db -c "
SELECT 
  cp.title,
  cp.status,
  cp.progress_percent,
  COUNT(DISTINCT cps.id) as stages_count
FROM client_projects cp
LEFT JOIN client_project_stages cps ON cps.project_id = cp.id
GROUP BY cp.id, cp.title, cp.status, cp.progress_percent;
"
```

## 📋 Структура данных PrimeCoder:

### Товары (products):
- `title` - название
- `description_html` - краткое описание
- `full_description_html` - полное описание
- `image_url` - главное изображение
- `gallery` - галерея изображений
- `content_json` - структурированный контент (включая FAQ)
- `meta_title`, `meta_description` - SEO
- `case_slugs` - связанные кейсы

### Воронки продаж:
- `sales_funnels` - воронки
- `funnel_stages` - этапы воронок
- `deals` - сделки
- `deal_payments` - платежи по сделкам
- `deal_documents` - документы сделок

### Задачи:
- `tasks` - задачи
- `task_categories` - категории задач
- `task_comments` - комментарии к задачам

### Проекты клиентов:
- `client_projects` - проекты
- `client_project_stages` - этапы проектов
- `client_project_change_requests` - запросы на изменения
- `client_project_upsell_offers` - предложения апселла

## 🔄 Если нужно пересоздать БД:

```bash
# Удали старую БД
psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS primecoder_db;"

# Создай заново
psql -h localhost -U postgres -c "CREATE DATABASE primecoder_db OWNER primeuser;"

# Запусти разделение
cd backend
node scripts/split-databases-by-project.js
```
