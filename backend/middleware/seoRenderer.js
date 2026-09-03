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
import { getSsrHtmlCache, setSsrHtmlCache } from '../lib/ssr-html-cache.js';
import { buildExtraHeadJsonLd } from '../lib/ssr-head-schema.js';
import {
  injectSsrIntoHtml,
  injectCrawlMirror,
  buildTicketEventSsrHtml,
  buildStaticLandingSsrHtml,
  buildEventsIndexSsrHtml,
  buildHomeSsrHtml,
  buildCmsPageSsrHtml,
  buildEventItemListSchema,
} from '../lib/ticket-ssr-html.js';
import { getIndexNowKey, indexNowKeyBody } from '../lib/search-indexing.js';
import {
  getRepertoirePublicContext,
  resolveRepertoireSlug,
} from '../services/repertoirePublicContext.js';
import ticketPool from '../ticketDb.js';
import pool from '../db.js';
import { computeOffersSnapshot } from '../services/ticketPriceAlerts.js';
import { getPublicOffersForRepertoire } from '../services/getbiletOffersPublic.js';
import {
  resolveTicketSeo,
  composeAutoTicketDescription,
} from '../lib/seo-ticket-meta-catalog.js';
import {
  resolveSitePageSeo,
  resolveEventsFilterSeo,
  lookupStaticLandingSeo,
} from '../lib/seo-site-meta-catalog.js';

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
  // Убираем дефолтный JSON-LD из shell — SSR инжектит актуальный graph.
  out = out.replace(/<script type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, '');
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

function normalizeSlugText(slug) {
  return decodeURIComponent(String(slug || ''))
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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
    if (req.path === '/favicon.ico') {
      if (sendDistFile(res, 'favicon.ico', 'image/x-icon', 'public, max-age=86400')) return;
      return res.status(404).type('text/plain').send('Not found');
    }
  }

  // IndexNow key file (fallback, если не смонтирован в sitemap router).
  if (req.method === 'GET' && req.path === `/${getIndexNowKey()}.txt`) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(indexNowKeyBody());
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
    const pathOnly = req.path;
    const query = req.query || {};
    const allowCache = !Object.keys(query).length;

    if (allowCache) {
      const cached = getSsrHtmlCache(pathOnly);
      if (cached) {
        res.status(200);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Vary', 'Accept-Encoding');
        res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
        res.setHeader('X-BV-SSR-Cache', 'HIT');
        return res.send(cached);
      }
    }

    let html = fs.readFileSync(currentPath, 'utf-8');
    const seoCtx = await generateSeoTags(pathOnly);
    let seoTags = typeof seoCtx === 'string' ? seoCtx : seoCtx?.metaTags || '';
    const ssrMeta = typeof seoCtx === 'object' && seoCtx ? seoCtx : null;
    const ssrFragment = await generateSsrContent(pathOnly, ssrMeta);
    const base = siteBaseUrl();
    const extraLd = buildExtraHeadJsonLd({
      pathOnly,
      origin: base,
      metaTagsHtml: seoTags,
    });

    // Query-параметры: canonical без query уже в meta; для индекса — noindex,follow.
    if (!allowCache) {
      if (!/name="robots"/i.test(seoTags)) {
        seoTags += `\n    <meta name="robots" content="noindex, follow" />`;
      }
      res.setHeader('X-Robots-Tag', 'noindex, follow');
    }

    // Всегда strip shell SEO: иначе дубли title/OG/JSON-LD с index.html.
    html = stripDefaultSeoFromHtml(html);
    const headInject = `${seoTags || ''}${extraLd || ''}`;
    if (headInject) {
      html = html.replace('</head>', `${headInject}\n  </head>`);
    }
    html = injectSsrIntoHtml(html, ssrFragment);
    html = injectCrawlMirror(html, ssrFragment);
    console.log('[SSR] ✓', pathOnly, ssrFragment ? '+ content' : '');

    res.status(200);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', allowCache ? 'public, max-age=60, must-revalidate' : 'no-store');
    res.setHeader('Vary', 'Accept-Encoding');
    res.setHeader('X-BV-SSR-Cache', allowCache ? 'MISS' : 'BYPASS');
    if (allowCache) setSsrHtmlCache(pathOnly, html);

    res.send(html);
  } catch (err) {
    console.error('[SSR] Error:', err);
    next(err);
  }
}

