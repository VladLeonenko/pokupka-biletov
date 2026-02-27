# Пошаговое руководство: создание Umagazine на базе prime-coder

Umagazine — отдельный проект со своей БД и функционалом. Используем prime-coder как шаблон (backend + админка), фронт переписываем.

---

## Этап 1: Создание репозитория

### Шаг 1.1. Создать репозиторий на GitHub

1. GitHub → **New repository**
2. Имя: `umagazine` (или `umagazine-app`)
3. Private/Public — на выбор
4. Не добавлять README, .gitignore — они будут скопированы из prime-coder

### Шаг 1.2. Склонировать prime-coder и привязать к Umagazine

```bash
# В родительской папке (рядом с primecoder-gulp)
cd ~/Desktop  # или где у тебя primecoder-gulp

# Клонируем как umagazine (копия без истории .git)
cp -r primecoder-gulp umagazine
cd umagazine

# Удаляем связь с prime-coder
rm -rf .git

# Инициализируем новый git
git init

# Привязываем к репо Umagazine
git remote add origin https://github.com/ТВОЙ_АККАУНТ/umagazine.git

# Проверка
git remote -v
```

> Если нужна полная история коммитов, используй `git clone` вместо `cp -r`:
> ```bash
> git clone https://github.com/VladLeonenko/primecoder-gulp umagazine
> cd umagazine
> git remote set-url origin https://github.com/ТВОЙ_АККАУНТ/umagazine.git
> ```

### Шаг 1.3. Очистка перед первым коммитом

```bash
# Удаляем собранный фронт и зависимости (переустановим)
rm -rf frontend/dist
rm -rf frontend/node_modules
rm -rf backend/node_modules
rm -rf node_modules

# Удаляем локальные/env файлы (будут созданы заново)
rm -f backend/.env
rm -f frontend/.env
# .env в .gitignore — не попадут в репо
```

---

## Этап 2: Переименование и базовая конфигурация

### Шаг 2.1. Обновить package.json

**Корень `package.json`:**
```json
{
  "name": "umagazine",
  "scripts": {
    "migrate": "cd backend && node scripts/apply-migrations-to-db.js",
    "dev": "concurrently \"cd backend && npm run dev\" \"cd frontend && npm run dev\""
  }
}
```
Оставить только нужные скрипты, лишние (seed:case-seo, products:seed и т.п.) удалить.

**`backend/package.json`:**
```json
{
  "name": "umagazine-backend"
}
```

**`frontend/package.json`:**
```json
{
  "name": "umagazine-frontend"
}
```

### Шаг 2.2. Создать backend/.env.example

```env
# Database (PostgreSQL)
PGUSER=umagazine_user
PGHOST=localhost
PGDATABASE=umagazine_db
PGPASSWORD=твой_пароль
PGPORT=5432

# Server
PORT=3000
NODE_ENV=development

# CORS (для локальной разработки)
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# JWT
JWT_SECRET=случайная_строка_32_символа

# Site URL (для SEO, ссылок в письмах)
SITE_URL=http://localhost:3000
```

Скопировать в `backend/.env` и заполнить реальные значения.

### Шаг 2.3. Создать PostgreSQL-базу для Umagazine

```bash
# Подключиться к PostgreSQL (локально или на сервере)
psql -U postgres

# В psql:
CREATE USER umagazine_user WITH PASSWORD 'твой_пароль';
CREATE DATABASE umagazine_db OWNER umagazine_user;
GRANT ALL PRIVILEGES ON DATABASE umagazine_db TO umagazine_user;
\q
```

---

## Этап 3: Определить, что оставить в backend

### Минимальный набор (база для любой админки)

| Компонент | Действие |
|-----------|----------|
| `app.js` | Оставить, затем удалить лишние роуты |
| `db.js` | Оставить как есть |
| `middleware/auth.js` | Оставить |
| `middleware/seoRenderer.js` | Оставить (если нужен SSR для SPA) |
| `routes/auth.js` | Оставить (логин/регистрация) |
| `routes/pages.js` | Решить: оставить (если страницы из БД) или удалить |
| `routes/images.js` | Оставить (загрузка картинок) |
| `routes/errors.js` | Оставить (логирование ошибок) |
| `routes/cache.js` | Оставить |
| `routes/sitemap.js` | Адаптировать под Umagazine |

### Что удалить или временно отключить (зависит от функционала Umagazine)

- `routes/cases.js`, `routes/products.js`, `routes/orders.js`, `routes/cart.js`, `routes/wishlist.js`
- `routes/blog.js`, `routes/blogCategories.js`
- `routes/planner.js`, `routes/tasks.js`, `routes/projects.js`
- `routes/emailCampaigns.js`, `routes/chat.js`, `routes/chatbot.js`
- `routes/sites.js`, `routes/commercialProposals.js`
- `routes/salesAcademy.js`, `routes/salesAnalytics.js`
- `routes/funnels.js`, `routes/payments.js`, `routes/documents.js`
- `routes/donors.js`, `routes/charityPreferences.js`
- и т.д.

### Шаг 3.1. План очистки backend

1. Скопировать `backend/app.js` в `backend/app.js.backup`
2. В `app.js` удалить `import` неиспользуемых роутеров
3. Удалить соответствующие `app.use('/api/...', ...)`
4. Удалить папки `backend/routes/` для удалённых модулей (или оставить, но не подключать)
5. Миграции: оставить только нужные таблицы

