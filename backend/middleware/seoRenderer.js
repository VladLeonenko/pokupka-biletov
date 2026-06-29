import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  handleSitemapXml,
  handleLlmsTxt,
  handleLlmsFullTxt,
  handleWellKnownLlms,
  handleServicesYml,
} from '../routes/sitemap.js';
import { siteBaseUrl, siteBrand } from '../siteConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GONE_PUBLIC_PATHS = new Set([
  '/about',
  '/catalog',
  '/blog',
  '/portfolio',
  '/reviews',
  '/promotion',
  '/new-client',
  '/products',
  '/cases',
]);

const AMBIGUOUS_TICKET_PATHS = new Set([
  '/ticket/event',
  '/ticket/meropriyatie',
]);

function looksLikeGetbiletId(value) {
  return /^[a-f0-9]{24}$/i.test(String(value || '').trim());
}

function findIndexHtml() {
  const candidates = [
    path.resolve(__dirname, '../../frontend/dist/index.html'),
    path.resolve(process.cwd(), 'frontend/dist/index.html'),
    path.resolve(process.cwd(), '../frontend/dist/index.html'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[seoRenderer] Using index.html at:', p);
      }
      return p;
    }
  }
  console.error('[seoRenderer] index.html not found in:', candidates);
  return candidates[0];
}
const indexPath = findIndexHtml();

const API_BASE = process.env.API_INTERNAL_URL || `http://127.0.0.1:${Number(process.env.PORT) || 3000}`;

/** Каталоги dist (как в findIndexHtml) — не полагаемся только на indexPath при старте PM2. */
function getDistRootCandidates() {
  return [
    path.resolve(__dirname, '../../frontend/dist'),
    path.resolve(process.cwd(), 'frontend/dist'),
    path.resolve(process.cwd(), '../frontend/dist'),
  ];
}

/**
 * Отдать файл из корня dist (manifest, robots, sw). Пробуем несколько путей к dist.
 * @returns {boolean}
 */
function sendDistFile(res, relName, contentType, cacheControl) {
  for (const dist of getDistRootCandidates()) {
    const filePath = path.join(dist, relName);
    if (!fs.existsSync(filePath)) continue;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', cacheControl);
    res.sendFile(path.resolve(filePath));
    return true;
  }
  return false;
}

/**
 * Убирает дефолтные title/description/canonical/OG/Twitter из шаблона index.html,
 * чтобы не было дублей при SSR (один <title>, один набор meta).
 */
function stripDefaultSeoFromHtml(html) {
  let out = html.replace(/<title>[^<]*<\/title>/i, '');
  out = out.replace(/<meta name="description" content="[^"]*"\s*\/?>/i, '');
  out = out.replace(/<meta name="keywords" content="[^"]*"\s*\/?>/i, '');
  out = out.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/i, '');
  out = out.replace(/<meta property="og:[^"]*"[^>]*>/gi, '');
  out = out.replace(/<meta name="twitter:[^"]*"[^>]*>/gi, '');
  return out;
}

/**
 * @param {{ base: string; brand: string; canonical: string; title: string; description: string; ogType: string }} p
 */
function metaBlockForPage(p) {
  const { base, brand, canonical, title, description, ogType } = p;
  const ogImage = `${base}/favicon.svg`;
  return `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="${escapeHtml(ogType)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(ogImage)}" />
    <meta property="og:site_name" content="${escapeHtml(brand)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(ogImage)}" />`;
}

/**
 * Встраиваем JSON-LD без ручной сериализации строк.
 * @param {Record<string, unknown> | null | undefined} payload
 */
function jsonLdScript(payload) {
  if (!payload || typeof payload !== 'object') return '';
  return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;
}

/**
 * Простые хлебные крошки для лучшего понимания структуры страниц.
 * @param {string} base
 * @param {Array<{ name: string; path: string }>} items
 */