/**
 * @returns {Promise<{ metaTags: string; ssr?: Record<string, unknown> | null }>}
 */
async function generateSeoTags(url) {
  /** @type {{ metaTags: string; ssr?: Record<string, unknown> | null }} */
  let out = { metaTags: '', ssr: null };

  try {
    const base = siteBaseUrl();
    const brand = siteBrand();

    // Поиск мероприятий
    if (url === '/events' || url === '/events/') {
      const canonical = `${base}/events`;
      const landingSeo = lookupStaticLandingSeo('/events');
      const title = landingSeo?.title || 'Афиша мероприятий — билеты, места онлайн';
      const description =
        landingSeo?.description ||
        'Актуальные концерты, театр и спорт: выбор мест на схеме зала и покупка билетов онлайн.';
      const events = await fetchPublishedEventsForSsr(24);
      const collectionJson = jsonLdScript({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        description,
        url: canonical,
        inLanguage: 'ru-RU',
        isPartOf: `${base}/`,
      });
      const itemListJson = jsonLdScript(
        buildEventItemListSchema(base, events, { name: title, url: canonical }),
      );
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
      out.metaTags = `${metaBlockForPage({ base, brand, canonical, title, description, ogType: 'website' })}
    ${breadcrumbJsonLd(base, [{ name: 'Главная', path: '/' }, { name: 'Афиша', path: '/events' }])}
    ${collectionJson}
    ${itemListJson}
    ${faqJson}`;
      out.ssr = {
        kind: 'events-index',
        title,
        description,
        events,
        h1: landingSeo?.h1 || title,
      };
    }

    // Альтернативный путь главной (афиша)
    else if (url === '/afisha' || url === '/afisha/') {
      const canonical = `${base}/afisha`;
      const landingSeo = lookupStaticLandingSeo('/afisha');
      const title = landingSeo?.title || 'Афиша — билеты на мероприятия';
      const description =
        landingSeo?.description ||
        'Календарь событий, поиск по площадкам и жанрам. Покупка билетов онлайн.';
      const h1 = landingSeo?.h1 || 'Афиша мероприятий';
      out.metaTags = `${metaBlockForPage({ base, brand, canonical, title, description, ogType: 'website' })}
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
      out.ssr = { kind: 'landing', title, description, path: '/afisha', h1 };
    }

    // SEO-лендинги по городам / жанрам / площадкам.
    else if (url.startsWith('/events/city/') || url.startsWith('/events/genre/') || url.startsWith('/events/venue/')) {
      const kind = url.startsWith('/events/city/')
        ? 'city'
        : url.startsWith('/events/genre/')
          ? 'genre'
          : 'venue';
      const prefix = `/events/${kind}/`;
      const rawSlug = url.replace(prefix, '').replace(/\/$/, '').split('?')[0];
      const slug = normalizeSlugText(rawSlug);
      const filterSeo = resolveEventsFilterSeo(kind, rawSlug);
      if (slug && filterSeo) {
        const path = `${prefix}${encodeURIComponent(slug).replace(/%20/g, '-')}`;
        const canonical = `${base}${path}`;
        const { title, description, h1 } = filterSeo;
        const crumbName = h1 || title;
        out.metaTags = `${metaBlockForPage({
          base,
          brand,
          canonical,
          title,
          description,
          ogType: 'website',
        })}
    ${breadcrumbJsonLd(base, [
      { name: 'Главная', path: '/' },
      { name: 'Афиша', path: '/events' },
      { name: crumbName, path },
    ])}
    ${faqPageJsonLd([
      {
        q: 'Как купить билет на событие из подборки?',
        a: 'Откройте карточку мероприятия, выберите места на схеме зала и оплатите онлайн — электронный билет придёт после оплаты.',
      },
      {
        q: 'Где смотреть дату, площадку и цены?',
        a: 'Дата, площадка и цены указаны в карточке события; места выбираются на интерактивной схеме зала.',
      },
    ])}`;
        out.ssr = { kind: 'landing', title, description, path, h1 };
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
        const ctx = ctxKey ? await getRepertoireContext(ctxKey) : null;
        const repertoireId = ctx?.repertoireId || repId || '';
        const minPrice = repertoireId ? await getCachedMinPrice(repertoireId) : null;
        const venueFromCtx = (ctx && ctx.venueLabel) || null;
        const beginFromCtx = (ctx && ctx.beginDateTime) || null;
        const seoOpts = {
          minPrice,
          venueLabel: venueFromCtx,
          beginDateTime: beginFromCtx,
        };
        const catalogSeo =
          resolveTicketSeo(routeSlug || repertoireId, seoOpts) ||
          resolveTicketSeo(repertoireId, seoOpts) ||
          resolveTicketSeo(firstSeg, seoOpts);
        const beginDateTime = beginFromCtx || catalogSeo?.facts?.beginDateTime || null;
        const venueLabel =
          venueFromCtx || catalogSeo?.facts?.venue || null;
        const venueAddress = (ctx && ctx.venueAddress) || null;
        const canonicalPath = routeSlug
          ? `/ticket/${encodeURIComponent(routeSlug)}`
          : repId
            ? `/ticket/${encodeURIComponent(repId)}`
            : '/events';
        const canonical = `${base}${canonicalPath}`;
        const displayTitle = (ctx && ctx.title) || catalogSeo?.h1 || 'Мероприятие';
        // Catalog override побеждает auto; иначе money-title generator
        const title =
          catalogSeo?.title || buildMoneyTicketTitle(displayTitle, minPrice, 70);
        const h1 = (catalogSeo?.h1 || displayTitle).slice(0, 80);
        const lead =
          (ctx && (ctx.heroLead || ctx.descriptionSnippet) && String(ctx.heroLead || ctx.descriptionSnippet).trim()) ||
          '';
        const description = (
          catalogSeo?.description ||
          composeAutoTicketDescription({
            displayTitle,
            minPrice,
            venueLabel,
            beginDateTime,
            lead,
          })
        ).slice(0, 160);
        const keywordsMeta = catalogSeo?.keywords
          ? `\n    <meta name="keywords" content="${escapeHtml(catalogSeo.keywords)}" />`
          : '';
        const ogImage = toAbsUrl(
          base,
          (ctx && (ctx.posterUrl || ctx.bannerUrl)) || '',
        );
        const ogLine = ogImage
          ? `<meta property="og:image" content="${escapeHtml(ogImage)}" />
    <meta name="twitter:image" content="${escapeHtml(ogImage)}" />`
          : '';
        const locationJson =
          venueLabel || venueAddress
            ? {
                '@type': 'Place',
                name: venueLabel || undefined,
                address: venueAddress
                  ? { '@type': 'PostalAddress', streetAddress: venueAddress }
                  : venueLabel
                    ? { '@type': 'PostalAddress', name: venueLabel }
                    : undefined,
              }
            : undefined;
        const offersJson =
          minPrice != null
            ? {
                '@type': 'AggregateOffer',
                priceCurrency: 'RUB',
                lowPrice: Math.round(minPrice),
                availability: 'https://schema.org/InStock',
                url: canonical,
              }
            : {
                '@type': 'Offer',
                url: canonical,
                availability: 'https://schema.org/InStock',
                priceCurrency: 'RUB',
              };
        const eventJson = ctx && ctx.title
          ? jsonLdScript({
              '@context': 'https://schema.org',
              '@type': 'Event',
              name: displayTitle,
              url: canonical,
              ...(ogImage ? { image: ogImage } : {}),
              description: description.slice(0, 500),
              ...(beginDateTime ? { startDate: beginDateTime } : {}),
              organizer: { '@type': 'Organization', name: brand, url: base },
              ...(locationJson ? { location: locationJson } : {}),
              offers: offersJson,
              eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
              eventStatus: 'https://schema.org/EventScheduled',
            })
          : '';
        const breadcrumb = breadcrumbJsonLd(base, [
          { name: 'Главная', path: '/' },
          { name: 'Афиша', path: '/events' },
          { name: displayTitle, path: canonicalPath },
        ]);
        const faqItems = [
          {
            q: 'Как купить билет на это мероприятие?',
            a: 'Выберите места на схеме зала и завершите оплату. Электронный билет будет доступен после подтверждения платежа.',
          },
          {
            q: 'Можно ли вернуть билет на это событие?',
            a: 'Возврат зависит от условий организатора и правил площадки. Подробности смотрите в разделе возврата билетов.',
          },
        ];
        const related = await fetchRelatedEventsForSsr(repertoireId, 6);
        const sections = Array.isArray(ctx?.descriptionSections) ? ctx.descriptionSections : [];
        out.metaTags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />${keywordsMeta}
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
    ${faqPageJsonLd(faqItems)}`;
        out.ssr = {
          kind: 'ticket',
          title: displayTitle,
          h1,
          description,
          venueLabel,
          venueAddress,
          beginDateTime,
          minPrice,
          canonicalPath,
          posterUrl: ogImage || null,
          sections,
          related,
          faq: faqItems,
        };
      }
    }

    // Остальные приоритетные статические страницы + CMS.
    else {
      const normalized = url.replace(/\/+$/, '') || '/';
      const staticSeo = resolveSitePageSeo(normalized) || lookupStaticLandingSeo(normalized);
      if (staticSeo) {
        const canonical = normalized === '/' ? `${base}/` : `${base}${normalized}`;
        const events =
          normalized === '/' || normalized === '/events' || normalized === '/afisha'
            ? await fetchPublishedEventsForSsr(16)
            : [];
        const itemListJson = events.length
          ? jsonLdScript(
              buildEventItemListSchema(base, events, {
                name: staticSeo.title,
                url: canonical,
              }),
            )
          : '';
        const breadcrumb =
          normalized === '/'
            ? breadcrumbJsonLd(base, [{ name: 'Главная', path: '/' }])
            : breadcrumbJsonLd(base, [
                { name: 'Главная', path: '/' },
                { name: staticSeo.h1 || staticSeo.title, path: normalized },
              ]);
        out.metaTags = metaBlockForPage({
          base,
          brand,
          canonical,
          title: staticSeo.title,
          description: staticSeo.description,
          ogType: 'website',
        });
        out.metaTags += `\n    ${breadcrumb}\n    ${itemListJson}`;
        if (normalized === '/case/bilet-vsem') {
          out.metaTags += `\n    ${jsonLdScript({
            '@context': 'https://schema.org',
            '@type': 'Article',
            name: staticSeo.h1 || staticSeo.title,
            headline: staticSeo.h1 || staticSeo.title,
            description: staticSeo.description,
            url: canonical,
            author: { '@type': 'Organization', name: brand, url: base },
            publisher: { '@type': 'Organization', name: brand, url: base },
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
          })}`;
        }
        out.ssr =
          normalized === '/'
            ? {
                kind: 'home',
                title: staticSeo.title,
                description: staticSeo.description,
                events,
                h1: staticSeo.h1,
              }
            : {
                kind: 'landing',
                title: staticSeo.title,
                description: staticSeo.description,
                path: normalized,
                h1: staticSeo.h1 || staticSeo.title,
                events,
              };
      } else if (!normalized.startsWith('/ticket') && !normalized.startsWith('/events') && !normalized.startsWith('/admin')) {
        const cms = await fetchCmsPageForSsr(normalized);
        if (cms) {
          const slugPath = cms.slug.startsWith('/') ? cms.slug : `/${cms.slug}`;
          const canonical = `${base}${slugPath === '/' ? '/' : slugPath}`;
          const catalogHit = resolveSitePageSeo(slugPath);
          const title = catalogHit?.title || cms.seo_title || cms.title || 'Страница';
          const description = (catalogHit?.description || cms.seo_description || '').slice(0, 160);
          const h1 = catalogHit?.h1 || cms.title || title;
          out.metaTags = `${metaBlockForPage({
            base,
            brand,
            canonical,
            title,
            description: description || title,
            ogType: 'website',
          })}
    ${breadcrumbJsonLd(base, [
      { name: 'Главная', path: '/' },
      { name: h1, path: slugPath },
    ])}`;
          out.ssr = {
            kind: 'cms',
            title: h1,
            description,
            bodyHtml: cms.body || '',
            path: slugPath,
          };
        }
      }
    }
  } catch (err) {
    console.error('[SSR] Error generating tags:', err.message);
  }

  return out;
}

