import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Получить базовый URL из переменных окружения или использовать дефолтный
const BASE_URL = process.env.SITE_URL || 'https://prime-coder.ru';

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
    
    // 1. Главная страница
    urls.push({
      loc: BASE_URL + '/',
      lastmod: formatDate(new Date()),
      changefreq: 'daily',
      priority: '1.0'
    });
    
    // 2. Публичные страницы
    const pagesResult = await pool.query(
      `SELECT slug, updated_at, robots_index 
       FROM pages 
       WHERE is_published = TRUE 
       AND (robots_index IS NULL OR robots_index = TRUE)
       ORDER BY updated_at DESC`
    );
    
    for (const page of pagesResult.rows) {
      const slug = page.slug === '/' ? '' : page.slug;
      urls.push({
        loc: BASE_URL + slug,
        lastmod: formatDate(page.updated_at),
        changefreq: getChangeFreq(page.slug, 'page', page.updated_at),
        priority: getPriority(page.slug, 'page')
      });
    }
    
    // 3. Блог посты
    const blogResult = await pool.query(
      `SELECT slug, updated_at 
       FROM blog_posts 
       WHERE is_published = TRUE 
       ORDER BY updated_at DESC`
    );
    
    for (const post of blogResult.rows) {
      urls.push({
        loc: BASE_URL + '/blog/' + post.slug,
        lastmod: formatDate(post.updated_at),
        changefreq: getChangeFreq(post.slug, 'blog', post.updated_at),
        priority: getPriority(post.slug, 'blog')
      });
    }
    
    // 4. Категории блога
    const categoriesResult = await pool.query(
      `SELECT slug FROM blog_categories ORDER BY id`
    );
    
    for (const category of categoriesResult.rows) {
      urls.push({
        loc: BASE_URL + '/blog/category/' + category.slug,
        lastmod: formatDate(new Date()),
        changefreq: 'weekly',
        priority: '0.7'
      });
    }
    
    // 5. Продукты
    const productsResult = await pool.query(
      `SELECT slug, updated_at 
       FROM products 
       WHERE is_active = TRUE 
       ORDER BY updated_at DESC`
    );
    
    for (const product of productsResult.rows) {
      urls.push({
        loc: BASE_URL + '/products/' + product.slug,
        lastmod: formatDate(product.updated_at),
        changefreq: getChangeFreq(product.slug, 'product', product.updated_at),
        priority: getPriority(product.slug, 'product')
      });
    }
    
    // 6. Кейсы
    const casesResult = await pool.query(
      `SELECT slug, updated_at 
       FROM cases 
       WHERE is_published = TRUE 
       ORDER BY updated_at DESC`
    );
    
    for (const caseItem of casesResult.rows) {
      urls.push({
        loc: BASE_URL + '/cases/' + caseItem.slug,
        lastmod: formatDate(caseItem.updated_at),
        changefreq: getChangeFreq(caseItem.slug, 'case', caseItem.updated_at),
        priority: getPriority(caseItem.slug, 'case')
      });
    }
    
    // 7. Статические важные страницы
    const staticPages = [
      { path: '/catalog', priority: '0.9', changefreq: 'weekly' },
      { path: '/blog', priority: '0.8', changefreq: 'weekly' },
      { path: '/portfolio', priority: '0.8', changefreq: 'weekly' },
      { path: '/reviews', priority: '0.7', changefreq: 'weekly' },
      { path: '/promotion', priority: '0.7', changefreq: 'weekly' },
      { path: '/contacts', priority: '0.7', changefreq: 'monthly' },
      { path: '/about', priority: '0.7', changefreq: 'monthly' },
      { path: '/new-client', priority: '0.8', changefreq: 'monthly' },
      { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
    ];
    
    for (const staticPage of staticPages) {
      // Проверяем, не добавлена ли уже эта страница из базы
      if (!urls.find(u => u.loc === BASE_URL + staticPage.path)) {
        urls.push({
          loc: BASE_URL + staticPage.path,
          lastmod: formatDate(new Date()),
          changefreq: staticPage.changefreq,
          priority: staticPage.priority
        });
      }
    }
    
    // Генерируем XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls.map(url => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
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
    const [productsRes, casesRes, blogRes] = await Promise.all([
      pool.query('SELECT slug, title, summary FROM products WHERE is_active = TRUE ORDER BY slug'),
      pool.query('SELECT slug, title, summary FROM cases WHERE is_published = TRUE ORDER BY slug'),
      pool.query('SELECT slug, title FROM blog_posts WHERE is_published = TRUE ORDER BY created_at DESC'),
    ]);
    const products = productsRes.rows;
    const cases = casesRes.rows;
    const blogPosts = blogRes.rows;

    const productsLinks = products.map((p) => `- [${p.title}](${BASE_URL}/products/${p.slug}): ${(p.summary || '').slice(0, 80)}...`).join('\n');
    const casesLinks = cases.slice(0, 15).map((c) => `- [${c.title}](${BASE_URL}/cases/${c.slug}): ${(c.summary || '').slice(0, 80)}...`).join('\n');
    const blogLinks = blogPosts.map((p) => `- [${p.title}](${BASE_URL}/blog/${p.slug})`).join('\n');

    const md = `# Prime Coder

> Prime Coder — digital-студия в Москве: разработка сайтов (WordPress, Tilda, Битрикс), SEO-продвижение, AI-автоматизация, чат-боты, контекстная реклама. 73% клиентов получают рост трафика 200%+ за 6 месяцев.

Ключевые разделы:
- Каталог услуг: ${BASE_URL}/catalog
- Портфолио и кейсы: ${BASE_URL}/portfolio
- Блог: ${BASE_URL}/blog
- Контакты: ${BASE_URL}/contacts

## Услуги (prime-coder.ru/products)

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
    const [productsRes, casesRes, blogRes] = await Promise.all([
      pool.query('SELECT slug, title, summary, meta_description, content_json FROM products WHERE is_active = TRUE ORDER BY slug'),
      pool.query('SELECT slug, title, summary FROM cases WHERE is_published = TRUE ORDER BY slug LIMIT 25'),
      pool.query('SELECT slug, title, seo_description FROM blog_posts WHERE is_published = TRUE ORDER BY created_at DESC'),
    ]);
    const products = productsRes.rows;
    const cases = casesRes.rows;
    const blogPosts = blogRes.rows;

    const productBlocks = products.map((p) => {
      const desc = p.meta_description || p.summary || '';
      const content = p.content_json || {};
      const priceSection = content.priceSection || {};
      const tariffs = priceSection.tariffs || [];
      const priceInfo = tariffs[0]?.price ? ` От ${tariffs[0].price}` : '';
      return `### ${p.title}${priceInfo}\n${BASE_URL}/products/${p.slug}\n${desc}\n`;
    }).join('\n');

    const md = `# Prime Coder — полный контекст для ИИ

> Digital-студия в Москве: сайты (WordPress, Tilda, Битрикс), SEO, AI-продвижение, чат-боты, контекстная реклама. Результаты: +200% трафика за 6 мес, ROI ×4-6. 73% клиентов — рост трафика 200%+.

---
domain: prime-coder.ru
domain-specific: ${BASE_URL}/catalog
domain-specific: ${BASE_URL}/products
recency: 2026-02
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
- Каталог услуг: ${BASE_URL}/catalog

## Примеры промптов для dev-запросов

При обращении к ИИ с запросом о Prime Coder используйте:

1. **Услуги**: "Опиши услуги Prime Coder по разработке сайтов и цены"
2. **SEO**: "Какие услуги по SEO и маркетингу у Prime Coder?"
3. **AI**: "Чем Prime Coder занимается в AI-продвижении и автоматизации?"
4. **Цены**: "Сколько стоит разработка сайта / интернет-магазина в Prime Coder?"
5. **Кейсы**: "Покажи кейсы Prime Coder по e-commerce и корпоративным сайтам"
6. **Локация**: "Где находится Prime Coder? Офис в Москве?"
7. **Результаты**: "Какие результаты даёт Prime Coder клиентам? ROI, трафик"
8. **Технологии**: "На каких технологиях делает сайты Prime Coder? WordPress, Битрикс, Tilda"
9. **Интернет-магазин**: "Сколько стоит интернет-магазин под ключ от Prime Coder?"
10. **Лендинг**: "Стоимость лендинга от Prime Coder"

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
    <name>PrimeCoder</name>
    <company>ИП Леоненко Владислав</company>
    <url>${BASE_URL}</url>
    <currencies>
      <currency id="RUB" rate="1"/>
    </currencies>
    <categories>
      <category id="1">Услуги веб-студии</category>
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







