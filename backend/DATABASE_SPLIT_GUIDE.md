# Руководство по разделению БД по проектам

## Проблема
Все три проекта (primecoder, amani, umagazine) использовали одну БД `primecoder`, из-за чего данные смешались.

## Решение
Создаём отдельные БД для каждого проекта и разделяем данные.

## Шаг 1: Создание отдельных БД

Запусти скрипт разделения:

```bash
cd backend
node scripts/split-databases-by-project.js
```

Скрипт:
1. Создаст 3 новые БД: `primecoder_db`, `amani_db`, `umagazine_db`
2. Применит миграции к каждой БД
3. Разделит данные по проектам:
   - **primecoder_db**: статьи про ИИ/маркетинг/разработку, товары услуг
   - **amani_db**: товары искусства (маски, картины, скульптуры)
   - **umagazine_db**: статьи про моду/искусство (38,000+ статей)

## Шаг 2: Настройка .env для каждого проекта

### Для primecoder:
```env
PGDATABASE=primecoder_db
PGUSER=primeuser
PGHOST=localhost
PGPASSWORD=primepass
PGPORT=5432
```

### Для amani:
```env
PGDATABASE=amani_db
PGUSER=primeuser
PGHOST=localhost
PGPASSWORD=primepass
PGPORT=5432
```

### Для umagazine:
```env
PGDATABASE=umagazine_db
PGUSER=primeuser
PGHOST=localhost
PGPASSWORD=primepass
PGPORT=5432
```

## Шаг 3: Проверка данных

После разделения проверь каждую БД:

```bash
# Проверь primecoder
psql -h localhost -U primeuser -d primecoder_db -c "SELECT COUNT(*) FROM blog_posts; SELECT COUNT(*) FROM products;"

# Проверь amani
psql -h localhost -U primeuser -d amani_db -c "SELECT COUNT(*) FROM products;"

# Проверь umagazine
psql -h localhost -U primeuser -d umagazine_db -c "SELECT COUNT(*) FROM blog_posts;"
```

## Шаг 4: Обновление проектов

В каждом проекте обнови `.env` файл на свою БД.

## Важно

- **Исходная БД `primecoder` останется нетронутой** - это резервная копия
- После проверки можно удалить старую БД `primecoder`, если всё работает
- Рекомендуется сделать бэкап перед разделением:
  ```bash
  pg_dump -h localhost -U primeuser -d primecoder > backup-before-split.sql
  ```

## Что будет разделено

### primecoder_db:
- Статьи блога про ИИ, маркетинг, разработку, SEO
- Товары услуг (Tilda, SEO, AI, аутсорсинг, блогеры, маркетинг)
- Страницы, кейсы, клиенты, команда

### amani_db:
- Товары искусства (африканские маски, картины, скульптуры, постеры, фотографии)

### umagazine_db:
- Статьи блога про моду, искусство, lifestyle (38,000+ статей)
- Статьи созданные 29 января 2026 (массовый импорт)

## Если что-то пошло не так

1. Восстанови из бэкапа:
   ```bash
   psql -h localhost -U primeuser -d primecoder < backup-before-split.sql
   ```

2. Или удали новые БД и попробуй снова:
   ```bash
   psql -h localhost -U primeuser -d postgres -c "DROP DATABASE IF EXISTS primecoder_db;"
   psql -h localhost -U primeuser -d postgres -c "DROP DATABASE IF EXISTS amani_db;"
   psql -h localhost -U primeuser -d postgres -c "DROP DATABASE IF EXISTS umagazine_db;"
   ```