function breadcrumbJsonLd(base, items) {
  if (!Array.isArray(items) || !items.length) return '';
  const itemListElement = items.map((item, idx) => ({
    '@type': 'ListItem',
    position: idx + 1,
    name: item.name,
    item: `${base}${item.path}`,
  }));
  return jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  });
}

/**
 * Нормализует URL картинки к абсолютному.
 * @param {string} base
 * @param {unknown} maybeUrl
 */
function toAbsUrl(base, maybeUrl) {
  const s = maybeUrl != null ? String(maybeUrl).trim() : '';
  if (!s) return '';
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  return `${base}${s.startsWith('/') ? '' : '/'}${s}`;
}

/**
 * Короткий справочник статических SEO-страниц с уникальными title/description.
 * Держим тут, чтобы не размазывать мета по фронту и не зависеть от CSR.
 */
const STATIC_SEO_PAGES = {
  '/contacts': {
    title: 'Контакты Билет Всем — поддержка и обратная связь',
    description: 'Контакты Билет Всем: как связаться с поддержкой, задать вопрос по заказу билетов и получить помощь.',
  },
  '/faq': {
    title: 'FAQ — покупка и возврат билетов',
    description: 'Ответы на частые вопросы о выборе мест, оплате, электронных билетах и возврате.',
  },
  '/returns': {
    title: 'Возврат и обмен билетов',
    description: 'Условия возврата и обмена билетов, порядок обращения и сроки обработки заявок.',
  },
  '/privacy': {
    title: 'Политика конфиденциальности',
    description: 'Как сервис обрабатывает и защищает персональные данные пользователей.',
  },
  '/offer': {
    title: 'Публичная оферта',
    description: 'Официальные условия использования сервиса и покупки билетов.',
  },
  '/cookies': {
    title: 'Политика cookies',
    description: 'Информация об использовании cookies и управлении согласием в сервисе.',
  },
  '/requisites': {
    title: 'Реквизиты компании',
    description: 'Юридические и платежные реквизиты сервиса Билет Всем.',
  },
};

function normalizeSlugText(slug) {
  return decodeURIComponent(String(slug || ''))
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCaseRuLike(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

const CITY_LABELS = {
  moskva: 'Москва',
  'sankt-peterburg': 'Санкт-Петербург',
  kazan: 'Казань',
  ekaterinburg: 'Екатеринбург',
  novosibirsk: 'Новосибирск',
};
const GENRE_LABELS = {
  teatr: 'Театр',
  koncert: 'Концерт',
  komediya: 'Комедия',
  detyam: 'Детям',
  sport: 'Спорт',
};
const VENUE_LABELS = {
  'teatr-na-taganke': 'Театр на Таганке',
  'mht-chehova': 'МХТ Чехова',
  'krokus-siti-holl': 'Крокус Сити Холл',
  'vtb-arena': 'ВТБ Арена',
};

function faqPageJsonLd(faqItems) {
  if (!Array.isArray(faqItems) || !faqItems.length) return '';
  return jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  });
}

