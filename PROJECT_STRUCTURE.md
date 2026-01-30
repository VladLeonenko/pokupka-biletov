# Структура проекта PrimeCoder

## 📁 Новая организация проекта

Проект был реорганизован для упрощения развертывания и поддержки. Все исходники теперь находятся в двух основных папках:

```
primecoder-gulp/
├── frontend/              # React приложение + legacy код
│   ├── src/              # React компоненты и логика
│   │   ├── components/   # React компоненты
│   │   │   └── public/
│   │   │       └── Advantages3D.tsx  # ✨ Новый 3D блок преимуществ
│   │   ├── pages/        # Страницы приложения
│   │   ├── services/     # API сервисы
│   │   └── styles/       # CSS стили
│   ├── public/           # Статические файлы
│   │   ├── robots.txt    # Конфигурация для поисковых роботов
│   │   ├── sitemap.xml   # Карта сайта
│   │   ├── .htaccess     # Конфигурация Apache
│   │   └── legacy/       # Legacy статические файлы (HTML/CSS/JS/IMG)
│   ├── dist/             # Собранное приложение (не в git)
│   ├── package.json      # Зависимости frontend
│   ├── tsconfig.json     # TypeScript конфигурация
│   └── vite.config.ts    # Vite конфигурация
│
├── backend/              # Node.js сервер
│   ├── routes/           # API маршруты
│   ├── models/           # Модели данных
│   ├── middleware/       # Промежуточное ПО
│   ├── uploads/          # Загруженные файлы
│   ├── migrations/       # Миграции БД
│   ├── app.js            # Главный файл сервера
│   ├── db.js             # Конфигурация БД
│   └── package.json      # Зависимости backend
│
└── README.md             # Основная документация
```

## 🎨 Новые возможности

### 1. 3D блок "Преимущества" (Advantages3D)

Создан современный компонент с 3D анимациями и интерактивными эффектами:
- ✨ Плавные анимации появления карточек
- 🎯 3D эффекты при наведении
- 🌈 Градиентные цветные акценты
- 📱 Адаптивный дизайн
- 🎨 Поддержка светлой и темной темы
- 🔄 Анимированный фон с движущимися элементами

**Технологии:** React + Material-UI + Framer Motion

### 2. Технические файлы для релиза

#### robots.txt
- Настроенная индексация для поисковых систем
- Исключение административных разделов
- Ссылка на sitemap.xml
- Оптимизация для Яндекс и Google

#### sitemap.xml
- Полная карта сайта со всеми страницами
- Правильные приоритеты и частота обновления
- Готовность к индексации

#### .htaccess
- HTTPS редирект
- Удаление www
- SPA роутинг
- GZIP сжатие
- Кэширование статических файлов
- Безопасность (CSP, CORS)
- Защита от hotlinking
- Кастомные страницы ошибок

## 🚀 Быстрый старт

### Разработка

```bash
# Backend
cd backend
npm install
node app.js

# Frontend (в новом терминале)
cd frontend
npm install
npm run dev
```

### Продакшн сборка

```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
node app.js
```

## 📦 Развертывание

### Подготовка к релизу

1. **Frontend сборка:**
```bash
cd frontend
npm run build
```
Собранные файлы появятся в `frontend/dist/`

2. **Backend подготовка:**
```bash
cd backend
npm install --production
```

3. **База данных:**
```bash
cd backend
# Выполнить миграции
node scripts/migrate.js
```

### Загрузка на сервер

1. Загрузите содержимое `frontend/dist/` в корень веб-сервера
2. Загрузите папку `backend/` на сервер
3. Настройте `.env` файл в backend с параметрами БД
4. Настройте Nginx/Apache для проксирования API запросов к backend
5. Запустите backend через PM2:
```bash
pm2 start backend/app.js --name primecoder-api
```

### Конфигурация веб-сервера

**Nginx пример:**
```nginx
server {
    listen 80;
    server_name primecoder.ru www.primecoder.ru;
    root /var/www/primecoder/frontend/dist;
    index index.html;

    # Статические файлы
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API прокси
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Загрузки
    location /uploads/ {
        proxy_pass http://localhost:3000/uploads/;
    }
}
```

**Apache пример:**
Используйте `.htaccess` файл из `frontend/public/.htaccess`

## 🔧 Настройка окружения

### Backend (.env)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/primecoder
CORS_ORIGIN=https://primecoder.ru,https://www.primecoder.ru
JWT_SECRET=your-secret-key
OPENAI_API_KEY=your-openai-key
```

### Frontend (vite.config.ts)

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000'
    }
  }
})
```

## 📝 Миграция старой структуры

### Старая структура (устарела):
- `/src` - исходники HTML/CSS/JS (legacy)
- `/dist` - собранные файлы Gulp
- `/gulp` - задачи Gulp

### Новая структура:
- Все legacy файлы перенесены в `/frontend/public/legacy`
- Gulp больше не используется для основной сборки
- React приложение собирается через Vite

### Если нужно обновить legacy код:
1. Редактируйте файлы в `/frontend/public/legacy`
2. Или используйте старую структуру через Gulp (временно)

## 🎯 Основные компоненты

### React компоненты

- `Advantages3D` - Современный 3D блок преимуществ
- `ThemeToggle` - Переключатель темы (светлая/темная)
- `EcommerceHeaderIcons` - Иконки корзины, избранного, поиска
- `PublicPageRenderer` - Рендер legacy HTML страниц
- `ChatWidget` - Виджет онлайн чата

### API эндпоинты

- `/api/public/*` - Публичные API
- `/api/blog/*` - Блог
- `/api/products/*` - Товары
- `/api/cart` - Корзина
- `/api/wishlist` - Избранное
- `/api/chat` - Чат
- `/api/admin/*` - Админ панель (требует авторизации)

## 🔐 Безопасность

- CORS настроен в `backend/app.js`
- JWT токены для авторизации
- Защита от SQL injection
- Валидация всех входных данных
- HTTPS обязателен в продакшене
- CSP заголовки в `.htaccess`

## 📊 Мониторинг

Используйте PM2 для мониторинга backend:

```bash
# Статус
pm2 status

# Логи
pm2 logs primecoder-api

# Перезапуск
pm2 restart primecoder-api

# Автозапуск при перезагрузке
pm2 startup
pm2 save
```

## 🐛 Отладка

### Frontend
- Откройте DevTools в браузере
- Проверьте вкладку Console на ошибки
- Проверьте вкладку Network на проблемы с загрузкой

### Backend
- Проверьте логи: `pm2 logs` или `node app.js`
- Проверьте подключение к БД
- Проверьте CORS настройки

## 📚 Дополнительная документация

- `SEO_TOOLS_DOCUMENTATION.md` - SEO инструменты
- `MIGRATION_PLAN.md` - План миграции
- `TESTING_REPORT.md` - Отчет о тестировании

## 🤝 Поддержка

При возникновении проблем обращайтесь:
- Email: info@primecoder.ru
- Telegram: @primecoder

---

**Последнее обновление:** 9 января 2025
**Версия:** 2.0.0

