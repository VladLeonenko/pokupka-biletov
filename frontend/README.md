# Admin CMS (frontend)

Админ-панель на React + TypeScript + Vite.

## Быстрый старт

1) Установите зависимости:

```bash
npm install
```

2) Запустите локально:

```bash
npm run dev
```

Откройте адрес из консоли (обычно `http://localhost:5173`).

## Структура

- `src/components/layout` — общий макет с левым сайдбаром и верхней панелью
- `src/pages` — страницы админки: Dashboard, Pages, Blog, SEO
- `src/routes/AppRoutes.tsx` — роутинг
- `src/services` — источники данных и API-слой (пока локальный)
- `src/types` — типы доменной модели
- `src/store` — локальное хранилище (localStorage)

## Работа со страницами из dist

- В продакшене сайт уже собран в `../dist` (относительно папки `frontend`).
- Мы читаем все файлы `../dist/**/*.html` через возможности Vite: `import.meta.glob(..., { as: 'raw', eager: true })`.
- Для этого в `vite.config.ts` разрешён доступ к уровню выше (`server.fs.allow`).
- Список страниц и контент отображаются в разделе "Страницы". Изменения пока сохраняются в `localStorage` (не в файлы).

Ограничения текущей версии:
- Редактирование HTML и SEO сохраняется локально (в браузере) до подключения backend API.
- Страницы из `dist` не перезаписываются на диске — это будет реализовано через backend.

## Блог и SEO

- Блог: список, создание/редактирование/удаление постов — данные сохраняются в `localStorage`.
- SEO: можно назначать мета-данные для выбранной страницы. Данные также в `localStorage`.

## Подключение к backend (следующий шаг)

Слой `src/services/cmsApi.ts` спроектирован так, чтобы его было просто заменить на вызовы вашего backend API:
- `listSitePages`, `getSitePage`, `updateSitePage`
- `listBlogPosts`, `getBlogPost`, `upsertBlogPost`, `deleteBlogPost`
- `getSeoOverrides`, `setSeoOverrides`

Достаточно изменить реализации, оставив сигнатуры методов прежними.

## Требования окружения

- Node.js >= 18
- npm >= 9

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
