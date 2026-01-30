import React from 'react';
import DOMPurify from 'dompurify';

/**
 * Преобразует HTML строку в React элементы, сохраняя все классы, стили и структуру
 */
export function htmlToReact(html: string): React.ReactElement[] {
  if (!html) return [];

  // Очищаем HTML от лишних тегов (body, html, head)
  let cleaned = html
    .replace(/<\/?body[^>]*>/gi, '')
    .replace(/<\/?html[^>]*>/gi, '')
    .replace(/<\/?head[^>]*>/gi, '');

  // Удаляем header и footer если есть
  cleaned = cleaned.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
  cleaned = cleaned.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
  cleaned = cleaned.replace(/@@include\(['"]html\/header\.html['"]\)/gi, '');
  cleaned = cleaned.replace(/@@include\(['"]html\/footer\.html['"]\)/gi, '');

  // Санитизируем HTML
  const sanitized = DOMPurify.sanitize(cleaned, {
    ALLOWED_TAGS: [
      'div', 'section', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'span', 'a', 'img', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u',
      'br', 'hr', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'form', 'input', 'textarea', 'button', 'select', 'option', 'label',
      'article', 'aside', 'main', 'nav', 'header', 'footer'
    ],
    ALLOWED_ATTR: [
      'class', 'id', 'href', 'src', 'alt', 'title', 'target', 'rel',
      'type', 'name', 'value', 'placeholder', 'required', 'for',
      'style', 'data-*', 'aria-*', 'role', 'tabindex'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    KEEP_CONTENT: true,
  });

  // Создаем временный контейнер для парсинга
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = sanitized;

  // Рекурсивно преобразуем DOM элементы в React элементы
  const convertElement = (element: Node): React.ReactNode => {
    if (element.nodeType === Node.TEXT_NODE) {
      const text = element.textContent || '';
      return text.trim() ? text : null;
    }

    if (element.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const el = element as HTMLElement;
    const tagName = el.tagName.toLowerCase();

    // Собираем все атрибуты
    const props: any = {};
    Array.from(el.attributes).forEach(attr => {
      if (attr.name === 'style' && attr.value) {
        // Парсим inline стили
        const styles: React.CSSProperties = {};
        attr.value.split(';').forEach(style => {
          const [key, value] = style.split(':').map(s => s.trim());
          if (key && value) {
            const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            styles[camelKey as keyof React.CSSProperties] = value;
          }
        });
        props.style = styles;
      } else if (attr.name === 'class') {
        props.className = attr.value;
      } else if (attr.name === 'for') {
        props.htmlFor = attr.value;
      } else {
        props[attr.name] = attr.value;
      }
    });

    // Рекурсивно обрабатываем дочерние элементы
    const children = Array.from(el.childNodes)
      .map(convertElement)
      .filter(child => child !== null);

    // Создаем React элемент
    return React.createElement(tagName, props, ...children);
  };

  // Преобразуем все дочерние элементы
  const reactElements = Array.from(tempDiv.childNodes)
    .map(convertElement)
    .filter(el => el !== null) as React.ReactElement[];

  return reactElements;
}

