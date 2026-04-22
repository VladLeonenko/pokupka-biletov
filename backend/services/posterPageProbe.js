/**
 * Извлечение URL превью со страницы афиши театра: og:image, twitter, JSON-LD, link image_src.
 * Выбираем кандидата с максимальной площадью (width×height), если размеры известны.
 */

import * as cheerio from 'cheerio';

const FETCH_TIMEOUT_MS = Number(process.env.POSTER_PAGE_FETCH_TIMEOUT_MS) || 18000;
const MAX_HTML_BYTES = Number(process.env.POSTER_PAGE_MAX_HTML_BYTES) || 2_800_000;

/** @param {string} host */
function isHostAllowed(host) {
  const raw = process.env.POSTER_PAGE_ALLOWLIST_HOSTS?.trim();
  if (!raw) return true;
  const set = new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  const h = host.toLowerCase();
  return set.has(h) || set.has(`www.${h}`);
}

/**
 * @param {string} pageUrl
 * @param {string} [maybeBase] final URL after redirects
 */
function toAbs(pageUrl, rel, maybeBase) {
  if (!rel || typeof rel !== 'string') return null;
  const t = rel.trim();
  if (!t) return null;
  try {
    return new URL(t, maybeBase || pageUrl).href;
  } catch {
    return null;
  }
}

/**
 * @param {unknown} j
 * @param {Array<{ url: string, source: string, width: number, height: number }>} out
 * @param {string} pageUrl
 * @param {string} base
 */
function walkJsonLd(j, out, pageUrl, base) {
  if (j == null) return;
  if (Array.isArray(j)) {
    for (const x of j) walkJsonLd(x, out, pageUrl, base);
    return;
  }
  if (typeof j !== 'object') return;
  const o = /** @type {Record<string, unknown>} */ (j);
  if (o['@graph']) walkJsonLd(o['@graph'], out, pageUrl, base);

  const t = o['@type'];
  const types = Array.isArray(t) ? t : t != null ? [t] : [];
  const isImage =
    types.some((x) => String(x).includes('ImageObject')) || o.url != null;
  if (isImage && typeof o.url === 'string') {
    const u = toAbs(pageUrl, o.url, base);
    const w = Number(o.width) || 0;
    const h = Number(o.height) || 0;
    if (u) out.push({ url: u, source: 'json-ld:ImageObject', width: w, height: h });
  }

  if (o.image != null) {
    const img = o.image;
    if (typeof img === 'string') {
      const u = toAbs(pageUrl, img, base);
      if (u) out.push({ url: u, source: 'json-ld:image', width: 0, height: 0 });
    } else if (Array.isArray(img)) {
      for (const item of img) walkJsonLd(item, out, pageUrl, base);
    } else if (typeof img === 'object') {
      walkJsonLd(img, out, pageUrl, base);
    }
  }

  for (const k of Object.keys(o)) {
    if (k === '@context' || k === '@type') continue;
    const v = o[k];
    if (v && typeof v === 'object') walkJsonLd(v, out, pageUrl, base);
  }
}

/**
 * @param {string} pageUrl
 * @returns {Promise<{ bestUrl: string | null, candidates: Array<{ url: string, source: string, width: number, height: number, score: number }>, finalUrl: string }>}
 */
export async function probePosterImages(pageUrl) {
  let parsed;
  try {
    parsed = new URL(pageUrl);
  } catch {
    throw new Error('Некорректный URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Разрешены только http(s)');
  }
  if (!isHostAllowed(parsed.hostname)) {
    throw new Error(
      `Хост не в allowlist (POSTER_PAGE_ALLOWLIST_HOSTS): ${parsed.hostname}`,
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(pageUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; PokupkaBiletovPoster/1.0; +https://github.com/)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9',
      },
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw new Error(`Страница: HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_HTML_BYTES) throw new Error('HTML слишком большой');

  const finalUrl = res.url || pageUrl;
  const html = new TextDecoder('utf-8').decode(buf);
  const $ = cheerio.load(html);

  /** @type {Array<{ url: string, source: string, width: number, height: number }>} */
  const raw = [];

  const og =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[property="og:image:secure_url"]').attr('content');
  const ogW = parseInt(String($('meta[property="og:image:width"]').attr('content') || ''), 10);
  const ogH = parseInt(String($('meta[property="og:image:height"]').attr('content') || ''), 10);
  if (og) {
    const u = toAbs(pageUrl, og, finalUrl);
    if (u) {
      raw.push({
        url: u,
        source: 'og:image',
        width: Number.isFinite(ogW) ? ogW : 0,
        height: Number.isFinite(ogH) ? ogH : 0,
      });
    }
  }

  const tw = $('meta[name="twitter:image"]').attr('content');
  if (tw) {
    const u = toAbs(pageUrl, tw, finalUrl);
    if (u) raw.push({ url: u, source: 'twitter:image', width: 0, height: 0 });
  }

  const tw2 = $('meta[property="twitter:image"]').attr('content');
  if (tw2) {
    const u = toAbs(pageUrl, tw2, finalUrl);
    if (u) raw.push({ url: u, source: 'twitter:image:property', width: 0, height: 0 });
  }

  const linkImg = $('link[rel="image_src"]').attr('href');
  if (linkImg) {
    const u = toAbs(pageUrl, linkImg, finalUrl);
    if (u) raw.push({ url: u, source: 'link:image_src', width: 0, height: 0 });
  }

  $('script[type="application/ld+json"]').each((_, el) => {
    const txt = $(el).text();
    if (!txt?.trim()) return;
    try {
      const j = JSON.parse(txt);
      walkJsonLd(j, raw, pageUrl, finalUrl);
    } catch {
      /* ignore */
    }
  });

  /** WordPress и др.: на странице спектакля часто нет og, но есть обложка в контенте */
  if (raw.length === 0) {
    const selectors =
      'article img[src], .entry-content img[src], .post-content img[src], main article img[src]';
    $(selectors).each((i, el) => {
      if (i > 20) return false;
      const src = $(el).attr('src');
      if (!src || /emoji|smiley|favicon|1x1|spacer/i.test(src)) return;
      if (!/\.(jpe?g|png|webp)(\?|$)/i.test(src) && !src.includes('wp-content')) return;
      const u = toAbs(pageUrl, src, finalUrl);
      if (u) raw.push({ url: u, source: 'content:img', width: 0, height: 0 });
      return undefined;
    });
  }

  const seen = new Set();
  const uniq = [];
  for (const c of raw) {
    if (!c.url || seen.has(c.url)) continue;
    seen.add(c.url);
    uniq.push(c);
  }

  const candidates = uniq.map((c) => {
    const score =
      c.width > 0 && c.height > 0
        ? c.width * c.height
        : c.width > 0
          ? c.width * 1000
          : c.height > 0
            ? c.height * 1000
            : 0;
    return { ...c, score };
  });

  candidates.sort((a, b) => b.score - a.score);

  const bestUrl = candidates.length ? candidates[0].url : null;
  return { bestUrl, candidates, finalUrl };
}
