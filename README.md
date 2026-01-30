# PrimeCoder - Web Development Platform

Современная платформа для разработки и управления веб-проектами с админ-панелью и публичным сайтом.

## 🏗️ Структура проекта

```
primecoder-gulp/
├── frontend/          # React приложение (Vite + TypeScript)
│   ├── src/          # Исходный код React
│   ├── public/       # Статические файлы
│   │   ├── legacy/   # Legacy статические файлы (CSS, JS, изображения)
│   │   ├── robots.txt
│   │   ├── sitemap.xml
│   │   └── .htaccess
│   └── dist/         # Собранная версия (production build)
│
└── backend/          # Express сервер (Node.js)
    ├── routes/       # API маршруты
    ├── migrations/   # Миграции базы данных
    ├── uploads/      # Загруженные файлы
    └── app.js        # Точка входа сервера
```

## 🚀 Быстрый старт

### Требования

- Node.js >= 18.x
- PostgreSQL >= 14.x
- npm или yarn

### Установка

1. **Установите зависимости для backend:**

```bash
cd backend
npm install
```

2. **Установите зависимости для frontend:**

```bash
cd frontend
npm install
```

3. **Настройте переменные окружения:**

Создайте файл `backend/.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/primecoder
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
JWT_SECRET=your-secret-key
OPENAI_API_KEY=your-openai-api-key
```

4. **Запустите миграции базы данных:**

```bash
cd backend
npm run migrate
```

### Разработка

**Backend (порт 3000):**

```bash
cd backend
node app.js
```

**Frontend (порт 5173):**

```bash
cd frontend
npm run dev
```

Откройте http://localhost:5173 для доступа к сайту.

### Production сборка

1. **Соберите frontend:**

```bash
cd frontend
npm run build
```

2. **Запустите backend:**

```bash
cd backend
node app.js
```

Backend будет раздавать собранную версию frontend из `frontend/dist/`.

## 📦 Основные возможности

### Frontend

- ⚛️ React 18 с TypeScript
- 🎨 Material-UI компоненты
- 🌓 Светлая/темная тема
- 📱 Полностью адаптивный дизайн
- 🎭 3D анимации (Three.js, GSAP)
- 🛒 E-commerce функциональность
- 📝 Rich-text редактор для контента
- 🖼️ Управление изображениями и медиа

### Backend

- 🚀 Express.js сервер
- 🗄️ PostgreSQL база данных
- 🔐 JWT аутентификация
- 📊 RESTful API
- 🤖 Интеграция с OpenAI
- 💬 Система чата с файлами
- 📧 Email уведомления
- 🎯 SEO инструменты

## 🎨 Новый блок преимуществ

Реализован современный блок Advantages3D с:
- 3D анимациями (rotate, float, glow)
- Адаптивным дизайном
- Поддержкой темной/светлой темы
- Статистикой компании
- 6 ключевых преимуществ

## 📄 Технические файлы

### robots.txt
Находится в `frontend/public/robots.txt`. Настроен для:
- Разрешения индексации основного контента
- Блокировки административных разделов
- Указания пути к sitemap

### sitemap.xml
Находится в `frontend/public/sitemap.xml`. Включает:
- Все основные страницы сайта
- SEO инструменты
- Статьи блога
- Кейсы и портфолио

### .htaccess
Находится в `frontend/public/.htaccess`. Настроен для:
- Принудительного HTTPS
- Удаления www
- SPA роутинга
- CORS для статических файлов
- Кэширования
- Безопасности

## 🔧 API Endpoints

### Публичные endpoints

- `GET /api/public/pages/:slug` - Получить страницу
- `GET /api/public/blog` - Список статей блога
- `GET /api/public/portfolio` - Портфолио
- `GET /api/public/products` - Каталог продуктов
- `POST /api/forms/submit` - Отправка формы

### Административные endpoints (требуют аутентификации)

- `POST /api/auth/login` - Вход в админ-панель
- `GET /api/admin/pages` - Управление страницами
- `POST /api/admin/blog` - Управление блогом
- `POST /api/admin/upload` - Загрузка файлов

## 🎯 SEO инструменты

Встроенные SEO инструменты доступны по адресам:
- `/seo/position-checker` - Проверка позиций в поисковиках
- `/seo/technical-audit` - Технический аудит сайта
- `/seo/roi-calculator` - Калькулятор ROI
- `/seo/reputation-monitor` - Мониторинг репутации

## 📱 Контакты и поддержка

- **Email:** info@primecoder.ru
- **Телефон:** +7 (999) 984-91-07
- **Сайт:** https://primecoder.ru

## 📝 Лицензия

Proprietary - все права защищены © 2025 PrimeCoder

---

**Разработано с ❤️ командой PrimeCoder**