async function generateSsrContent(url, seoCtx) {
  const ssr = seoCtx?.ssr;
  if (!ssr) {
    if (url === '/events' || url === '/events/') {
      const events = await fetchPublishedEventsForSsr(24);
      return buildEventsIndexSsrHtml({ events });
    }
    return '';
  }
  if (ssr.kind === 'ticket') return buildTicketEventSsrHtml(ssr);
  if (ssr.kind === 'events-index') return buildEventsIndexSsrHtml({ events: ssr.events || [] });
  if (ssr.kind === 'home') return buildHomeSsrHtml({ events: ssr.events || [] });
  if (ssr.kind === 'landing') return buildStaticLandingSsrHtml(ssr);
  if (ssr.kind === 'cms') return buildCmsPageSsrHtml(ssr);
  return '';
}

function clipSeoTitle(text, max = 70) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return (sp > Math.floor(max * 0.55) ? cut.slice(0, sp) : cut).trim();
}

/** Title money URL: имя режется, суффикс с ценой сохраняется. */
function buildMoneyTicketTitle(displayTitle, minPrice, max = 70) {
  const pricePart =
    minPrice != null && Number.isFinite(Number(minPrice))
      ? ` от ${Math.round(Number(minPrice))} ₽`
      : '';
  const suffix = `: билеты${pricePart}`;
  const budget = Math.max(18, max - suffix.length);
  let name = String(displayTitle || 'Мероприятие').replace(/\s+/g, ' ').trim();
  if (name.length > budget) {
    const cut = name.slice(0, budget);
    const sp = cut.lastIndexOf(' ');
    name = (sp > 12 ? cut.slice(0, sp) : cut).trim();
  }
  return `${name}${suffix}`;
}