export async function seoRenderer(req, res, next) {
  // Старые неоднозначные ticket URL без ID репертуара не должны открывать пустую карточку.
  if ((req.method === 'GET' || req.method === 'HEAD') && AMBIGUOUS_TICKET_PATHS.has(req.path)) {
    return res.redirect(302, '/events');
  }

  // Удалённые SEO-разделы: явно сообщаем роботам, что URL больше не существует.
  if (
    (req.method === 'GET' || req.method === 'HEAD') &&
    (GONE_PUBLIC_PATHS.has(req.path) ||
      req.path.startsWith('/blog/') ||
      req.path.startsWith('/products/') ||
      req.path.startsWith('/cases/'))
  ) {
    return res.status(410).type('text/plain; charset=utf-8').send('Gone');
  }

  // Статика из корня dist без express.static: иначе /robots.txt и /manifest.json не отдаются.
  if (req.method === 'GET') {
    if (req.path === '/robots.txt') {
      if (sendDistFile(res, 'robots.txt', 'text/plain; charset=utf-8', 'public, max-age=3600')) return;
      return res.status(404).type('text/plain').send('Not found');
    }
    if (req.path === '/manifest.json') {
      if (sendDistFile(res, 'manifest.json', 'application/manifest+json', 'public, max-age=3600')) return;
      return res.status(404).type('text/plain').send('Not found');
    }
    if (req.path === '/sw.js') {
      if (sendDistFile(res, 'sw.js', 'application/javascript; charset=utf-8', 'no-cache')) return;
      return res.status(404).type('text/plain').send('Not found');
    }
  }

  // Резерв: sitemap/feeds/llms — если запрос дошёл сюда (например, порядок middleware),
  // отдаём XML/MD/YML, а не HTML SPA (иначе краулеры видят «Загрузка...» вместо sitemap).
  if (req.method === 'GET') {
    if (req.path === '/sitemap.xml') return handleSitemapXml(req, res);
    if (req.path === '/llms.txt') return handleLlmsTxt(req, res);
    if (req.path === '/llms-full.txt') return handleLlmsFullTxt(req, res);
    if (req.path === '/feed/services.yml') return handleServicesYml(req, res);
    if (req.path === '/.well-known/llms.txt') return handleWellKnownLlms(req, res);
  }

  // Пропускаем статические файлы и API
  if (req.path.startsWith('/api/') ||
      req.path.startsWith('/legacy/') ||
      req.path.startsWith('/img/') ||
      req.path.startsWith('/css/') ||
      req.path.startsWith('/assets/') ||
      req.path.startsWith('/uploads/')) {
    return next();
  }

  // Не уводить /manifest.json в next() (ниже сработал бы общий 404) — обрабатывается блоком выше
  if (
    req.path !== '/manifest.json' &&
    req.path.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|css|js|woff|woff2|ttf|eot|pdf|zip|json|xml|yml|bin)$/i)
  ) {
    return next();
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }

  let currentPath = indexPath;
  if (!fs.existsSync(currentPath)) {
    currentPath = findIndexHtml();
    if (!fs.existsSync(currentPath)) {
      console.error('[SSR] index.html not found. Tried:', currentPath);
      return res.status(404).send('Not found');
    }
  }

  try {
    let html = fs.readFileSync(currentPath, 'utf-8');
    const seoTags = await generateSeoTags(req.path);

    if (seoTags) {
      html = stripDefaultSeoFromHtml(html);
      html = html.replace('</head>', `${seoTags}\n  </head>`);
      console.log('[SSR] ✓ Dynamic meta for:', req.path);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
    res.setHeader('Vary', 'Accept-Encoding');

    res.send(html);
  } catch (err) {
    console.error('[SSR] Error:', err);
    next(err);
  }
}

