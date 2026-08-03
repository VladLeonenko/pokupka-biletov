/**
 * SSR HTML в #root для краулеров (ticket / events / home / CMS).
 */

function escapeHtml(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatEventDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  try {
    return d.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Moscow',
    });
  } catch {
    return String(iso);
  }
}

/** Вставляет SSR-фрагмент в #root (баланс вложенных div). */
export function injectSsrIntoHtml(html, ssrFragment) {
  if (!ssrFragment) return html;
  const exact = html.replace(
    /<div id="root">\s*<div class="loading">Загрузка\.\.\.<\/div>\s*<\/div>/i,
    `<div id="root">${ssrFragment}</div>`,
  );
  if (exact !== html) return exact;

  const start = html.search(/<div id="root"[^>]*>/i);
  if (start < 0) return html;
  const openEnd = html.indexOf('>', start) + 1;
  let depth = 1;
  let i = openEnd;
  while (i < html.length && depth > 0) {
    const nextOpen = html.toLowerCase().indexOf('<div', i);
    const nextClose = html.toLowerCase().indexOf('</div>', i);
    if (nextClose < 0) break;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen + 4;
    } else {
      depth -= 1;
      if (depth === 0) {
        return `${html.slice(0, start)}<div id="root">${ssrFragment}</div>${html.slice(nextClose + 6)}`;
      }
      i = nextClose + 6;
    }
  }
  return html;
}

/**
 * Зеркало для краулеров вне #root: createRoot не стирает — меньше риск «пустой» первой волны.
 * Видимо до гидрации React, потом FE снимает (#bv-ssr-crawl).
 */
export function injectCrawlMirror(html, ssrFragment) {
  if (!ssrFragment || /id="bv-ssr-crawl"/.test(html)) return html;
  const mirror = `<div id="bv-ssr-crawl" data-bv-ssr-crawl="1">${ssrFragment}</div>\n    `;
  if (html.includes('<div id="root"')) {
    return html.replace('<div id="root"', `${mirror}<div id="root"`);
  }
  return html.replace('</body>', `${mirror}</body>`);
}

function faqHtml(items) {
  if (!Array.isArray(items) || !items.length) return '';
  const blocks = items
    .map(
      (item) => `<details>
      <summary>${escapeHtml(item.q)}</summary>
      <p>${escapeHtml(item.a)}</p>
    </details>`,
    )
    .join('\n    ');
  return `<section>
    <h2>Частые вопросы</h2>
    ${blocks}
  </section>`;
}

function sectionsHtml(sections) {
  if (!Array.isArray(sections) || !sections.length) return '';
  return sections
    .slice(0, 8)
    .map((sec) => {
      const title = escapeHtml(sec.title || sec.id || 'О событии');
      const paragraphs = Array.isArray(sec.paragraphs)
        ? sec.paragraphs
            .slice(0, 6)
            .map((p) => `<p>${escapeHtml(p)}</p>`)
            .join('\n      ')
        : '';
      if (!paragraphs) return '';
      return `<section>
    <h2>${title}</h2>
    ${paragraphs}
  </section>`;
    })
    .filter(Boolean)
    .join('\n  ');
}

function relatedHtml(items) {
  if (!Array.isArray(items) || !items.length) return '';
  const lis = items
    .map((ev) => {
      const href = escapeHtml(ev.path || `/ticket/${encodeURIComponent(ev.id)}`);
      const name = escapeHtml(ev.title || 'Мероприятие');
      return `<li><a href="${href}">${name}</a></li>`;
    })
    .join('\n      ');
  return `<section>
    <h2>Другие мероприятия</h2>
    <ul>
      ${lis}
    </ul>
  </section>`;
}

function eventListHtml(items, { heading = 'Актуальные мероприятия' } = {}) {
  if (!Array.isArray(items) || !items.length) return '';
  const lis = items
    .map((ev) => {
      const href = escapeHtml(ev.path || `/ticket/${encodeURIComponent(ev.id)}`);
      const name = escapeHtml(ev.title || 'Мероприятие');
      const when = ev.beginDateTime ? ` — ${escapeHtml(formatEventDate(ev.beginDateTime))}` : '';
      const venue = ev.venueLabel ? ` (${escapeHtml(ev.venueLabel)})` : '';
      return `<li><a href="${href}">${name}</a>${when}${venue}</li>`;
    })
    .join('\n      ');
  return `<section>
    <h2>${escapeHtml(heading)}</h2>
    <ul>
      ${lis}
    </ul>
  </section>`;
}

