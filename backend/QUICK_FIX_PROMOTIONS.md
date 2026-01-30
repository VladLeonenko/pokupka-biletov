# Быстрое исправление: применение миграции для акций на сервере

## Проблема
Ошибка: `column "slug" does not exist` при запуске `create-promotions.js`

## Решение (выполнить на сервере)

### Шаг 1: Применить миграцию через SQL

```bash
cd /var/www/primecoder-gulp/backend

# Вариант 1: Через psql с паролем из .env
export PGPASSWORD=primepass
psql -h localhost -U primeuser -d primecoder_prod << 'EOF'
ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS conditions TEXT;

CREATE INDEX IF NOT EXISTS idx_promotions_slug ON promotions(slug) WHERE slug IS NOT NULL;
EOF

# Вариант 2: Через Node.js скрипт
node scripts/apply-migration-051.js
```

### Шаг 2: Проверить, что колонки добавлены

```bash
psql -h localhost -U primeuser -d primecoder_prod -c "\d promotions" | grep -E "slug|conditions"
```

Должны увидеть:
```
slug     | text
conditions | text
```

### Шаг 3: Запустить скрипт создания акций

```bash
node scripts/create-promotions.js
```

Должно быть:
```
✅ Создано: 5
🔄 Обновлено: 0
❌ Ошибок: 0
```

## Если ошибка "duplicate key value"

Если при добавлении уникального индекса будет ошибка о дубликатах, сначала очистите дубликаты:

```sql
-- Найти дубликаты slug (если они есть)
SELECT slug, COUNT(*) 
FROM promotions 
WHERE slug IS NOT NULL 
GROUP BY slug 
HAVING COUNT(*) > 1;

-- Удалить дубликаты, оставив только первый
DELETE FROM promotions p1
USING promotions p2
WHERE p1.id > p2.id 
AND p1.slug = p2.slug 
AND p1.slug IS NOT NULL;
```

Затем добавьте уникальность:
```sql
ALTER TABLE promotions 
ADD CONSTRAINT promotions_slug_unique UNIQUE (slug);
```
