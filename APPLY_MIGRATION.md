# Применение миграции для коммерческих предложений

Для работы системы коммерческих предложений необходимо применить миграцию к базе данных.

## Способ 1: Через psql

```bash
psql -U your_user -d your_database -f backend/migrations/046_commercial_proposals.sql
```

## Способ 2: Через готовый скрипт (РЕКОМЕНДУЕТСЯ)

Используйте готовый скрипт, который правильно загружает переменные окружения:

```bash
cd backend
node scripts/apply-migration-046.js
```

Этот скрипт автоматически:
- Загружает переменные окружения из .env файла
- Применяет миграцию
- Проверяет, что таблицы созданы успешно

## Способ 3: Вручную через SQL клиент

Откройте файл `backend/migrations/046_commercial_proposals.sql` и выполните его содержимое в вашем SQL клиенте (pgAdmin, DBeaver, etc.)

## Проверка

После применения миграции проверьте, что таблицы созданы:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('commercial_proposals', 'proposal_slides');
```

Обе таблицы должны присутствовать в результате.

