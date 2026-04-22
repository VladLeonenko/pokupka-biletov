/**
 * Поиск обложки по названию: Google Custom Search (image) по строке запроса + опционально OpenAI.
 * POSTER_SEARCH_PROVIDER: auto | openai | google (auto: сначала Google, если задан CSE).
 * POSTER_WEB_SEARCH_EXACT_PHRASE: по умолчанию включено — в q попадает "точное название" (phrase match).
 * @see https://developers.google.com/custom-search/v1/reference/rest/v1/cse/list
 */

import {
  isOpenAIPosterSearchConfigured,
  searchPosterImageByEventTitleViaOpenAI,
} from './eventPosterOpenAI.js';

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|avif)(\?|$)/i;

/**
 * @returns {boolean}
 */
export function isWebPosterSearchConfigured() {
  return Boolean(
    process.env.GOOGLE_CUSTOM_SEARCH_API_KEY?.trim() && process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID?.trim(),
  );
}

/** OpenAI или Google — хотя бы один источник для npm run poster:web-batch */
export function isPosterSearchConfigured() {
  return isOpenAIPosterSearchConfigured() || isWebPosterSearchConfigured();
}

export { isOpenAIPosterSearchConfigured };

/**
 * @param {string} raw
 * @returns {string | null}
 */