/** Только DB-кэш офферов — без внешнего API в hot path SSR. Цены как на витрине (наценка + свои места). */
async function getCachedMinPrice(repertoireId) {
  try {
    const { payload } = await getPublicOffersForRepertoire(repertoireId, { cacheOnly: true });
    const snap = computeOffersSnapshot(payload);
    return snap.minPrice;
  } catch {
    return null;
  }
}

async function fetchPublishedEventsForSsr(limit = 20) {
  try {
    const r = await ticketPool.query(
      `SELECT getbilet_external_id::text AS id,
              COALESCE(NULLIF(TRIM(title_manual), ''), getbilet_external_id::text) AS title,
              NULLIF(TRIM(venue_manual), '') AS venue_label
       FROM getbilet_events
       WHERE is_published = TRUE
       ORDER BY updated_at DESC
       LIMIT $1`,
      [limit],
    );
    return r.rows.map((row) => ({
      id: row.id,
      title: row.title,
      venueLabel: row.venue_label,
      path: `/ticket/${encodeURIComponent(row.id)}`,
    }));
  } catch (err) {
    console.warn('[SSR] published events:', err.message);
    return [];
  }
}

async function fetchRelatedEventsForSsr(excludeId, limit = 6) {
  const all = await fetchPublishedEventsForSsr(limit + 8);
  const ex = String(excludeId || '');
  return all.filter((e) => e.id !== ex).slice(0, limit);
}