/**
 * @param {{
 *   title: string;
 *   h1?: string;
 *   description?: string;
 *   venueLabel?: string | null;
 *   venueAddress?: string | null;
 *   beginDateTime?: string | null;
 *   minPrice?: number | null;
 *   canonicalPath: string;
 *   posterUrl?: string | null;
 *   sections?: { id?: string; title?: string; paragraphs?: string[] }[];
 *   related?: { id: string; title: string; path?: string }[];
 *   faq?: { q: string; a: string }[];
 * }} p
 */
export function buildTicketEventSsrHtml(p) {
  const h1 = escapeHtml(p.h1 || p.title || 'Мероприятие');
  const titleAttr = escapeHtml(p.title || h1);
  const desc = escapeHtml((p.description || '').slice(0, 800));
  const venue = escapeHtml(p.venueLabel || '');
  const address = escapeHtml(p.venueAddress || '');
  const when = escapeHtml(formatEventDate(p.beginDateTime));
  const price =
    p.minPrice != null && Number.isFinite(Number(p.minPrice))
      ? `от ${Math.round(Number(p.minPrice)).toLocaleString('ru-RU')} ₽`
      : '';
  const path = escapeHtml(p.canonicalPath || '/events');
  const poster = p.posterUrl ? escapeHtml(p.posterUrl) : '';
  const faq = Array.isArray(p.faq) && p.faq.length
    ? p.faq
    : [
        {
          q: 'Как купить билет на это мероприятие?',
          a: 'Выберите места на схеме зала и завершите оплату. Электронный билет будет доступен после подтверждения платежа.',
        },
        {
          q: 'Можно ли вернуть билет на это событие?',
          a: 'Возврат зависит от условий организатора и правил площадки. Подробности — в разделе возврата билетов.',
        },
      ];

  return `<main class="bv-ssr-ticket" data-ssr="ticket-event">
  <nav aria-label="Хлебные крошки">
    <a href="/">Главная</a> → <a href="/events">Афиша</a> → <span>${h1}</span>
  </nav>
  <article>
    <h1>${h1}</h1>
    ${poster ? `<p><img src="${poster}" alt="${titleAttr}" width="320" height="auto" loading="lazy" /></p>` : ''}
    ${when ? `<p><strong>Дата:</strong> ${when}</p>` : ''}
    ${venue ? `<p><strong>Площадка:</strong> ${venue}${address ? `, ${address}` : ''}</p>` : ''}
    ${price ? `<p><strong>Цена:</strong> ${escapeHtml(price)}</p>` : ''}
    ${desc ? `<p>${desc}</p>` : ''}
    <p><a href="${path}">Выбрать места и купить билет</a></p>
  </article>
  ${sectionsHtml(p.sections)}
  <section>
    <h2>Как купить билет</h2>
    <ol>
      <li>Откройте схему зала и выберите места.</li>
      <li>Оплатите заказ онлайн.</li>
      <li>Электронный билет придёт после подтверждения оплаты.</li>
    </ol>
  </section>
  ${faqHtml(faq)}
  ${relatedHtml(p.related)}
  <p><a href="/events">Вся афиша</a> · <a href="/returns">Возврат билетов</a> · <a href="/faq">FAQ</a></p>
</main>`;
}

/**
 * @param {{ title: string; description: string; path: string; h1?: string; events?: object[]; faq?: {q:string;a:string}[] }} p
 */
export function buildStaticLandingSsrHtml(p) {
  const h1 = escapeHtml(p.h1 || p.title);
  const desc = escapeHtml(p.description || '');
  const path = escapeHtml(p.path || '/events');
  if (p.path === '/case/bilet-vsem') {
    return `<main class="bv-ssr-landing" data-ssr="case-bilet-vsem">
  <nav aria-label="Хлебные крошки">
    <a href="/">Главная</a> → <span>Кейс Билет Всем</span>
  </nav>
  <h1>Кейс Билет Всем — билетная платформа</h1>
  <p>${desc || 'Полный цикл покупки билетов: афиша, схема зала/стадиона, бронь мест, оплата и электронный билет.'}</p>
  <h2>Уникальность</h2>
  <ul>
    <li>Интерактивные схемы стадионов с десятками тысяч мест (уровень картографических продуктов)</li>
    <li>Витрина, админка контента и REST API в одном продукте</li>
    <li>Seat hold, промокоды, gift-билеты, FAN ID, SSR meta и Event JSON-LD</li>
  </ul>
  <h2>Разработчик</h2>
  <p>Проект разработан студией <a href="https://prime-coder.ru" rel="noopener">PrimeCoder</a>.
  Заказать похожее React/Next.js-приложение:
  <a href="https://prime-coder.ru/products/react-prilozhenie" rel="noopener">React/Next.js SaaS от 850 000 ₽</a>.</p>
  <p><a href="/">Открыть афишу Билет Всем</a> · <a href="/events">Мероприятия</a></p>
</main>`;
  }
  return `<main class="bv-ssr-landing" data-ssr="landing">
  <nav aria-label="Хлебные крошки">
    <a href="/">Главная</a> → <a href="/events">Афиша</a> → <span>${h1}</span>
  </nav>
  <h1>${h1}</h1>
  ${desc ? `<p>${desc}</p>` : ''}
  ${eventListHtml(p.events, { heading: 'События в подборке' })}
  ${faqHtml(p.faq)}
  <p><a href="${path}">Смотреть мероприятия</a> · <a href="/faq">FAQ</a> · <a href="/contacts">Контакты</a></p>
</main>`;
}

