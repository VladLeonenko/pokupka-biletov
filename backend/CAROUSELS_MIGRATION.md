# Миграция каруселей

## Статус миграции

✅ Все существующие карусели перенесены в базу данных:

1. **main-vertical-carousel** - Вертикальная карусель на главной (6 слайдов) ✅
2. **blog-filters** - Фильтры блога (1 слайд) ✅
3. **blog-nonloop** - Карусель блога на главной (6 слайдов) ✅
4. **menu-nav** - Навигационное меню (нужно заполнить вручную)
5. **team** - Команда (нужно заполнить вручную)
6. **cases-team** - Команда в кейсах (нужно заполнить вручную)
7. **ads-team** - Команда в продуктах (нужно заполнить вручную)

## Использование каруселей на страницах

### Способ 1: Через data-carousel атрибут

Добавьте на страницу:
```html
<div data-carousel="main-vertical-carousel"></div>
```

Карусель автоматически загрузится из API и отобразится через нативный JS компонент.

### Способ 2: Через API в React

```typescript
import { getPublicCarousel } from '@/services/carouselsApi';

const carousel = await getPublicCarousel('main-vertical-carousel');
// Используйте данные карусели для рендеринга
```

## Управление каруселями

Все карусели доступны для редактирования в админ-панели:
- `/admin/carousels` - Список всех каруселей
- `/admin/carousels/:id` - Редактирование карусели

## Запуск миграции

Если нужно обновить карусели из HTML:
```bash
cd backend
npm run migrate:carousels
```

## Замена owlCarousel/slick

Старые карусели (owlCarousel, slick) можно заменить на новые:

1. Удалите инициализацию owlCarousel/slick из `app.js`
2. Добавьте `data-carousel="slug"` атрибут на HTML элементы
3. Подключите `native-carousel.js` скрипт
4. Удалите зависимости от jQuery и owlCarousel/slick



