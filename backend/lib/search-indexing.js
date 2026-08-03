/**
 * IndexNow + ping sitemap — уведомление поисковиков о новых/обновлённых URL.
 */
import { siteBaseUrl } from '../siteConfig.js';
import { bumpCacheVersion } from '../services/cacheManager.js';

const SITE = () => siteBaseUrl();
const INDEXNOW_KEY =
  process.env.INDEXNOW_KEY || 'bv-indexnow-7f3a9c2e1b4d8e6f0a5c3b9d2e7f1a4';

export function getIndexNowKey() {
  return INDEXNOW_KEY;
}

export function indexNowKeyBody() {
  return INDEXNOW_KEY;
}

/** Абсолютный URL страницы на сайте. */
export function publicUrl(pathOrSlug) {
  const base = SITE();
  if (!pathOrSlug) return `${base}/`;
  const s = String(pathOrSlug).trim();
  if (/^https?:\/\//i.test(s)) return s;
  const path = s.startsWith('/') ? s : `/${s}`;
  return `${base}${path === '/' ? '/' : path}`;
}

export async function pingIndexNow(urls) {
  const list = (urls || []).filter(Boolean);
  if (list.length === 0) return;

  const base = SITE();
  const host = new URL(base).host;
  const payload = {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `${base}/${INDEXNOW_KEY}.txt`,
    urlList: list.slice(0, 10000),
  };

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });
    if (!res.ok && res.status !== 202) {
      console.warn('[indexnow] ping status', res.status, await res.text().catch(() => ''));
    } else {
      console.log('[indexnow] ✓ pinged', list.length, 'url(s)');
    }
  } catch (err) {
    console.warn('[indexnow] ping failed:', err.message);
  }
}

export async function pingSitemap() {
  const sitemapUrl = `${SITE()}/sitemap.xml`;
  const targets = [
    `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
  ];
  await Promise.allSettled(
    targets.map((url) =>
      fetch(url, { method: 'GET' }).then((r) => {
        if (!r.ok) console.warn('[sitemap-ping]', url, r.status);
      }),
    ),
  );
}

export async function notifySearchIndexing(urls) {
  const list = (urls || []).map((u) => String(u).trim()).filter(Boolean);
  if (!list.length) return;
  await Promise.allSettled([pingIndexNow(list), pingSitemap()]);
}

function fireAndForget(urls, { bumpCache = true } = {}) {
  if (bumpCache) {
    try {
      bumpCacheVersion({ reason: 'indexing-notify' });
    } catch {
      /* ignore */
    }
  }
  notifySearchIndexing(urls).catch((err) => {
    console.warn('[indexing] notify failed:', err.message);
  });
}

/** Публикация CMS-страницы. */
export function notifyPublishedCmsPage(page) {
  if (page?.is_published === false || page?.robots_index === false || !page?.slug) return;
  const slug = String(page.slug).trim();
  fireAndForget([publicUrl(slug.startsWith('/') ? slug : `/${slug}`)]);
}

/** Публикация / обновление события GetBilet на витрине. */
export function notifyPublishedTicketEvent(eventRow) {
  const published = eventRow?.is_published ?? eventRow?.isPublished;
  const ext = String(eventRow?.getbilet_external_id || eventRow?.getbiletExternalId || '').trim();
  if (!published || !ext) return;
  fireAndForget([publicUrl(`/ticket/${encodeURIComponent(ext)}`), publicUrl('/events')]);
}