async function fetchCmsPageForSsr(pathOrSlug) {
  try {
    let slug = String(pathOrSlug || '').trim();
    if (!slug || slug === '/') return null;
    if (!slug.startsWith('/')) slug = `/${slug}`;
    // blocklist мусорных/служебных
    if (
      slug.startsWith('/api') ||
      slug.startsWith('/admin') ||
      slug.startsWith('/assets') ||
      slug.includes('.')
    ) {
      return null;
    }
    const r = await pool.query(
      `SELECT slug, title, body, seo_title, seo_description, robots_index
       FROM pages
       WHERE is_published = TRUE
         AND (slug = $1 OR slug = $2)
       LIMIT 1`,
      [slug, slug.replace(/^\//, '')],
    );
    const row = r.rows[0];
    if (!row) return null;
    if (row.robots_index === false) return null;
    return row;
  } catch (err) {
    console.warn('[SSR] cms page:', err.message);
    return null;
  }
}

async function getRepertoireContext(ctxKey) {
  try {
    let repertoireId = String(ctxKey || '').trim();
    if (!repertoireId) return null;
    const opts = {
      fastPath: true,
      omitStageSvgMarkup: true,
      includeDescriptionSections: true,
    };
    if (!looksLikeGetbiletId(repertoireId)) {
      const hit = await resolveRepertoireSlug(repertoireId);
      if (!hit?.repertoireId) return null;
      repertoireId = hit.repertoireId;
      const ctx = await getRepertoirePublicContext(repertoireId, opts);
      return {
        ...ctx,
        beginDateTime: ctx.beginDateTime || hit.beginDateTime || null,
      };
    }
    return await getRepertoirePublicContext(repertoireId, opts);
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