export function normalizeImageUrlFromSearch(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const u = raw.trim();
  if (!u || u.startsWith('//')) return null;
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * @param {string} title
 * @returns {string}
 */
export function buildPosterWebSearchQuery(title) {
  const t = (title || '').trim();
  const rawSuffix = process.env.POSTER_WEB_SEARCH_QUERY_SUFFIX;
  const suffix = rawSuffix === undefined ? 'афиша спектакль' : String(rawSuffix).trim();
  const exactPhrase = process.env.POSTER_WEB_SEARCH_EXACT_PHRASE !== '0';
  const core =
    exactPhrase && t ? `"${t.replace(/"/g, '').replace(/\s+/g, ' ')}"` : t;
  if (!core) return suffix;
  return suffix ? `${core} ${suffix}` : core;
}

/**
 * @param {string} link
 * @param {string} mime
 */
function plausibleImage(link, mime) {
  if (!link) return false;
  if (mime.startsWith('image/')) return true;
  const base = link.split('?')[0].toLowerCase();
  if (IMAGE_EXT_RE.test(base)) return true;
  if (/googleusercontent\.com|gstatic\.com|ggpht\.com/i.test(link)) return true;
  if (/portalbilet\.ru|cdn\.portalbilet/i.test(link)) return true;
  if (/afisha\.yandex\.ru|yandex\.net|mds\.yandex\.net|avatars\.mds\.yandex/i.test(link)) return true;
  return false;
}

/** @returns {string[]} домены из POSTER_WEB_SEARCH_IMAGE_SITE (через запятую или пробел) */
export function parsePosterWebSearchImageSites() {
  const raw = process.env.POSTER_WEB_SEARCH_IMAGE_SITE?.trim();
  if (!raw) return [];
  return raw
    .split(/[,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @param {unknown} body
 * @returns {{ url: string; title: string | null; thumbnailLink: string | null; rawItems: number } | null}
 */
function pickFirstImageFromCseBody(body) {
  const items = Array.isArray(body?.items) ? body.items : [];
  for (const it of items) {
    const link = normalizeImageUrlFromSearch(typeof it.link === 'string' ? it.link : '');
    const mime = typeof it.mime === 'string' ? it.mime : '';
    if (!plausibleImage(link, mime)) continue;
    return {
      url: link,
      title: typeof it.title === 'string' ? it.title : null,
      thumbnailLink:
        typeof it.image?.thumbnailLink === 'string'
          ? normalizeImageUrlFromSearch(it.image.thumbnailLink)
          : null,
      rawItems: items.length,
    };
  }
  return null;
}

/**
 * @param {string} fullQuery
 */
async function cseImageSearch(fullQuery) {
  const key = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY.trim();
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID.trim();
  const num = Math.min(Math.max(Number(process.env.POSTER_WEB_SEARCH_NUM_RESULTS) || 5, 1), 10);

  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', key);
  url.searchParams.set('cx', cx);
  url.searchParams.set('q', fullQuery);
  url.searchParams.set('searchType', 'image');
  url.searchParams.set('safe', 'active');
  url.searchParams.set('num', String(num));
  const lr = (process.env.POSTER_WEB_SEARCH_LR || 'lang_ru').trim();
  if (lr) url.searchParams.set('lr', lr);

  const timeoutMs = Math.min(Number(process.env.POSTER_WEB_SEARCH_TIMEOUT_MS) || 12000, 60000);
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url.toString(), { signal: ac.signal, headers: { Accept: 'application/json' } });
  } finally {
    clearTimeout(t);
  }

  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Google CSE: некорректный JSON (${res.status})`);
  }

  if (!res.ok) {
    const msg =
      body?.error?.message ||
      body?.error?.errors?.[0]?.message ||
      `Google CSE HTTP ${res.status}`;
    throw new Error(msg);
  }

  return pickFirstImageFromCseBody(body);
}

/**
 * @param {string} title
 */
async function searchPosterImageByEventTitleGoogle(title) {
  if (!isWebPosterSearchConfigured()) {
    throw new Error(
      'Не заданы GOOGLE_CUSTOM_SEARCH_API_KEY и GOOGLE_CUSTOM_SEARCH_ENGINE_ID в backend/.env',
    );
  }
  const base = buildPosterWebSearchQuery(title);
  if (!base.trim()) {
    throw new Error('Пустой запрос: укажите название мероприятия (title_manual или данные в кэше каталога)');
  }

  const sites = parsePosterWebSearchImageSites();
  const siteFirst = process.env.POSTER_WEB_SEARCH_IMAGE_SITE_FIRST !== '0';

  if (sites.length && siteFirst) {
    for (const site of sites) {
      const fromSite = await cseImageSearch(`site:${site} ${base}`);
      if (fromSite) return fromSite;
    }
  }

  return cseImageSearch(base);
}

/**
 * @param {string} title
 * @returns {Promise<{ url: string; title: string | null; thumbnailLink: string | null; rawItems: number; source?: string } | null>}
 */
export async function searchPosterImageByEventTitle(title) {
  const t = (title || '').trim();
  if (!t) {
    throw new Error('Пустой запрос: укажите название мероприятия (title_manual или данные в кэше каталога)');
  }

  const mode = (process.env.POSTER_SEARCH_PROVIDER || 'auto').trim().toLowerCase();

  if (mode === 'google') {
    return searchPosterImageByEventTitleGoogle(t);
  }

  if (mode === 'openai') {
    return searchPosterImageByEventTitleViaOpenAI(t);
  }

  if (mode !== 'auto') {
    throw new Error(`POSTER_SEARCH_PROVIDER: неизвестное значение «${mode}» (auto|openai|google)`);
  }

  const openAiAfterGoogle = process.env.POSTER_AUTO_OPENAI_FALLBACK !== '0';

  if (isWebPosterSearchConfigured()) {
    try {
      const fromGoogle = await searchPosterImageByEventTitleGoogle(t);
      if (fromGoogle) return fromGoogle;
    } catch (e) {
      if (!openAiAfterGoogle || !isOpenAIPosterSearchConfigured()) throw e;
    }
  }

  if (isOpenAIPosterSearchConfigured() && (!isWebPosterSearchConfigured() || openAiAfterGoogle)) {
    try {
      return (await searchPosterImageByEventTitleViaOpenAI(t)) ?? null;
    } catch (e) {
      if (isWebPosterSearchConfigured()) return null;
      throw e;
    }
  }

  if (isWebPosterSearchConfigured()) {
    return null;
  }

  throw new Error(
    'Нет источника обложек: задайте GOOGLE_CUSTOM_SEARCH_API_KEY + GOOGLE_CUSTOM_SEARCH_ENGINE_ID и/или OPENAI_API_KEY',
  );
}