/**
 * @param {{ events?: object[] }} [opts]
 */
export function buildEventsIndexSsrHtml(opts = {}) {
  return `<main class="bv-ssr-events" data-ssr="events">
  <h1>Афиша мероприятий — билеты онлайн</h1>
  <p>Поиск событий по названию, площадке и жанру. Выбор мест на схеме зала и оплата онлайн.</p>
  ${eventListHtml(opts.events, { heading: 'Сейчас в продаже' })}
  <section>
    <h2>Подборки</h2>
    <ul>
      <li><a href="/events/city/moskva">Москва</a></li>
      <li><a href="/events/city/sankt-peterburg">Санкт-Петербург</a></li>
      <li><a href="/events/genre/teatr">Театр</a></li>
      <li><a href="/events/genre/koncert">Концерт</a></li>
      <li><a href="/events/genre/sport">Спорт</a></li>
    </ul>
  </section>
  ${faqHtml([
    {
      q: 'Как купить билет на мероприятие?',
      a: 'Откройте карточку события, выберите места и оплатите заказ онлайн.',
    },
    {
      q: 'Можно ли вернуть билет?',
      a: 'Да, по правилам мероприятия и закону. Подробности на странице возврата.',
    },
  ])}
  <p><a href="/faq">Частые вопросы</a> · <a href="/returns">Возврат</a></p>
</main>`;
}

/**
 * @param {{ events?: object[] }} [opts]
 */
export function buildHomeSsrHtml(opts = {}) {
  return `<main class="bv-ssr-home" data-ssr="home">
  <h1>Билеты на концерты, театр и спорт</h1>
  <p>Афиша мероприятий: выбор мест на схеме зала, оплата онлайн и электронный билет.</p>
  ${eventListHtml(opts.events, { heading: 'Ближайшие события' })}
  <p>
    <a href="/events">Открыть афишу</a> ·
    <a href="/events/genre/koncert">Концерты</a> ·
    <a href="/events/genre/teatr">Театр</a> ·
    <a href="/faq">FAQ</a>
  </p>
</main>`;
}

/**
 * @param {{ title: string; description?: string; bodyHtml?: string; path: string }} p
 */
export function buildCmsPageSsrHtml(p) {
  const h1 = escapeHtml(p.title || 'Страница');
  const desc = escapeHtml((p.description || '').slice(0, 400));
  // body из CMS уже HTML — санитизируем грубо: только безопасные теги оставляем как есть,
  // скрипты вырезаем.
  let body = String(p.bodyHtml || '');
  body = body.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/on\w+="[^"]*"/gi, '');
  return `<main class="bv-ssr-cms" data-ssr="cms">
  <nav aria-label="Хлебные крошки">
    <a href="/">Главная</a> → <span>${h1}</span>
  </nav>
  <h1>${h1}</h1>
  ${desc ? `<p>${desc}</p>` : ''}
  <div class="bv-ssr-cms-body">${body}</div>
  <p><a href="/events">Афиша</a> · <a href="/contacts">Контакты</a></p>
</main>`;
}

/** ItemList JSON-LD payload (не script). */
export function buildEventItemListSchema(base, events, { name, url } = {}) {
  if (!Array.isArray(events) || !events.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: name || 'Афиша',
    url: url || `${base}/events`,
    numberOfItems: events.length,
    itemListElement: events.slice(0, 30).map((ev, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `${base}${ev.path || `/ticket/${encodeURIComponent(ev.id)}`}`,
      name: ev.title,
    })),
  };
}
