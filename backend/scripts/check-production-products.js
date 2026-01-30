#!/usr/bin/env node
/**
 * Скрипт для проверки товаров на боевом сервере
 * Использование: подключись к боевому серверу и запусти этот скрипт
 */

console.error(`
📋 Инструкция для проверки товаров на боевом сервере:

1. Подключись к боевому серверу:
   ssh root@85.239.44.40

2. Перейди в директорию проекта:
   cd /var/www/primecoder-gulp/backend

3. Проверь структуру таблицы products:
   psql -h localhost -U твой_пользователь -d твоя_база -c "\\d products"

4. Проверь все товары с полными данными:
   psql -h localhost -U твой_пользователь -d твоя_база -c "
     SELECT 
       slug, 
       title, 
       CASE WHEN image_url IS NOT NULL THEN 'Есть' ELSE 'Нет' END as has_image,
       CASE WHEN gallery IS NOT NULL AND array_length(gallery, 1) > 0 THEN array_length(gallery, 1) ELSE 0 END as gallery_count,
       CASE WHEN full_description_html IS NOT NULL AND LENGTH(full_description_html) > 100 THEN 'Есть' ELSE 'Нет' END as has_full_desc,
       CASE WHEN content_json IS NOT NULL THEN 'Есть' ELSE 'Нет' END as has_content_json
     FROM products 
     ORDER BY sort_order;
   "

5. Экспортируй товары с полными данными:
   psql -h localhost -U твой_пользователь -d твоя_база -c "
     SELECT * FROM products 
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
     ORDER BY sort_order;
   " -t -A -F"," > products-export.csv

6. Или используй скрипт экспорта на сервере:
   node scripts/export-database.js > production-export.json
`);
