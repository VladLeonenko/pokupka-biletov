# Экспорт товаров с боевого сервера

## Шаг 1: Подключись к боевому серверу

```bash
ssh root@85.239.44.40
cd /var/www/primecoder-gulp/backend
```

## Шаг 2: Проверь товары с полными данными

```bash
# Проверь структуру таблицы
psql -h localhost -U твой_пользователь -d твоя_база -c "\d products"

# Проверь товары primecoder с полными данными
psql -h localhost -U твой_пользователь -d твоя_база -c "
SELECT 
  slug, 
  title, 
  CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 'Есть' ELSE 'Нет' END as has_image,
  CASE WHEN gallery IS NOT NULL AND array_length(gallery, 1) > 0 THEN array_length(gallery, 1)::text ELSE '0' END as gallery_count,
  CASE WHEN full_description_html IS NOT NULL AND LENGTH(full_description_html) > 100 THEN 'Есть (' || LENGTH(full_description_html) || ')' ELSE 'Нет' END as has_full_desc,
  CASE WHEN content_json IS NOT NULL THEN 'Есть' ELSE 'Нет' END as has_content_json
FROM products 
WHERE (
  title ILIKE '%tilda%' OR
  title ILIKE '%seo%' OR
  title ILIKE '%ai%' OR
  title ILIKE '%аутсорсинг%' OR
  title ILIKE '%digital%' OR
  title ILIKE '%блогер%' OR
  title ILIKE '%маркетинг%' OR
  title ILIKE '%продаж%' OR
  title ILIKE '%разработка%' OR
  title ILIKE '%сайт%'
)
AND NOT (
  title ILIKE '%африканск%' OR
  title ILIKE '%маска%' OR
  title ILIKE '%картина%' OR
  title ILIKE '%скульптура%' OR
  title ILIKE '%постер%' OR
  title ILIKE '%фотография%' OR
  title ILIKE '%саванна%' OR
  title ILIKE '%amani%'
)
ORDER BY sort_order;
"
```

## Шаг 3: Экспортируй товары в JSON

```bash
# Используй скрипт экспорта (он экспортирует все таблицы, включая products)
node scripts/export-database.js > production-products-export.json

# Или экспортируй только товары в JSON
psql -h localhost -U твой_пользователь -d твоя_база -t -A -F"," -c "
SELECT 
  json_agg(
    json_build_object(
      'slug', slug,
      'title', title,
      'description_html', description_html,
      'summary', summary,
      'full_description_html', full_description_html,
      'price_cents', price_cents,
      'currency', currency,
      'price_period', price_period,
      'features', features,
      'is_active', is_active,
      'sort_order', sort_order,
      'content_json', content_json,
      'category_id', category_id,
      'image_url', image_url,
      'gallery', gallery,
      'stock_quantity', stock_quantity,
      'sku', sku,
      'tags', tags,
      'meta_title', meta_title,
      'meta_description', meta_description,
      'meta_keywords', meta_keywords,
      'case_slugs', case_slugs
    )
  )
FROM products 
WHERE (
  title ILIKE '%tilda%' OR
  title ILIKE '%seo%' OR
  title ILIKE '%ai%' OR
  title ILIKE '%аутсорсинг%' OR
  title ILIKE '%digital%' OR
  title ILIKE '%блогер%' OR
  title ILIKE '%маркетинг%' OR
  title ILIKE '%продаж%' OR
  title ILIKE '%разработка%' OR
  title ILIKE '%сайт%'
)
AND NOT (
  title ILIKE '%африканск%' OR
  title ILIKE '%маска%' OR
  title ILIKE '%картина%' OR
  title ILIKE '%скульптура%' OR
  title ILIKE '%постер%' OR
  title ILIKE '%фотография%' OR
  title ILIKE '%саванна%' OR
  title ILIKE '%amani%'
)
ORDER BY sort_order;
" > products-export.json
```

## Шаг 4: Скопируй файл на локальную машину

```bash
# С локальной машины:
scp root@85.239.44.40:/var/www/primecoder-gulp/backend/products-export.json backend/
```

## Шаг 5: Импортируй товары в локальную БД

```bash
# На локальной машине:
cd backend
node scripts/import-products-from-json.js products-export.json
```