async function generateSeoTags(url) {
  let metaTags = '';

  try {
    const base = siteBaseUrl();
    const brand = siteBrand();

    // Кейсы портфолио
    if (url.startsWith('/cases/')) {
      const slug = url.replace('/cases/', '').replace(/\/$/, '');
      const caseData = await getCaseData(slug);

      if (caseData) {
        const title = caseData.seoTitle || caseData.title || 'Кейс';
        const description = caseData.seoDescription || caseData.summary || '';
        const ogImage = toAbsUrl(base, caseData.ogImageUrl || caseData.heroImageUrl || '');
        const canonical = `${base}/cases/${slug}`;
        const breadcrumb = breadcrumbJsonLd(base, [
          { name: 'Главная', path: '/' },
          { name: 'Портфолио', path: '/portfolio' },
          { name: caseData.title || title, path: `/cases/${slug}` },
        ]);
        const caseJson = jsonLdScript({
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: caseData.title || title,
          headline: title,
          description,
          url: canonical,
          ...(ogImage ? { image: ogImage } : {}),
          inLanguage: 'ru-RU',
          publisher: {
            '@type': 'Organization',
            name: brand,
            url: base,
          },
        });

        metaTags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
        ${ogImage ? `<meta property="og:image" content="${ogImage}" />` : ''}
    <meta property="og:site_name" content="${escapeHtml(brand)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${ogImage ? `<meta name="twitter:image" content="${ogImage}" />` : ''}
    ${breadcrumb}
    ${caseJson}`;
      }
    }

    // Услуги / продукты
    else if (url.startsWith('/products/')) {
      const slug = url.replace('/products/', '').replace(/\/$/, '').split('/')[0];
      if (slug) {
        const product = await getProductData(slug);
        if (product) {
          const title = product.metaTitle || product.title || 'Услуга';
          const description = product.metaDescription || product.summary || '';
          const ogImage = toAbsUrl(base, product.imageUrl || '');
          const canonical = `${base}/products/${slug}`;
          const productJson = jsonLdScript({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: product.title || title,
            description,
            url: canonical,
            provider: {
              '@type': 'Organization',
              name: brand,
              url: base,
            },
            areaServed: 'RU',
            ...(ogImage ? { image: ogImage } : {}),
          });
          const breadcrumb = breadcrumbJsonLd(base, [
            { name: 'Главная', path: '/' },
            { name: 'Каталог', path: '/catalog' },
            { name: product.title || title, path: `/products/${slug}` },
          ]);

          metaTags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    ${product.metaKeywords ? `<meta name="keywords" content="${escapeHtml(Array.isArray(product.metaKeywords) ? product.metaKeywords.join(', ') : product.metaKeywords)}" />` : ''}
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    ${ogImage ? `<meta property="og:image" content="${ogImage}" />` : ''}
    <meta property="og:site_name" content="${escapeHtml(brand)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${ogImage ? `<meta name="twitter:image" content="${ogImage}" />` : ''}
    ${breadcrumb}
    ${productJson}`;
        }
      }
    }

    // Блог
    else if (url.startsWith('/blog/') && url !== '/blog' && url !== '/blog/') {
      const slug = url.replace('/blog/', '').replace(/\/$/, '');
      const postData = await getBlogPostData(slug);

      if (postData) {
        const title = postData.seo_title || postData.seoTitle || postData.title || 'Статья';
        const description = postData.seo_description || postData.seoDescription || postData.excerpt || '';
        const ogImage = toAbsUrl(
          base,
          postData.og_image_url || postData.ogImageUrl || postData.cover_image_url || postData.coverImageUrl || postData.imageUrl || '',
        );
        const canonical = `${base}/blog/${slug}`;
        const datePublished =
          (postData.published_at && String(postData.published_at)) ||
          (postData.publishedAt && String(postData.publishedAt)) ||
          '';
        const dateModified =
          (postData.updated_at && String(postData.updated_at)) ||
          (postData.updatedAt && String(postData.updatedAt)) ||
          datePublished;
        const blogJson = jsonLdScript({
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: title,
          description,
          url: canonical,
          ...(ogImage ? { image: ogImage } : {}),
          ...(datePublished ? { datePublished } : {}),
          ...(dateModified ? { dateModified } : {}),
          author: {
            '@type': 'Organization',
            name: brand,
            url: base,
          },
          publisher: {
            '@type': 'Organization',
            name: brand,
            url: base,
          },
          inLanguage: 'ru-RU',
          mainEntityOfPage: canonical,
        });
        const breadcrumb = breadcrumbJsonLd(base, [
          { name: 'Главная', path: '/' },
          { name: 'Блог', path: '/blog' },
          { name: postData.title || title, path: `/blog/${slug}` },
        ]);

        metaTags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    ${ogImage ? `<meta property="og:image" content="${ogImage}" />` : ''}
    <meta property="og:site_name" content="${escapeHtml(brand)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${ogImage ? `<meta name="twitter:image" content="${ogImage}" />` : ''}
    ${breadcrumb}
    ${blogJson}`;
      }
    }

    // Поиск мероприятий
    else if (url === '/events' || url === '/events/') {
      const canonical = `${base}/events`;
      const title = 'Поиск мероприятий — афиша и билеты';
      const description = 'Поиск событий по названию, площадке и жанру. Билеты онлайн.';
      const collectionJson = jsonLdScript({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        description,
        url: canonical,
        inLanguage: 'ru-RU',
        isPartOf: `${base}/`,
      });
      const faqJson = faqPageJsonLd([
        {
          q: 'Как купить билет на мероприятие?',
          a: 'Откройте карточку события, выберите сеанс и места, затем оплатите заказ онлайн. Электронный билет придет после подтверждения оплаты.',
        },
        {
          q: 'Можно ли вернуть билет?',
          a: 'Да, возврат оформляется по правилам мероприятия и действующему законодательству. Подробные условия указаны на странице возврата.',
        },
        {
          q: 'Как найти мероприятия по жанру и площадке?',
          a: 'Используйте фильтры жанра и площадки на странице афиши, а также поисковую строку по названию события.',
        },
      ]);
      metaTags = `${metaBlockForPage({ base, brand, canonical, title, description, ogType: 'website' })}
    ${breadcrumbJsonLd(base, [{ name: 'Главная', path: '/' }, { name: 'Афиша', path: '/events' }])}
    ${collectionJson}
    ${faqJson}`;
    }

    // Альтернативный путь главной (афиша)
    else if (url === '/afisha' || url === '/afisha/') {
      const canonical = `${base}/afisha`;
      const title = 'Афиша — билеты на мероприятия';
      const description = 'Календарь событий, поиск по площадкам и жанрам. Покупка билетов онлайн.';
      metaTags = `${metaBlockForPage({ base, brand, canonical, title, description, ogType: 'website' })}
    ${breadcrumbJsonLd(base, [{ name: 'Главная', path: '/' }, { name: 'Афиша', path: '/afisha' }])}
    ${faqPageJsonLd([
      {
        q: 'Где смотреть актуальную афишу?',
        a: 'Актуальная афиша доступна на странице /events и обновляется по данным билетной системы.',
      },
      {
        q: 'Какие жанры доступны?',
        a: 'В каталоге доступны театр, концерты, комедия, события для детей и спортивные мероприятия.',
      },
    ])}`;
    }

    // SEO-лендинги по городам / жанрам / площадкам.
    else if (url.startsWith('/events/city/')) {
      const rawSlug = url.replace('/events/city/', '').replace(/\/$/, '').split('?')[0];
      const slug = normalizeSlugText(rawSlug);
      if (slug) {
        const cityLabel = CITY_LABELS[rawSlug] || titleCaseRuLike(slug);
        const canonical = `${base}/events/city/${encodeURIComponent(slug).replace(/%20/g, '-')}`;
        metaTags = `${metaBlockForPage({
          base,
          brand,
          canonical,
          title: `Афиша ${cityLabel} — билеты на мероприятия`,
          description: `Смотрите афишу событий в ${cityLabel}: концерты, театр и шоу. Покупка билетов онлайн.`,
          ogType: 'website',
        })}
    ${breadcrumbJsonLd(base, [
      { name: 'Главная', path: '/' },
      { name: 'Афиша', path: '/events' },
      { name: cityLabel, path: `/events/city/${encodeURIComponent(slug).replace(/%20/g, '-')}` },
    ])}
    ${faqPageJsonLd([
      {
        q: `Какие мероприятия доступны в ${cityLabel}?`,
        a: 'В афише представлены концерты, спектакли, шоу и другие события с онлайн-покупкой билетов.',
      },
      {
        q: 'Как выбрать лучшие места?',
        a: 'Откройте страницу события и выберите места на схеме зала с учетом цены и обзора.',
      },
    ])}`;
      }
    }
    else if (url.startsWith('/events/genre/')) {
      const rawSlug = url.replace('/events/genre/', '').replace(/\/$/, '').split('?')[0];
      const slug = normalizeSlugText(rawSlug);
      if (slug) {
        const genreLabel = GENRE_LABELS[rawSlug] || titleCaseRuLike(slug);
        const canonical = `${base}/events/genre/${encodeURIComponent(slug).replace(/%20/g, '-')}`;
        metaTags = `${metaBlockForPage({
          base,
          brand,
          canonical,
          title: `${genreLabel} — афиша и билеты`,
          description: `Подборка мероприятий в жанре «${genreLabel}»: актуальные события и покупка билетов онлайн.`,
          ogType: 'website',
        })}
    ${breadcrumbJsonLd(base, [
      { name: 'Главная', path: '/' },
      { name: 'Афиша', path: '/events' },
      { name: genreLabel, path: `/events/genre/${encodeURIComponent(slug).replace(/%20/g, '-')}` },
    ])}
    ${faqPageJsonLd([
      {
        q: `Как найти лучшие события жанра «${genreLabel}»?`,
        a: 'Используйте эту подборку и фильтры по площадке, дате и цене, чтобы быстро выбрать подходящее мероприятие.',
      },
      {
        q: 'Можно ли купить билет сразу онлайн?',
        a: 'Да, оформление и оплата билетов доступны онлайн на карточке выбранного события.',
      },
    ])}`;
      }
    }
    else if (url.startsWith('/events/venue/')) {
      const rawSlug = url.replace('/events/venue/', '').replace(/\/$/, '').split('?')[0];
      const slug = normalizeSlugText(rawSlug);
      if (slug) {
        const venueLabel = VENUE_LABELS[rawSlug] || titleCaseRuLike(slug);
        const canonical = `${base}/events/venue/${encodeURIComponent(slug).replace(/%20/g, '-')}`;
        metaTags = `${metaBlockForPage({
          base,
          brand,
          canonical,
          title: `${venueLabel} — афиша площадки и билеты`,
          description: `События на площадке «${venueLabel}»: расписание, выбор мест и покупка билетов онлайн.`,
          ogType: 'website',
        })}
    ${breadcrumbJsonLd(base, [
      { name: 'Главная', path: '/' },
      { name: 'Афиша', path: '/events' },
      { name: venueLabel, path: `/events/venue/${encodeURIComponent(slug).replace(/%20/g, '-')}` },
    ])}
    ${faqPageJsonLd([
      {
        q: `Как посмотреть расписание на площадке «${venueLabel}»?`,
        a: 'В подборке показаны актуальные события на площадке, доступные для онлайн-бронирования и покупки.',
      },
      {
        q: 'Где выбрать места в зале?',
        a: 'После перехода в карточку события откройте схему зала и выберите подходящие места по цене и обзору.',
      },
    ])}`;
      }
    }

    // Страница билетов / бронирования
    else if (url.startsWith('/ticket/')) {
      const m = url.match(/^\/ticket\/([^/?#]+)(?:\/([^/?#]+))?/);
      if (m) {
        const firstSeg = decodeURIComponent(m[1]).trim();
        const secondSeg = m[2] ? decodeURIComponent(m[2]).trim() : '';
        const repId = looksLikeGetbiletId(firstSeg) ? firstSeg : '';
        const routeSlug = repId ? secondSeg : firstSeg;
        const ctxKey = repId || routeSlug;
        const ctx = ctxKey
          ? await getRepertoireContext(ctxKey, { fastPath: true, omitStageSvgMarkup: true })
          : null;
        const canonicalPath = routeSlug
          ? `/ticket/${encodeURIComponent(routeSlug)}`
          : repId
            ? `/ticket/${encodeURIComponent(repId)}`
            : '/events';
        const canonical = `${base}${canonicalPath}`;
        const displayTitle = (ctx && ctx.title) || 'Мероприятие';
        const title = `Билеты — ${displayTitle}`;
        const rawDesc =
          (ctx && (ctx.heroLead || ctx.descriptionSnippet) && String(ctx.heroLead || ctx.descriptionSnippet).trim()) ||
          'Выбор мест и бронирование билетов онлайн.';
        const description = rawDesc.slice(0, 160);
        const ogImage = toAbsUrl(base, ctx && ctx.posterUrl ? ctx.posterUrl : '');
        const ogLine = ogImage
          ? `<meta property="og:image" content="${escapeHtml(ogImage)}" />
    <meta name="twitter:image" content="${escapeHtml(ogImage)}" />`
          : '';
        const locationJson =
          ctx && (ctx.venueLabel || ctx.venueAddress)
            ? {
                '@type': 'Place',
                name: ctx.venueLabel || undefined,
                address: ctx.venueAddress || undefined,
              }
            : undefined;
        const eventJson = ctx && ctx.title
          ? `<script type="application/ld+json">${JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Event',
              name: displayTitle,
              url: canonical,
              ...(ogImage ? { image: ogImage } : {}),
              description: description.slice(0, 500),
              organizer: { '@type': 'Organization', name: brand, url: base },
              ...(locationJson ? { location: locationJson } : {}),
              eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
              eventStatus: 'https://schema.org/EventScheduled',
            })}</script>`
          : '';
        const breadcrumb = breadcrumbJsonLd(base, [
          { name: 'Главная', path: '/' },
          { name: 'Афиша', path: '/events' },
          { name: displayTitle, path: canonicalPath },
        ]);
        metaTags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    ${ogLine}
    <meta property="og:site_name" content="${escapeHtml(brand)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${breadcrumb}
    ${eventJson}
    ${faqPageJsonLd([
      {
        q: 'Как купить билет на это мероприятие?',
        a: 'Выберите места на схеме зала и завершите оплату. Электронный билет будет доступен после подтверждения платежа.',
      },
      {
        q: 'Можно ли вернуть билет на это событие?',
        a: 'Возврат зависит от условий организатора и правил площадки. Подробности смотрите в разделе возврата билетов.',
      },
    ])}`;
      }
    }

    // Остальные приоритетные статические страницы.
    else {
      const normalized = url.replace(/\/+$/, '') || '/';
      const staticSeo = STATIC_SEO_PAGES[normalized];
      if (staticSeo) {
        const canonical = normalized === '/' ? `${base}/` : `${base}${normalized}`;
        const pageName = staticSeo.title;
        const breadcrumb = breadcrumbJsonLd(base, [
          { name: 'Главная', path: '/' },
          { name: pageName, path: normalized },
        ]);
        const webPageJson = jsonLdScript({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: pageName,
          description: staticSeo.description,
          url: canonical,
          inLanguage: 'ru-RU',
          isPartOf: `${base}/`,
        });
        metaTags = metaBlockForPage({
          base,
          brand,
          canonical,
          title: staticSeo.title,
          description: staticSeo.description,
          ogType: 'website',
        });
        metaTags += `\n    ${breadcrumb}\n    ${webPageJson}`;
      }
    }
  } catch (err) {
    console.error('[SSR] Error generating tags:', err.message);
  }

  return metaTags;
}

async function getCaseData(slug) {
  try {
    const response = await fetch(`${API_BASE}/api/public/cases/${slug}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error('[SSR] Error fetching case:', err.message);
    return null;
  }
}

async function getProductData(slug) {
  try {
    const response = await fetch(`${API_BASE}/api/public/products/${encodeURIComponent(slug)}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error('[SSR] Error fetching product:', err.message);
    return null;
  }
}

async function getBlogPostData(slug) {
  try {
    const response = await fetch(`${API_BASE}/api/public/blog/${encodeURIComponent(slug)}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error('[SSR] Error fetching blog:', err.message);
    return null;
  }
}

async function getRepertoireContext(repertoireId) {
  try {
    const response = await fetch(
      `${API_BASE}/api/bilet/repertoire/${encodeURIComponent(repertoireId)}/context`,
    );
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error('[SSR] Error fetching repertoire context:', err.message);
    return null;
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
