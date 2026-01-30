# План миграции на чистые React компоненты

## Текущая ситуация

### Чистые React компоненты ✅
- `/ai-team`, `/catalog`, `/products`, `/cart`, `/wishlist`, `/search`
- `/account/*`, `/portfolio`, `/cases`, `/reviews`, `/ai-chat`
- `/blog` (частично)

### Legacy HTML через PublicPageRenderer ⚠️
- `/` (главная) - `PublicHomePage` → HTML из БД
- `/:slug` (catch-all) - `PublicPageView` → HTML из БД для страниц конструктора

## Проблемы текущей архитектуры

1. **Дублирование логики**: legacy JS (`app.min.js`, `cursor.js`, `quiz-optimized.js`) + React
2. **Больше кода**: legacy скрипты + React компоненты
3. **Сложнее поддерживать**: два подхода, конфликты (курсор, стили)
4. **Медленнее**: загрузка legacy JS/CSS + React bundle
5. **Плохое SEO**: HTML из БД через `dangerouslySetInnerHTML`

## Преимущества миграции на React

1. **Единая архитектура**: один подход, проще поддерживать
2. **Меньше кода**: убираем legacy скрипты, переиспользуем React компоненты
3. **Быстрее**: один bundle, code splitting, lazy loading
4. **Лучше SEO**: SSR/SSG возможности, правильный HTML
5. **Проще тестировать**: React компоненты легче тестировать

## План миграции (поэтапно)

### Этап 1: Главная страница (`/`) - Приоритет ВЫСОКИЙ

**Текущее состояние:**
- `PublicHomePage` → `PublicPageRenderer` → HTML из БД
- Legacy скрипты: `app.min.js`, `cube-optimized.js`, `quiz-optimized.js`

**Шаги:**
1. Создать `HomePage.tsx` - чистый React компонент
2. Разбить на секции:
   - `HeroSection` - главный блок с частицами
   - `AdvantagesSection` - преимущества (уже есть `AdvantagesModernInjector`)
   - `ServicesSection` - услуги
   - `BlogSection` - блог (уже есть `BlogCarouselInjector`)
   - `ReviewsSection` - отзывы
   - `ContactFormSection` - форма обратной связи
3. Мигрировать логику:
   - Частицы → React компонент `ParticleCanvas`
   - Quiz форма → React компонент `QuizForm`
   - Карусели → React компоненты (уже есть `BlogCarousel`)
4. Убрать legacy скрипты: `app.min.js`, `cube-optimized.js`
5. Обновить роут: `<Route path="/" element={<HomePage />} />`

**Оценка:** 2-3 дня

### Этап 2: Страницы конструктора (`/:slug`) - Приоритет СРЕДНИЙ

**Текущее состояние:**
- `PublicPageView` → `PublicPageRenderer` → HTML из БД
- Динамические страницы из админки

**Варианты:**

#### Вариант A: Гибридный подход (рекомендуется)
- Популярные страницы (`/about`, `/contacts`, `/services`) → чистые React компоненты
- Остальные → оставить через `PublicPageView` (постепенная миграция)

#### Вариант B: Полная миграция
- Создать React компоненты для всех страниц
- Использовать данные из БД для контента, но рендерить через React

**Шаги (Вариант A):**
1. Определить топ-10 страниц для миграции
2. Создать React компоненты для каждой
3. Обновить роуты с приоритетом (специфичные роуты перед catch-all)
4. Постепенно мигрировать остальные

**Оценка:** 1-2 недели (по 1-2 страницы в день)

### Этап 3: Оптимизация - Приоритет НИЗКИЙ

1. **Code splitting**: lazy loading для страниц
2. **SSR/SSG**: рассмотреть Next.js для SEO
3. **Удаление legacy**: полностью убрать `PublicPageRenderer`, legacy скрипты
4. **Оптимизация bundle**: tree shaking, минификация

## Пример миграции главной страницы

### До (PublicHomePage):
```tsx
// HTML из БД + legacy скрипты
<PublicPageRenderer html={fullHtml} />
<script src="/legacy/js/app.min.js"></script>
<script src="/legacy/js/cube-optimized.js"></script>
```

### После (HomePage):
```tsx
// Чистый React
<HeroSection />
<AdvantagesSection />
<ServicesSection />
<BlogSection />
<ReviewsSection />
<ContactFormSection />
```

## Риски и митигация

1. **Потеря функциональности**: тщательное тестирование каждой секции
2. **Время миграции**: поэтапный подход, не блокирует разработку
3. **SEO**: использовать SSR/SSG для критичных страниц
4. **Обратная совместимость**: оставить `PublicPageView` для неперенесённых страниц

## Метрики успеха

- ✅ Уменьшение bundle size на 30-40%
- ✅ Улучшение Lighthouse score на 10-15 пунктов
- ✅ Упрощение кодовой базы (удаление legacy скриптов)
- ✅ Единая архитектура (только React)

## Следующие шаги

1. **Сейчас**: начать с главной страницы (`/`)
2. **Через неделю**: мигрировать топ-5 страниц конструктора
3. **Через месяц**: полная миграция или гибридный подход

