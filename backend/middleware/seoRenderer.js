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

export async function seoRenderer(req, res, next) {
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
    req.path.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|css|js|woff|woff2|ttf|eot|pdf|zip|json|xml|yml)$/i)
  ) {
    return next();
  }

  if (req.method !== 'GET') {
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
        const ogImage = caseData.ogImageUrl || caseData.heroImageUrl || '';
        const canonical = `${base}/cases/${slug}`;

        metaTags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
        ${ogImage ? `<meta property="og:image" content="${ogImage.startsWith('http') ? ogImage : base + (ogImage.startsWith('/') ? ogImage : '/' + ogImage)}" />` : ''}
    <meta property="og:site_name" content="${escapeHtml(brand)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${ogImage ? `<meta name="twitter:image" content="${ogImage.startsWith('http') ? ogImage : base + (ogImage.startsWith('/') ? ogImage : '/' + ogImage)}" />` : ''}`;
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
          const ogImage = product.imageUrl || '';
          const canonical = `${base}/products/${slug}`;

          metaTags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    ${product.metaKeywords ? `<meta name="keywords" content="${escapeHtml(Array.isArray(product.metaKeywords) ? product.metaKeywords.join(', ') : product.metaKeywords)}" />` : ''}
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    ${ogImage ? `<meta property="og:image" content="${ogImage.startsWith('http') ? ogImage : base + (ogImage.startsWith('/') ? ogImage : '/' + ogImage)}" />` : ''}
    <meta property="og:site_name" content="${escapeHtml(brand)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${ogImage ? `<meta name="twitter:image" content="${ogImage.startsWith('http') ? ogImage : base + (ogImage.startsWith('/') ? ogImage : '/' + ogImage)}" />` : ''}`;
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
        const ogImage = postData.og_image_url || postData.ogImageUrl || postData.cover_image_url || postData.coverImageUrl || postData.imageUrl || '';
        const canonical = `${base}/blog/${slug}`;

        metaTags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    ${ogImage ? `<meta property="og:image" content="${ogImage.startsWith('http') ? ogImage : base + (ogImage.startsWith('/') ? ogImage : '/' + ogImage)}" />` : ''}
    <meta property="og:site_name" content="${escapeHtml(brand)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${ogImage ? `<meta name="twitter:image" content="${ogImage.startsWith('http') ? ogImage : base + (ogImage.startsWith('/') ? ogImage : '/' + ogImage)}" />` : ''}`;
      }
    }

    // Поиск мероприятий
    else if (url === '/events' || url === '/events/') {
      const canonical = `${base}/events`;
      const title = 'Поиск мероприятий — афиша и билеты';
      const description = 'Поиск событий по названию, площадке и жанру. Билеты онлайн.';
      metaTags = metaBlockForPage({ base, brand, canonical, title, description, ogType: 'website' });
    }

    // Альтернативный путь главной (афиша)
    else if (url === '/afisha' || url === '/afisha/') {
      const canonical = `${base}/afisha`;
      const title = 'Афиша — билеты на мероприятия';
      const description = 'Календарь событий, поиск по площадкам и жанрам. Покупка билетов онлайн.';
      metaTags = metaBlockForPage({ base, brand, canonical, title, description, ogType: 'website' });
    }

    // Страница билетов / бронирования
    else if (url.startsWith('/ticket/')) {
      const m = url.match(/^\/ticket\/([^/?#]+)(?:\/([^/?#]+))?/);
      if (m) {
        const repId = decodeURIComponent(m[1]);
        const ctx = await getRepertoireContext(repId);
        const slugPart = m[2] ? `/${m[2]}` : '';
        const canonical = `${base}/ticket/${encodeURIComponent(repId)}${slugPart}`;
        const displayTitle = (ctx && ctx.title) || 'Мероприятие';
        const title = `Билеты — ${displayTitle}`;
        const rawDesc =
          (ctx && (ctx.heroLead || ctx.descriptionSnippet) && String(ctx.heroLead || ctx.descriptionSnippet).trim()) ||
          'Выбор мест и бронирование билетов онлайн.';
        const description = rawDesc.slice(0, 160);
        let ogImage = '';
        if (ctx && ctx.posterUrl) {
          ogImage = String(ctx.posterUrl).startsWith('http')
            ? String(ctx.posterUrl)
            : `${base}${String(ctx.posterUrl).startsWith('/') ? '' : '/'}${ctx.posterUrl}`;
        }
        const ogLine = ogImage
          ? `<meta property="og:image" content="${escapeHtml(ogImage)}" />
    <meta name="twitter:image" content="${escapeHtml(ogImage)}" />`
          : '';
        const eventJson = ctx && ctx.title
          ? `<script type="application/ld+json">${JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Event',
              name: displayTitle,
              url: canonical,
              ...(ogImage ? { image: ogImage } : {}),
              description: description.slice(0, 500),
              organizer: { '@type': 'Organization', name: brand, url: base },
              eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
              eventStatus: 'https://schema.org/EventScheduled',
            })}</script>`
          : '';
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
    ${eventJson}`;
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
