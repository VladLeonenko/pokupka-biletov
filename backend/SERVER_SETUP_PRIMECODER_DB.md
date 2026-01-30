# Настройка боевого сервера для primecoder_db

## 1. Подключение к серверу

```bash
ssh root@85.239.44.40
```

## 2. Создание базы данных primecoder_db

Сначала нужно создать новую БД `primecoder_db`:

```bash
sudo -u postgres psql
```

В psql выполните:
```sql
CREATE DATABASE primecoder_db OWNER primeuser;
\q
```

Или одной командой:
```bash
sudo -u postgres psql -c "CREATE DATABASE primecoder_db OWNER primeuser;"
```

## 3. Применение миграций к новой БД

```bash
cd /var/www/primecoder-gulp/backend

# Временно меняем .env для миграций
export PGDATABASE=primecoder_db

# Применяем миграции
npm run migrate

# Или вручную через psql
psql -h localhost -U primeuser -d primecoder_db -f migrations/001_init.sql
# ... и так далее для всех миграций
```

## 4. Обновление .env файла

Перейдите в директорию backend и обновите `.env`:

```bash
cd /var/www/primecoder-gulp/backend
nano .env
```

Измените строку:
```
PGDATABASE=primecoder_prod
```

На:
```
PGDATABASE=primecoder_db
```

Сохраните файл (Ctrl+O, Enter, Ctrl+X).

## 3. Проверка подключения к БД

Проверьте, что база данных `primecoder_db` существует и доступна:

```bash
cd /var/www/primecoder-gulp/backend
node -e "
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT),
});
const result = await pool.query('SELECT COUNT(*) as count FROM blog_posts');
console.log('Статей в БД:', result.rows[0].count);
await pool.end();
"
```

## 4. Перезапуск backend

```bash
pm2 restart all
pm2 logs --lines 50
```

Проверьте логи на наличие ошибок подключения к БД.

## 5. Проверка данных в админке

Откройте админку и проверьте:
- Блог: должны быть только статьи про AI/маркетинг/разработку/SEO
- Товары: должны быть 6 товаров PrimeCoder (не товары amani)
- Категории: должны быть категории PrimeCoder

## 6. Если данные неправильные

Если в админке все еще видны данные amani, нужно очистить БД и импортировать правильные данные:

### 6.1. Экспорт правильных данных с локальной машины

На локальной машине:

```bash
cd /Users/vladislavleonenko/Desktop/primecoder-gulp/backend
node scripts/export-primecoder-only.js > primecoder-data-export.json
```

### 6.2. Загрузка на сервер

```bash
scp backend/primecoder-data-export.json root@85.239.44.40:/var/www/primecoder-gulp/backend/
```

### 6.3. Импорт на сервере

```bash
cd /var/www/primecoder-gulp/backend
node scripts/import-database.js primecoder-data-export.json
```

## 7. Проверка после настройки

После всех изменений проверьте:

1. **Backend работает:**
   ```bash
   pm2 status
   curl http://localhost:3000/api/public/version
   ```

2. **Админка показывает правильные данные:**
   - Откройте админку в браузере
   - Проверьте блог, товары, категории

3. **Frontend работает:**
   - Откройте сайт в браузере
   - Проверьте, что страницы загружаются без 404 ошибок

## Важные заметки

- **Не удаляйте старую БД `primecoder_prod`** - она может понадобиться для восстановления данных
- **Делайте бэкап перед импортом:**
  ```bash
  cd /var/www/primecoder-gulp/backend
  # Бэкап старой БД
  node scripts/export-database.js > backup-primecoder_prod-$(date +%Y%m%d).json
  ```
- **Если что-то пошло не так**, можно вернуться к старой БД, изменив `.env` обратно на `PGDATABASE=primecoder_prod`

## Альтернативный вариант: использовать primecoder_prod

Если не хотите создавать новую БД, можно очистить `primecoder_prod` и импортировать туда правильные данные:

```bash
cd /var/www/primecoder-gulp/backend

# 1. Бэкап текущих данных
node scripts/export-database.js > backup-primecoder_prod-$(date +%Y%m%d).json

# 2. Очистка неправильных данных (осторожно!)
# Лучше сделать через скрипт clean-primecoder-db.js, но сначала измените в нём БД на primecoder_prod

# 3. Импорт правильных данных
node scripts/import-database.js primecoder-data-export.json
```

**Рекомендация:** Лучше создать отдельную БД `primecoder_db` для чистоты и разделения проектов.
