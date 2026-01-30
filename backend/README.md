# Backend (Express + PostgreSQL)

## .env

Заполните данные подключения к PostgreSQL:

```
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=...
PGDATABASE=primecoder
```

## Установка и запуск

```
npm install
npm run migrate
npm run import:src
npm run dev
```

- `migrate` — создаёт таблицы `pages`, `images`
- `import:src` — импортирует все `.html` из `../src` как страницы и копирует изображения из `../src/img` в `backend/uploads` + регистрирует их в БД
- API доступен на `http://localhost:3000`
  - `GET /api/pages` — список страниц
  - `GET /api/pages/:slug` — страница
  - `POST /api/pages` — создать
  - `PUT /api/pages/:slug` — обновить
  - `DELETE /api/pages/:slug` — удалить
  - `POST /api/pages/:slug/publish` — опубликовать/скрыть `{ is_published: boolean }`
  - `POST /api/pages/:slug/move` — перенести/сменить путь `{ newSlug: string }`
  - `POST /api/images` — загрузка изображения (multer), поле `img`
  - `GET /uploads/*` — статика загруженных файлов

## Примечания
- Сервер фронтенда поднимается отдельно (Vite). В проде можно отдать сборку через Nginx.




