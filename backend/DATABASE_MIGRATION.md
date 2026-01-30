# Миграция данных из локальной БД на боевой сервер

## Шаг 1: Экспорт данных с локальной БД

На локальной машине (где есть данные):

```bash
cd backend

# Убедись, что .env настроен на локальную БД
# Затем экспортируй данные:
node scripts/export-database.js > database-export.json

# Проверь, что файл создан и не пустой:
ls -lh database-export.json
head -20 database-export.json
```

## Шаг 2: Копирование файла на сервер

Скопируй `database-export.json` на боевой сервер:

```bash
# С локальной машины:
scp backend/database-export.json user@your-server:/var/www/primecoder-gulp/backend/
```

Или используй любой другой способ (rsync, sftp, и т.д.)

## Шаг 3: Импорт данных на боевой сервер

На боевом сервере:

```bash
cd /var/www/primecoder-gulp/backend

# Убедись, что .env настроен на боевую БД
# Затем импортируй данные:
cat database-export.json | node scripts/import-database.js

# Или если файл уже на сервере:
node scripts/import-database.js < database-export.json
```

## Альтернативный способ: pg_dump/pg_restore

Если у тебя есть прямой доступ к обеим БД, можно использовать стандартные инструменты PostgreSQL:

### Экспорт (локально):
```bash
pg_dump -h localhost -U username -d database_name -F c -f database.dump
```

### Импорт (на сервере):
```bash
pg_restore -h localhost -U username -d database_name -c database.dump
```

## Важные замечания

1. **Резервная копия**: Перед импортом сделай резервную копию боевой БД:
   ```bash
   pg_dump -h localhost -U username -d database_name > backup-$(date +%Y%m%d).sql
   ```

2. **Проверка данных**: После импорта проверь, что данные загрузились:
   ```sql
   SELECT COUNT(*) FROM pages;
   SELECT COUNT(*) FROM blog_posts;
   SELECT COUNT(*) FROM products;
   SELECT COUNT(*) FROM clients;
   ```

3. **Конфликты**: Скрипт использует `ON CONFLICT`, поэтому существующие записи будут обновлены, а новые - добавлены.

4. **Последовательность ID**: После импорта может потребоваться сбросить последовательности:
   ```sql
   SELECT setval('pages_id_seq', (SELECT MAX(id) FROM pages));
   SELECT setval('blog_posts_id_seq', (SELECT MAX(id) FROM blog_posts));
   -- и т.д. для всех таблиц с SERIAL PRIMARY KEY
   ```

## Таблицы, которые экспортируются

- `pages` - страницы сайта
- `blog_posts`, `blog_categories`, `blog_tags` - блог
- `cases` - кейсы
- `products`, `product_categories` - товары
- `promotions` - акции
- `clients`, `client_orders` - клиенты
- `carousels`, `carousel_items` - карусели
- `partials` - частичные шаблоны (header, footer)
- `awards` - награды
- `reviews` - отзывы
- `forms`, `form_submissions` - формы
- `team_members` - команда
- И другие...
