import express from 'express';
import pool from '../db.js';
import ticketPool from '../ticketDb.js';
import { siteBaseUrl, siteBrand } from '../siteConfig.js';

const router = express.Router();

const BASE_URL = siteBaseUrl();
const BRAND = siteBrand();

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

// Функция для определения приоритета страницы
function getPriority(slug, type = 'page') {
  // Главная страница - максимальный приоритет
  if (slug === '/' || slug === '') return '1.0';
  
  // Важные разделы
  if (['/catalog', '/services', '/about', '/contacts'].includes(slug)) return '0.9';
  
  // Услуги и продукты
  if (type === 'product') return '0.8';
  if (type === 'case') return '0.7';
  
  // Блог
  if (type === 'blog') return '0.6';
  
  // Остальные страницы
  return '0.5';
}

// Функция для определения частоты обновления
function getChangeFreq(slug, type = 'page', updatedAt) {
  // Главная страница - ежедневно
  if (slug === '/' || slug === '') return 'daily';
  
  // Каталог и услуги - еженедельно
  if (['/catalog', '/services'].includes(slug)) return 'weekly';
  
  // Блог - еженедельно
  if (type === 'blog') return 'weekly';
  
  // Кейсы и продукты - ежемесячно
  if (type === 'case' || type === 'product') return 'monthly';
  
  // Остальные - ежемесячно
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
      const slug = page.slug === '/' ? '' : page.slug;
      urls.push({
        loc: BASE_URL + slug,
        lastmod: formatDate(page.updated_at),
        changefreq: getChangeFreq(page.slug, 'page', page.updated_at),
        priority: getPriority(page.slug, 'page'),
      });
    }

    const blogRows = await poolRows(
      'blog_posts',
      `SELECT slug, updated_at
       FROM blog_posts
       WHERE is_published = TRUE
       ORDER BY updated_at DESC`,
    );
    for (const post of blogRows) {
      urls.push({
        loc: `${BASE_URL}/blog/${post.slug}`,
        lastmod: formatDate(post.updated_at),
        changefreq: getChangeFreq(post.slug, 'blog', post.updated_at),
        priority: getPriority(post.slug, 'blog'),
      });
    }

    const categoryRows = await poolRows('blog_categories', `SELECT slug FROM blog_categories ORDER BY id`);
    for (const category of categoryRows) {
      urls.push({
        loc: `${BASE_URL}/blog/category/${category.slug}`,
        lastmod: formatDate(new Date()),
        changefreq: 'weekly',
        priority: '0.7',
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
        changefreq: 'weekly',
        priority: '0.9',
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
    const products = await poolRows(
      'llms.txt products',
      'SELECT slug, title, summary FROM products WHERE is_active = TRUE ORDER BY slug',
    );
    const cases = await poolRows(
      'llms.txt cases',
      'SELECT slug, title, summary FROM cases WHERE is_published = TRUE ORDER BY slug',
    );
    const blogPosts = await poolRows(
      'llms.txt blog',
      'SELECT slug, title FROM blog_posts WHERE is_published = TRUE ORDER BY created_at DESC',
    );

    const productsLinks = products.map((p) => `- [${p.title}](${BASE_URL}/products/${p.slug}): ${(p.summary || '').slice(0, 80)}...`).join('\n');
    const casesLinks = cases.slice(0, 15).map((c) => `- [${c.title}](${BASE_URL}/cases/${c.slug}): ${(c.summary || '').slice(0, 80)}...`).join('\n');
    const blogLinks = blogPosts.map((p) => `- [${p.title}](${BASE_URL}/blog/${p.slug})`).join('\n');

    const md = `# ${BRAND}

> ${BRAND} — покупка билетов на концерты, театр и мероприятия: афиша, выбор мест, оплата, электронный билет.

Ключевые разделы:
- Афиша и поиск: ${BASE_URL}/events
- Альтернативная афиша: ${BASE_URL}/afisha
- Каталог услуг (при наличии): ${BASE_URL}/catalog
- Портфолио и кейсы: ${BASE_URL}/portfolio
- Блог: ${BASE_URL}/blog
- Контакты: ${BASE_URL}/contacts

## Услуги (${BASE_URL}/products)

${productsLinks}

## Кейсы

${casesLinks}

## Блог (последние)

${blogLinks}

## Основные страницы

- [Главная](${BASE_URL}/)
- [О компании](${BASE_URL}/about)
- [Каталог](${BASE_URL}/catalog)
- [Контакты](${BASE_URL}/contacts)
- [Блог](${BASE_URL}/blog)
- [Портфолио](${BASE_URL}/portfolio)

## Optional

- [Sitemap XML](${BASE_URL}/sitemap.xml): полная карта сайта для поисковых систем
- [YML фид услуг](${BASE_URL}/feed/services.yml): для Яндекс.Вебмастер (Исполнители)
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

// llms-full.txt — расширенная версия: domain-specific, recency, примеры промптов, блог
export async function handleLlmsFullTxt(req, res) {
  try {
    const products = await poolRows(
      'llms-full products',
      'SELECT slug, title, summary, meta_description, content_json FROM products WHERE is_active = TRUE ORDER BY slug',
    );
    const cases = await poolRows(
      'llms-full cases',
      'SELECT slug, title, summary FROM cases WHERE is_published = TRUE ORDER BY slug LIMIT 25',
    );
    const blogPosts = await poolRows(
      'llms-full blog',
      'SELECT slug, title, seo_description FROM blog_posts WHERE is_published = TRUE ORDER BY created_at DESC',
    );

    const productBlocks = products.map((p) => {
      const desc = p.meta_description || p.summary || '';
      const content = p.content_json || {};
      const priceSection = content.priceSection || {};
      const tariffs = priceSection.tariffs || [];
      const priceInfo = tariffs[0]?.price ? ` От ${tariffs[0].price}` : '';
      return `### ${p.title}${priceInfo}\n${BASE_URL}/products/${p.slug}\n${desc}\n`;
    }).join('\n');

    const host = BASE_URL.replace(/^https?:\/\//, '');
    const md = `# ${BRAND} — полный контекст для ИИ

> ${BRAND}: афиша мероприятий, поиск по площадкам и жанрам, покупка билетов онлайн, выбор мест, оплата, электронный билет.

---
domain: ${host}
domain-specific: ${BASE_URL}/events
domain-specific: ${BASE_URL}/afisha
domain-specific: ${BASE_URL}/catalog
domain-specific: ${BASE_URL}/products
updated: ${formatDate(new Date())}
language: ru
---

## Услуги (детально)

${productBlocks}

## Кейсы

${cases.map((c) => `- [${c.title}](${BASE_URL}/cases/${c.slug})`).join('\n')}

## Блог (последние статьи)

${blogPosts.map((p) => `- [${p.title}](${BASE_URL}/blog/${p.slug})${p.seo_description ? `: ${p.seo_description.slice(0, 60)}...` : ''}`).join('\n')}

## Контакты

- Сайт: ${BASE_URL}
- Контакты: ${BASE_URL}/contacts
- Афиша: ${BASE_URL}/events

## Примеры промптов для ИИ

1. **Билеты**: "Как купить билет на ${BRAND}?"
2. **Афиша**: "Какие события на этой неделе на ${BASE_URL}?"
3. **Площадка**: "Как найти мероприятия по театру или концертному залу?"
4. **Оплата**: "Какие способы оплаты на сайте ${BRAND}?"
5. **Электронный билет**: "Как получить билет после оплаты?"

Ключевые slug услуг: ${products.map((p) => p.slug).join(', ')}

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

// Функция для экранирования XML
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







