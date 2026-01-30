import { useMemo } from 'react';
import DOMPurify from 'dompurify';

interface SafeHtmlRendererProps {
  html: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Компонент для безопасного рендеринга HTML из БД
 * Сохраняет всю структуру, классы и стили
 */
export function SafeHtmlRenderer({ html, className = '', style }: SafeHtmlRendererProps) {
  const sanitizedHtml = useMemo(() => {
    if (!html) return '';

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

    // Удаляем скрипты (они не должны выполняться в React)
    cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleaned = cleaned.replace(/<script[^>]*\/>/gi, '');

    // Удаляем курсоры (они управляются через React)
    cleaned = cleaned.replace(/<div[^>]*class=["'][^"']*cursor[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');

    // Санитизируем HTML, но сохраняем все классы, стили и структуру
    return DOMPurify.sanitize(cleaned, {
      ALLOWED_TAGS: [
        'div', 'section', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'span', 'a', 'img', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u', 'sub', 'sup',
        'br', 'hr', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
        'form', 'input', 'textarea', 'button', 'select', 'option', 'label', 'fieldset', 'legend',
        'article', 'aside', 'main', 'nav', 'header', 'footer', 'figure', 'figcaption',
        'dl', 'dt', 'dd', 'address', 'time', 'mark', 'small', 'abbr', 'cite', 'q', 'samp', 'var'
      ],
      ALLOWED_ATTR: [
        'class', 'id', 'href', 'src', 'alt', 'title', 'target', 'rel',
        'type', 'name', 'value', 'placeholder', 'required', 'for', 'id',
        'style', 'data-*', 'aria-*', 'role', 'tabindex', 'disabled', 'checked', 'selected',
        'width', 'height', 'colspan', 'rowspan', 'scope', 'headers', 'abbr',
        'start', 'reversed', 'download', 'hreflang', 'media', 'sizes', 'srcset'
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      KEEP_CONTENT: true,
      ADD_ATTR: ['target'], // Разрешаем target для ссылок
    });
  }, [html]);

  if (!sanitizedHtml) {
    return null;
  }

  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}

