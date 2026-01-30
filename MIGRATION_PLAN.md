# План миграции с iframe на полноценный рендеринг

## Текущая ситуация
- Страницы отображаются через iframe с `srcdoc`
- HTML берется из базы данных и вставляется в iframe
- Это работает, но не оптимально для продакшена

## Варианты решения

### Вариант 1: Прямой рендеринг HTML в React (Рекомендуется)
**Преимущества:**
- Быстрая миграция
- Сохраняется существующий HTML/CSS/JS
- Хорошая производительность
- SEO-friendly

**Как работает:**
1. HTML из БД рендерится напрямую в React компонент через `dangerouslySetInnerHTML`
2. JavaScript инициализируется после рендера
3. React Router управляет навигацией
4. Все работает без iframe

**Шаги:**
1. Создать компонент `PublicPageRenderer` который:
   - Получает HTML из API
   - Рендерит его напрямую через `dangerouslySetInnerHTML`
   - Инициализирует скрипты через `useEffect`
   - Обрабатывает ссылки для SPA навигации

2. Заменить iframe на прямой рендеринг во всех `Public*Page` компонентах

3. Добавить обработку скриптов:
   - Извлечь `<script>` теги из HTML
   - Выполнить их в правильном порядке
   - Обеспечить изоляцию (чтобы не конфликтовать с React)

### Вариант 2: SSR (Server-Side Rendering) с Next.js
**Преимущества:**
- Идеально для SEO
- Отличная производительность
- Оптимизация из коробки

**Недостатки:**
- Требует миграции на Next.js
- Больше изменений в коде

### Вариант 3: Static Site Generation (SSG)
**Преимущества:**
- Максимальная производительность
- Можно хостить на CDN
- Отличное SEO

**Недостатки:**
- Нужно пересобирать при изменении контента
- Сложнее для динамического контента

## Рекомендуемый план действий

### Этап 1: Прямой рендеринг (Быстро)
1. Создать `PublicPageRenderer` компонент
2. Заменить iframe на прямой рендеринг
3. Добавить обработку скриптов
4. Протестировать на всех страницах

### Этап 2: Оптимизация (Средний срок)
1. Оптимизировать загрузку скриптов
2. Добавить lazy loading для изображений
3. Оптимизировать CSS
4. Добавить кэширование

### Этап 3: SSR (Долгосрочно)
1. Рассмотреть миграцию на Next.js
2. Реализовать SSR для страниц
3. Оптимизировать для SEO

## Пример реализации (Вариант 1)

```typescript
// frontend/src/components/public/PublicPageRenderer.tsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';

export function PublicPageRenderer({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // Очищаем HTML от потенциально опасного кода
    const cleanHtml = DOMPurify.sanitize(html, {
      ADD_TAGS: ['script'],
      ADD_ATTR: ['onclick', 'onload'],
    });

    // Вставляем HTML
    container.innerHTML = cleanHtml;

    // Извлекаем и выполняем скрипты
    const scripts = container.querySelectorAll('script');
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });

    // Обрабатываем ссылки для SPA навигации
    const links = container.querySelectorAll('a');
    links.forEach((link) => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('/admin')) {
          e.preventDefault();
          navigate(href);
        }
      });
    });

    // Cleanup
    return () => {
      links.forEach((link) => {
        link.removeEventListener('click', () => {});
      });
    };
  }, [html, navigate]);

  return <div ref={containerRef} />;
}
```

## После миграции вы получите:

✅ **SEO-оптимизированные страницы** - поисковики видят весь контент
✅ **Быстрая загрузка** - нет overhead от iframe
✅ **Правильная навигация** - работают кнопки "Назад/Вперед"
✅ **Мобильная оптимизация** - нет проблем с прокруткой
✅ **Аналитика** - все события отслеживаются корректно
✅ **Прямые ссылки** - можно делиться ссылками на конкретные страницы

## Время на реализацию

- **Вариант 1 (Прямой рендеринг)**: 2-4 часа работы
- **Вариант 2 (SSR)**: 1-2 дня работы
- **Вариант 3 (SSG)**: 2-3 дня работы

## Рекомендация

Начать с **Варианта 1** - это быстро и даст все преимущества без iframe.
Затем, при необходимости, можно мигрировать на SSR для еще лучшей оптимизации.