---

## Этап 4: Миграции под Umagazine

### Шаг 4.1. Сбросить миграции под новую схему

Структура миграций в `backend/migrations/` — файлы `001_*.sql`, `002_*.sql` и т.д.

**Вариант A — начать с нуля:**

```bash
cd backend

# Удалить старые миграции (или перенести в archive/)
# Оставить скрипт apply-migrations-to-db.js

# Создать новую миграцию 001
mkdir -p migrations
```

Создать `backend/migrations/001_umagazine_init.sql`:

```sql
-- Базовые таблицы Umagazine
-- Пример: пользователи (если не используешь из prime-coder)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pages (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500),
  body TEXT,
  seo_title VARCHAR(255),
  seo_description TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Добавь таблицы под функционал Umagazine
```

**Вариант B — скопировать нужные таблицы из prime-coder:**

Изучить `backend/migrations/` в prime-coder, выбрать нужные (users, pages, blog_posts и т.д.), скопировать в Umagazine и адаптировать.

### Шаг 4.2. Применить миграции

```bash
cd backend
node scripts/apply-migrations-to-db.js
```

---

## Этап 5: Frontend — что оставить, что переписать

### Оставить (шаблон админки)

- `frontend/src/auth/` — AuthProvider, логин
- `frontend/src/components/` — AdminLayout, общие UI
- `frontend/src/utils/apiBase.ts`, `apiBase.js` — базовый URL API
- `frontend/vite.config.ts` (или .js)
- `frontend/index.html` — переименовать бренд

### Удалить или заменить

- `frontend/src/pages/` — почти все страницы (оставить только Login, возможно заглушку админки)
- `frontend/src/routes/AppRoutes.tsx` — упростить маршруты
- Страницы каталога, корзины, кейсов, блога и т.д.

### Шаг 5.1. Минимальный фронт для старта

1. Оставить только:
   - `/` — заглушка или лендинг Umagazine
   - `/admin` или `/login` — вход
   - `/admin/*` — защищённые страницы (пока пустые или одна заглушка)

2. В `AppRoutes.tsx` оставить:
   - `Route path="/"` — публичная
   - `Route path="/login"`
   - `Route path="/admin/*"` — с requireAuth

3. Обновить `index.html`: title, meta, брендинг на Umagazine.

---

## Этап 6: Первый запуск

### Шаг 6.1. Установка зависимостей

```bash
cd ~/Desktop/umagazine

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### Шаг 6.2. Запуск

```bash
# Терминал 1 — backend
cd backend && npm run dev

# Терминал 2 — frontend
cd frontend && npm run dev
```

Проверить:
- Backend: http://localhost:3000
- Frontend: http://localhost:5173
- Логин: если таблица `users` пуста — создать пользователя через SQL или добавить скрипт seed.

### Шаг 6.3. Создать первого админа (если нужен seed)

```sql
-- В psql:
INSERT INTO users (email, password_hash, name, role)
VALUES (
  'admin@umagazine.ru',
  -- bcrypt hash для пароля 'admin123'
  '$2a$10$...',  -- сгенерировать через node -e "console.log(require('bcryptjs').hashSync('admin123', 10))"
  'Admin',
  'admin'
);
```

Или добавить `backend/scripts/seed-admin.js` по аналогии с prime-coder.

---

## Этап 7: Git и первый пуш

```bash
cd ~/Desktop/umagazine

# Добавить всё кроме .env и node_modules (уже в .gitignore)
git add .
git status   # проверь, что .env не в списке

git commit -m "chore: initial Umagazine setup from prime-coder template"
git branch -M main
git push -u origin main
```

---

## Этап 8: Деплой (когда будет готово)

### На сервере

1. Создать директорию: `/var/www/umagazine` или `~/www/umagazine`
2. Клонировать: `git clone https://github.com/ТВОЙ_АККАУНТ/umagazine.git`
3. Создать `backend/.env` с прод-настройками (PGHOST, PGDATABASE и т.д.)
4. PostgreSQL: создать БД и пользователя
5. Запустить деплой-скрипт (скопировать и адаптировать `scripts/deploy-via-git.sh` из prime-coder)
6. Nginx: добавить server block для домена Umagazine

---

## Чек-лист

- [ ] Репозиторий umagazine создан
- [ ] Код скопирован, `.git` переинициализирован
- [ ] `package.json` обновлён
- [ ] `backend/.env` создан и заполнен
- [ ] PostgreSQL: БД umagazine_db создана
- [ ] Миграции применены
- [ ] Лишние backend-роуты удалены или отключены
- [ ] Frontend упрощён (минимальный набор страниц)
- [ ] Локально backend и frontend запускаются
- [ ] Первый коммит и push в umagazine

---

## Синхронизация с prime-coder (опционально)

Если позже нужно подтянуть улучшения из prime-coder:

```bash
git remote add primecoder https://github.com/VladLeonenko/primecoder-gulp.git
git fetch primecoder

# Посмотреть коммиты
git log primecoder/main --oneline

# Взять нужный коммит (например, улучшение auth)
git cherry-pick <commit-hash>
```

Использовать осторожно — конфликты неизбежны, т.к. проекты diverged.
