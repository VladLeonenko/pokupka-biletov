# SEO аудит мета-тегов

## Стандарты SEO

- **Title**: 50–60 символов, уникальный на страницу, ключевые слова в начале
- **Description**: 150–160 символов, призыв к действию, уникальный
- **Keywords**: релевантные ключевые фразы
- **Canonical URL**: абсолютный URL страницы
- **noindex**: для служебных/личных страниц (корзина, избранное, ЛК, регистрация)
- **Open Graph / Twitter Card**: для соцсетей

## Покрытие страниц

| Страница | Route | Title | Description | Canonical | noindex |
|----------|-------|-------|-------------|-----------|---------|
| Главная | / | ✓ | ✓ | ✓ | — |
| AI Boost Team | /ai-team | ✓ | ✓ | ✓ | — |
| Каталог | /catalog | ✓ | ✓ | ✓ | — |
| Товар | /products/:slug | ✓ (из CMS) | ✓ | ✓ | — |
| Корзина | /cart | ✓ | ✓ | ✓ | ✓ |
| Избранное | /wishlist | ✓ | ✓ | ✓ | ✓ |
| Поиск | /search | ✓ | ✓ | ✓ | ✓ |
| Личный кабинет | /account | ✓ | ✓ | ✓ | ✓ |
| AI Boost ЛК | /account/ai-team | ✓ | ✓ | ✓ | ✓ |
| Проекты | /account/projects | ✓ | ✓ | ✓ | ✓ |
| Личное развитие | /account/personal-development | ✓ | ✓ | ✓ | ✓ |
| Финансы | /account/finance-planner | ✓ | ✓ | ✓ | ✓ |
| Приватность | /account/privacy-settings | ✓ | ✓ | ✓ | ✓ |
| Политика | /politic, /privacy | ✓ | ✓ | ✓ | — |
| Регистрация | /register | ✓ | ✓ | ✓ | ✓ |
| Позиции | /tools/position-checker | ✓ | ✓ | ✓ | — |
| Аудит | /tools/technical-audit | ✓ | ✓ | ✓ | — |
| Репутация | /tools/reputation-monitor | ✓ | ✓ | ✓ | — |
| ROI | /tools/roi-calculator | ✓ | ✓ | ✓ | — |
| Заказ | /orders/:orderNumber | ✓ | ✓ | ✓ | ✓ |
| Блог | /blog | ✓ | ✓ | ✓ | — |
| Статья | /blog/:slug | ✓ (из CMS) | ✓ | ✓ | — |
| Акции | /promotion | ✓ | ✓ | ✓ | — |
| Портфолио | /portfolio | ✓ | ✓ | ✓ | — |
| Кейсы | /cases/:slug | ✓ | ✓ | ✓ | — |
| Winners | /cases/winners | ✓ | ✓ | ✓ | — |
| Благотворительность | /charity | ✓ | ✓ | ✓ | — |
| Отзывы | /reviews | ✓ | ✓ | ✓ | — |
| AI Чат | /ai-chat | ✓ | ✓ | ✓ | ✓ |
| О нас | /about | ✓ | ✓ | ✓ | — |
| Контакты | /contacts | ✓ | ✓ | ✓ | — |
| Новый клиент | /new-client | ✓ | ✓ | ✓ | — |
| 404 | /404, * | ✓ | ✓ | ✓ | ✓ |

## Динамические страницы CMS

- **PublicPageView** (`/:slug`): SEO из `page.seo` (metaTitle, metaDescription, canonical)
- **ProductPage**: SEO из `product` (metaTitle, metaDescription, metaKeywords)
- **PublicBlogPostPage**: SEO из `post.seo`
- **CasePage**: SEO из `caseData`

## Унификация

- **Бренд**: PrimeCoder (с заглавной C)
- **Разделитель**: длинное тире — (не дефис -)

## Рекомендации

1. Добавить `keywords` на все публичные страницы, где ещё нет
2. Для инструментов (/tools/*) рассмотреть noindex, если не нужна индексация
3. Проверить длину title/description на главных страницах (50–60 / 150–160)
4. Добавить og:image на страницы товаров и кейсов для красивого шаринга
