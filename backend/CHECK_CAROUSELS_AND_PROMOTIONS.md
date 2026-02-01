# Проверка каруселей и акций

## Проблема: карусели и акции не появились

### Проверка на сервере

```bash
cd /var/www/primecoder-gulp/backend

# 1. Проверить что карусели созданы
psql -U primeuser -d primecoder_prod -c "SELECT slug, title FROM carousels WHERE slug IN ('vertical-carousel-home', 'team');"

# 2. Проверить что есть слайды в каруселях
psql -U primeuser -d primecoder_prod -c "SELECT c.slug, COUNT(cs.id) as slides_count FROM carousels c LEFT JOIN carousel_slides cs ON c.id = cs.carousel_id WHERE c.slug IN ('vertical-carousel-home', 'team') GROUP BY c.slug;"

# 3. Проверить что акции созданы
psql -U primeuser -d primecoder_prod -c "SELECT id, slug, title, is_active, discount_percent FROM promotions ORDER BY sort_order;"

# 4. Если каруселей нет - запустить скрипт
node scripts/create-initial-carousels.js

# 5. Если акций нет - запустить скрипт
node scripts/create-promotions.js
```

### Проверка API

```bash
# Проверить что API возвращает карусели
curl http://localhost:3000/api/public/carousels/vertical-carousel-home
curl http://localhost:3000/api/public/carousels/team

# Проверить что API возвращает акции
curl http://localhost:3000/api/public/promotions
```

### Возможные проблемы

1. **Скрипты не запускались** - нужно запустить вручную
2. **Ошибки при выполнении скриптов** - проверить логи
3. **Таблицы не существуют** - применить миграции
4. **Неправильная БД** - проверить .env файл (PGDATABASE)

### Решение

Если скрипты не запускались или были ошибки:

```bash
# 1. Применить миграции (если нужно)
psql -U primeuser -d primecoder_prod -f migrations/XXX_carousels.sql
psql -U primeuser -d primecoder_prod -f migrations/XXX_promotions.sql

# 2. Запустить скрипты
node scripts/create-initial-carousels.js
node scripts/create-promotions.js

# 3. Перезапустить бэкенд
pm2 restart all --update-env
```
