import express from 'express';
import pool from '../db.js';
import ticketPool from '../ticketDb.js';
import { siteBaseUrl, siteBrand } from '../siteConfig.js';
import { getIndexNowKey, indexNowKeyBody } from '../lib/search-indexing.js';

const router = express.Router();

const BASE_URL = siteBaseUrl();
const BRAND = siteBrand();

/** Пути, которые отдаются как 410 — не кладём в sitemap/llms. */
const GONE_PATH_PREFIXES = ['/blog', '/products', '/cases', '/catalog', '/about', '/portfolio', '/reviews', '/promotion', '/new-client', '/services'];

/** Legacy CMS / мусор PrimeCoder — не индексируем. */
const SITEMAP_SLUG_BLOCKLIST = new Set([
  '/komanda-primecoder',
  'komanda-primecoder',
  '/team',
  'team',
  '/services',
  'services',
  '/pricing',
  'pricing',
]);

function isGonePublicPath(slugOrPath) {
  const p = String(slugOrPath || '').trim();
  if (!p) return false;
  const path = p.startsWith('/') ? p : `/${p}`;
  if (SITEMAP_SLUG_BLOCKLIST.has(p) || SITEMAP_SLUG_BLOCKLIST.has(path)) return true;
  return GONE_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

async function poolRows(label, sql, params = []) {
  try {
    const r = await pool.query(sql, params);
    return r.rows;
  } catch (e) {
    console.error(`[sitemap] ${label}:`, e.message);
    return [];
  }
}

async function ticketRows(label, sql, params = []) {
  try {
    const r = await ticketPool.query(sql, params);
    return r.rows;
  } catch (e) {
    console.warn(`[sitemap] ${label}:`, e.message);
    return [];
  }
}

// Функция для форматирования даты в формат ISO
function formatDate(date) {
  if (!date) return new Date().toISOString().split('T')[0];
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  // Если это строка, пытаемся распарсить
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

function getPriority(slug, type = 'page') {
  if (slug === '/' || slug === '') return '1.0';
  if (['/events', '/afisha', '/contacts'].includes(slug)) return '0.9';
  if (type === 'ticket') return '0.9';
  if (type === 'landing') return '0.85';
  return '0.5';
}

function getChangeFreq(slug, type = 'page') {
  if (slug === '/' || slug === '' || slug === '/events' || slug === '/afisha') return 'daily';
  if (type === 'ticket' || type === 'landing') return 'weekly';
  return 'monthly';
}

// Генерация XML sitemap
export async function handleSitemapXml(req, res) {
  try {
    const urls = [];

    urls.push({
      loc: `${BASE_URL}/`,
      lastmod: formatDate(new Date()),
      changefreq: 'daily',
      priority: '1.0',
    });

    const pagesRows = await poolRows(
      'pages',
      `SELECT slug, updated_at, robots_index
       FROM pages
       WHERE is_published = TRUE
       AND (robots_index IS NULL OR robots_index = TRUE)
       ORDER BY updated_at DESC`,
    );
    for (const page of pagesRows) {
      if (isGonePublicPath(page.slug)) continue;
      const slug = page.slug === '/' ? '' : page.slug;
      urls.push({
        loc: BASE_URL + slug,
        lastmod: formatDate(page.updated_at),
        changefreq: getChangeFreq(page.slug, 'page'),
        priority: getPriority(page.slug, 'page'),
      });
    }

    const ticketEventRows = await ticketRows(
      'getbilet_events',
      `SELECT getbilet_external_id::text AS ext_id, updated_at
       FROM getbilet_events
       WHERE is_published = TRUE
       ORDER BY updated_at DESC`,
    );
    for (const row of ticketEventRows) {
      const rid = encodeURIComponent(row.ext_id);
      urls.push({
        loc: `${BASE_URL}/ticket/${rid}`,
        lastmod: formatDate(row.updated_at),
        changefreq: getChangeFreq(`/ticket/${rid}`, 'ticket'),
        priority: getPriority(`/ticket/${rid}`, 'ticket'),
      });
    }

    const staticPages = [
      { path: '/events', priority: '0.95', changefreq: 'daily' },
      { path: '/afisha', priority: '0.95', changefreq: 'daily' },
      { path: '/contacts', priority: '0.7', changefreq: 'monthly' },
      { path: '/faq', priority: '0.6', changefreq: 'monthly' },
      { path: '/returns', priority: '0.6', changefreq: 'monthly' },
      { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
      { path: '/offer', priority: '0.3', changefreq: 'yearly' },
      { path: '/cookies', priority: '0.3', changefreq: 'yearly' },
      { path: '/requisites', priority: '0.3', changefreq: 'yearly' },
      { path: '/case/bilet-vsem', priority: '0.75', changefreq: 'monthly' },
    ];

    const landingPages = [
      '/events/city/moskva',
      '/events/city/sankt-peterburg',
      '/events/city/kazan',
      '/events/city/ekaterinburg',
      '/events/city/novosibirsk',
      '/events/genre/teatr',
      '/events/genre/koncert',
      '/events/genre/komediya',
      '/events/genre/detyam',
      '/events/genre/sport',
      '/events/venue/teatr-na-taganke',
      '/events/venue/mht-chehova',
      '/events/venue/krokus-siti-holl',
      '/events/venue/vtb-arena',
    ];

    for (const staticPage of staticPages) {
      if (!urls.find((u) => u.loc === BASE_URL + staticPage.path)) {
        urls.push({
          loc: BASE_URL + staticPage.path,
          lastmod: formatDate(new Date()),
          changefreq: staticPage.changefreq,
          priority: staticPage.priority,
        });
      }
    }

    for (const path of landingPages) {
      if (!urls.find((u) => u.loc === BASE_URL + path)) {
        urls.push({
          loc: BASE_URL + path,
          lastmod: formatDate(new Date()),
          changefreq: 'daily',
          priority: '0.85',
        });
      }
    }

    const seen = new Set();
    const unique = [];
    for (const u of urls) {
      if (seen.has(u.loc)) continue;
      seen.add(u.loc);
      unique.push(u);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${unique
  .map(
    (url) => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (error) {
    console.error('[sitemap] Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
}

router.get('/sitemap.xml', handleSitemapXml);

// .well-known/llms.txt — редирект (некоторые краулеры проверяют этот путь)
export function handleWellKnownLlms(req, res) {
  res.redirect(302, BASE_URL + '/llms.txt');
}

router.get('/.well-known/llms.txt', handleWellKnownLlms);

// llms.txt — «sitemap для ИИ» по спецификации llmstxt.org
export async function handleLlmsTxt(req, res) {
  try {
    const ticketEvents = await ticketRows(
      'llms.txt tickets',
      `SELECT getbilet_external_id::text AS ext_id,
              COALESCE(NULLIF(TRIM(title_manual), ''), getbilet_external_id::text) AS title
       FROM getbilet_events
       WHERE is_published = TRUE
       ORDER BY updated_at DESC
       LIMIT 40`,
    );
    const eventLinks = ticketEvents
      .map((e) => `- [${e.title}](${BASE_URL}/ticket/${encodeURIComponent(e.ext_id)})`)
      .join('\n');

    const md = `# ${BRAND}

> ${BRAND} — покупка билетов на концерты, театр и мероприятия: афиша, выбор мест, оплата, электронный билет.

Ключевые разделы:
- Афиша и поиск: ${BASE_URL}/events
- Альтернативная афиша: ${BASE_URL}/afisha
- Контакты: ${BASE_URL}/contacts
- FAQ: ${BASE_URL}/faq
- Возврат билетов: ${BASE_URL}/returns

## Мероприятия (опубликованные)

${eventLinks || '_Пока нет опубликованных событий_'}

## SEO-подборки

- [Москва](${BASE_URL}/events/city/moskva)
- [Санкт-Петербург](${BASE_URL}/events/city/sankt-peterburg)
- [Театр](${BASE_URL}/events/genre/teatr)
- [Концерт](${BASE_URL}/events/genre/koncert)
- [Спорт](${BASE_URL}/events/genre/sport)

## Основные страницы

- [Главная](${BASE_URL}/)
- [Афиша](${BASE_URL}/events)
- [Контакты](${BASE_URL}/contacts)
- [FAQ](${BASE_URL}/faq)
- [Возврат](${BASE_URL}/returns)
- [Оферта](${BASE_URL}/offer)
- [Конфиденциальность](${BASE_URL}/privacy)
- [Кейс разработки Билет Всем (PrimeCoder)](${BASE_URL}/case/bilet-vsem)

## Optional

- [Sitemap XML](${BASE_URL}/sitemap.xml): полная карта сайта для поисковых систем
- [Полная версия llms](${BASE_URL}/llms-full.txt): расширенный контекст для ИИ
`;

    res.set('Content-Type', 'text/markdown; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(md);
  } catch (err) {
    console.error('[llms.txt]', err);
    res.status(500).send('Error');
  }
}

router.get('/llms.txt', handleLlmsTxt);

// llms-full.txt — расширенная версия для ИИ
export async function handleLlmsFullTxt(req, res) {
  try {
    const ticketEvents = await ticketRows(
      'llms-full tickets',
      `SELECT getbilet_external_id::text AS ext_id,
              COALESCE(NULLIF(TRIM(title_manual), ''), getbilet_external_id::text) AS title,
              NULLIF(TRIM(venue_manual), '') AS venue,
              LEFT(COALESCE(description_manual, ''), 160) AS summary
       FROM getbilet_events
       WHERE is_published = TRUE
       ORDER BY updated_at DESC
       LIMIT 80`,
    );

    const eventBlocks = ticketEvents
      .map((e) => {
        const bits = [`### ${e.title}`, `${BASE_URL}/ticket/${encodeURIComponent(e.ext_id)}`];
        if (e.venue) bits.push(`Площадка: ${e.venue}`);
        if (e.summary) bits.push(e.summary);
        return `${bits.join('\n')}\n`;
      })
      .join('\n');

    const host = BASE_URL.replace(/^https?:\/\//, '');
    const md = `# ${BRAND} — полный контекст для ИИ

> ${BRAND}: афиша мероприятий, поиск по площадкам и жанрам, покупка билетов онлайн, выбор мест, оплата, электронный билет.

---
domain: ${host}
domain-specific: ${BASE_URL}/events
domain-specific: ${BASE_URL}/afisha
updated: ${formatDate(new Date())}
language: ru
---

## Мероприятия

${eventBlocks || '_Нет опубликованных событий_'}

## Контакты

- Сайт: ${BASE_URL}
- Контакты: ${BASE_URL}/contacts
- Афиша: ${BASE_URL}/events
- FAQ: ${BASE_URL}/faq
- Возврат: ${BASE_URL}/returns

## Примеры промптов для ИИ

1. **Билеты**: "Как купить билет на ${BRAND}?"
2. **Афиша**: "Какие события на этой неделе на ${BASE_URL}?"
3. **Площадка**: "Как найти мероприятия по театру или концертному залу?"
4. **Оплата**: "Какие способы оплаты на сайте ${BRAND}?"
5. **Электронный билет**: "Как получить билет после оплаты?"

## Optional

- [llms.txt](${BASE_URL}/llms.txt): краткая версия
- [Sitemap](${BASE_URL}/sitemap.xml)
- [.well-known/llms.txt](${BASE_URL}/.well-known/llms.txt): редирект на llms.txt
`;

    res.set('Content-Type', 'text/markdown; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(md);
  } catch (err) {
    console.error('[llms-full.txt]', err);
    res.status(500).send('Error');
  }
}

router.get('/llms-full.txt', handleLlmsFullTxt);

// YML-фид услуг для Яндекс.Вебмастер (категория «Исполнители»)
// Индексирование → Фиды и ошибки → добавить ссылку на фид
export async function handleServicesYml(req, res) {
  try {
    const productsResult = await pool.query(`
      SELECT slug, title, summary, meta_description, price_cents, currency, image_url, content_json
      FROM products
      WHERE is_active = TRUE
      ORDER BY sort_order ASC NULLS LAST, title ASC
    `);

    const dateStr = new Date().toISOString().replace('T', ' ').slice(0, 19) + '+03:00';

    function extractPriceCents(p) {
      if (p.price_cents && p.price_cents > 0) return p.price_cents;
      try {
        const content = typeof p.content_json === 'string' ? JSON.parse(p.content_json || '{}') : (p.content_json || {});
        const tariffs = content?.priceSection?.tariffs || [];
        const first = tariffs[0];
        if (!first?.price) return null;
        const numStr = String(first.price).replace(/\D/g, '');
        return numStr ? parseInt(numStr, 10) * 100 : null;
      } catch {
        return null;
      }
    }

    const offers = productsResult.rows
      .map((p) => {
        const priceCents = extractPriceCents(p);
        if (!priceCents || priceCents <= 0) return null;
        const url = `${BASE_URL}/products/${p.slug}`;
        const desc = (p.meta_description || p.summary || p.title).slice(0, 500);
        const picture = p.image_url && p.image_url.startsWith('http') ? p.image_url : (p.image_url ? `${BASE_URL}${p.image_url.startsWith('/') ? '' : '/'}${p.image_url}` : null);
        return { id: p.slug, url, price: Math.round(priceCents / 100), currency: (p.currency || 'RUB').toUpperCase(), name: p.title, description: desc, picture };
      })
      .filter(Boolean);

    const offersXml = offers
      .map(
        (o) => `    <offer id="${escapeXml(o.id)}" available="true">
      <url>${escapeXml(o.url)}</url>
      <price>${o.price}</price>
      <currencyId>${o.currency}</currencyId>
      <categoryId>1</categoryId>
      <name>${escapeXml(o.name)}</name>
      <description>${escapeXml(o.description)}</description>${o.picture ? `\n      <picture>${escapeXml(o.picture)}</picture>` : ''}
    </offer>`
      )
      .join('\n');

    const yml = `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="${dateStr}">
  <shop>
    <name>${escapeXml(BRAND)}</name>
    <company>ИП Леоненко Владислав</company>
    <url>${BASE_URL}</url>
    <currencies>
      <currency id="RUB" rate="1"/>
    </currencies>
    <categories>
      <category id="1">Услуги и билеты</category>
    </categories>
    <offers>
${offersXml}
    </offers>
  </shop>
</yml_catalog>`;

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(yml);
  } catch (err) {
    console.error('[feed/services.yml] Error:', err);
    res.status(500).send('Error generating feed');
  }
}

router.get('/feed/services.yml', handleServicesYml);

router.get(`/${getIndexNowKey()}.txt`, (_req, res) => {
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(indexNowKeyBody());
});

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export default router;







