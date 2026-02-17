/**
 * Парсит HTML body статьи в блоки для редактора.
 * Поддерживает: article-intro, article-table, grid (stats), article-faq, article-cta, pre/code, обычный текст.
 */
import type { BlogBlock } from '@/types/blogBlocks';

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function elText(el: Element): string {
  return (el.textContent || '').trim();
}

function elHtml(el: Element): string {
  return (el as HTMLElement).innerHTML.trim();
}

export function htmlToBlocks(html: string): BlogBlock[] {
  if (!html || typeof html !== 'string') return [];
  if (typeof document === 'undefined') return [];

  const div = document.createElement('div');
  div.innerHTML = html;

  const blocks: BlogBlock[] = [];
  let textBuffer = '';

  const flushText = () => {
    const trimmed = textBuffer.trim();
    if (trimmed) {
      blocks.push({ id: genId('text'), type: 'text', content: { html: trimmed } });
      textBuffer = '';
    }
  };

  const walk = (parent: Element) => {
    for (const el of Array.from(parent.children)) {
      const tag = el.tagName.toLowerCase();
      const cls = (el.getAttribute('class') || '').toLowerCase();

      // article-intro -> intro block
      if (cls.includes('article-intro')) {
        flushText();
        const h2 = el.querySelector('h2');
        const ps = el.querySelectorAll('p');
        const a = el.querySelector('a');
        const title = h2 ? elText(h2) : '';
        const text = Array.from(ps)
          .map((p) => elHtml(p))
          .filter(Boolean)
          .join('\n\n');
        const ctaLink = a?.getAttribute('href') || '';
        const ctaText = a ? elText(a) : '';
        blocks.push({
          id: genId('intro'),
          type: 'intro',
          content: {
            title,
            text,
            ...(ctaText && ctaLink ? { ctaText, ctaUrl: ctaLink } : {}),
          },
        });
        continue;
      }

      // article-table -> table block
      if (cls.includes('article-table')) {
        flushText();
        const table = el.querySelector('table');
        if (table) {
          let headers: string[] = [];
          const thead = table.querySelector('thead tr');
          if (thead) {
            thead.querySelectorAll('th').forEach((th) => headers.push(elText(th)));
          }
          const rows: string[][] = [];
          table.querySelectorAll('tbody tr').forEach((tr) => {
            const row = Array.from(tr.querySelectorAll('td')).map((td) => elText(td));
            if (row.length > 0) rows.push(row);
          });
          if (headers.length === 0 && rows.length > 0) {
            headers = rows[0];
            rows = rows.slice(1);
          }
          if (headers.length > 0 || rows.length > 0) {
            blocks.push({ id: genId('table'), type: 'table', content: { headers, rows } });
          }
        }
        continue;
      }

      // grid with grid-item -> stats block
      if (cls.includes('grid')) {
        flushText();
        const items: Array<{ value: string; label: string }> = [];
        el.querySelectorAll('.grid-item').forEach((item) => {
          const num = item.querySelector('.stat-number');
          const label = item.querySelector('p');
          if (num && label) {
            items.push({ value: elText(num), label: elText(label) });
          }
        });
        if (items.length > 0) {
          blocks.push({ id: genId('stats'), type: 'stats', content: { items } });
        }
        continue;
      }

      // article-faq (отдельный div с h3+p) или article-faq-accordion
      if (cls.includes('article-faq') && !cls.includes('article-faq-accordion')) {
        flushText();
        const h3 = el.querySelector('h3');
        const p = el.querySelector('p');
        if (h3 && p) {
          blocks.push({
            id: genId('faq'),
            type: 'faq',
            content: { items: [{ question: elText(h3), answer: elText(p) }] },
          });
        }
        continue;
      }

      if (cls.includes('article-faq-accordion')) {
        flushText();
        const items: Array<{ question: string; answer: string }> = [];
        el.querySelectorAll('.article-faq-item, details').forEach((d) => {
          const sum = d.querySelector('.article-faq-summary, summary');
          const ans = d.querySelector('.article-faq-content p, p');
          if (sum && ans) {
            items.push({ question: elText(sum), answer: elText(ans) });
          }
        });
        if (items.length > 0) {
          blocks.push({ id: genId('faq'), type: 'faq', content: { items } });
        }
        continue;
      }

      // article-cta -> cta block
      if (cls.includes('article-cta')) {
        flushText();
        const h2 = el.querySelector('h2');
        const p = el.querySelector('p');
        const links = el.querySelectorAll('a');
        const buttons = Array.from(links)
          .filter((a) => elText(a))
          .map((a) => ({ text: elText(a), url: a.getAttribute('href') || '#' }));
        blocks.push({
          id: genId('cta'),
          type: 'cta',
          content: {
            title: h2 ? elText(h2) : '',
            text: p ? elText(p) : undefined,
            buttons: buttons.length > 0 ? buttons : [{ text: 'Кнопка', url: '#' }],
          },
        });
        continue;
      }

      // pre > code -> code block
      if (tag === 'pre') {
        flushText();
        const code = el.querySelector('code');
        const rawCode = code ? elText(code) : elText(el);
        const langMatch = code?.className?.match(/language-(\w+)/);
        const lang = langMatch ? langMatch[1] : 'javascript';
        if (rawCode) {
          blocks.push({ id: genId('code'), type: 'code', content: { code: rawCode, language: lang } });
        }
        continue;
      }

      // Остальное — в текстовый буфер (накапливаем)
      textBuffer += el.outerHTML;
    }
  };

  walk(div);
  flushText();

  return blocks.length > 0 ? blocks : [];
}
