# Исправление проблемы с миграцией акций на сервере

## Проблема
При запуске `node scripts/create-promotions.js` возникает ошибка: `column "slug" does not exist`

## Решение

### Вариант 1: Применить миграцию вручную (рекомендуется)

```bash
cd /var/www/primecoder-gulp/backend

# Применить миграцию через psql
psql -h localhost -U primeuser -d primecoder_prod -f migrations/051_add_slug_to_promotions.sql
```

Если psql требует пароль, используйте переменные окружения:
```bash
export PGPASSWORD=primepass
psql -h localhost -U primeuser -d primecoder_prod -f migrations/051_add_slug_to_promotions.sql
```

### Вариант 2: Использовать отдельный скрипт

```bash
cd /var/www/primecoder-gulp/backend
node scripts/apply-migration-051.js
```

### Вариант 3: Применить SQL напрямую

```bash
cd /var/www/primecoder-gulp/backend
psql -h localhost -U primeuser -d primecoder_prod << EOF
ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS conditions TEXT;

CREATE INDEX IF NOT EXISTS idx_promotions_slug ON promotions(slug) WHERE slug IS NOT NULL;

-- Если нужно добавить уникальность (может быть ошибка если есть дубликаты)
-- ALTER TABLE promotions ADD CONSTRAINT promotions_slug_unique UNIQUE (slug);
EOF
```

## После применения миграции

Запустите скрипт создания акций:
```bash
node scripts/create-promotions.js
```

## Проверка

Проверьте, что колонки добавлены:
```bash
psql -h localhost -U primeuser -d primecoder_prod -c "\d promotions"
```

Должны появиться колонки `slug` и `conditions`.
