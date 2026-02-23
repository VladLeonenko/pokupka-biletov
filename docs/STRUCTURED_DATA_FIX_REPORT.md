# Отчёт: исправление ошибки GSC «Недопустимый тип объекта в поле parent_node»

## Проблема

Google Search Console сообщал об ошибке structured data: **«Недопустимый тип объекта в поле parent_node»** на страницах услуг. Такие элементы не могут отображаться как расширенные результаты поиска.

## Исправленные файлы

### 1. `frontend/src/components/common/ProductJsonLd.tsx` (страницы услуг /catalog/*)

**Изменения:**
- Удалён `aggregateRating` из типа Service — Google не поддерживает рейтинг для Service в расширенных результатах, лишнее поле могло вызывать ошибку
- `provider.logo` переведён в `ImageObject`: `{ '@type': 'ImageObject', url: '...' }`
- Упрощён `areaServed`: `{ '@type': 'Country', name: 'Россия' }`
- Добавлен `url` в `seller` внутри Offer

### 2. `frontend/src/components/common/BreadcrumbJsonLd.tsx`

**Изменения:**
- Поле `item` в ListItem переведено из строки URL в объект: `item: { '@id': url }` — валидаторы ожидают объект с @id, а не строку

### 3. `frontend/index.html` (главная + ProfessionalService)

**Изменения:**
- `GeoCoordinates`: `latitude` и `longitude` заменены со строк на числа (`55.7558`, `37.6173`)
- `AggregateRating`: `ratingValue`, `bestRating`, `reviewCount` переведены в числа; добавлен `worstRating`

## Проверенные страницы с JSON-LD

| Страница | Компоненты | Статус |
|----------|------------|--------|
| `/` (главная) | index.html: WebSite, ProfessionalService | Исправлено |
| `/catalog`, `/catalog/:slug` | ProductJsonLd, BreadcrumbJsonLd, FaqJsonLd | Исправлено |
| Остальные (блог, кейсы, about и т.д.) | SeoMetaTags (Organization/Article) | Корректно |
| Страницы из БД (pages) | structured_data в pages | Ручная проверка через админку |

## Рекомендации после деплоя

1. Проверить страницы в [Rich Results Test](https://search.google.com/test/rich-results)
2. Запросить переиндексацию в GSC
3. Ошибки обычно обновляются в GSC в течение 3–14 дней
