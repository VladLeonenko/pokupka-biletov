/**
 * Мин. цена билета с публичной страницы витрины (Яндекс Афиша, Портбилет и т.д.).
 */

const MIN_TICKET_RUB = 50;
const MAX_TICKET_RUB = 5_000_000;

export const COMPETITOR_SOURCE_LABELS = {
  yandex_afisha: 'Яндекс Афиша',
  afisha_ru: 'Афиша',
  portbilet: 'Портбилет',
  kassir: 'Кассир',
  ticketland: 'Ticketland',
  ponominalu: 'Ponominalu',
  mts_live: 'МТС Live',
  ticketon: 'Ticketon',
  other: 'Другой сайт',
};

const HOST_SOURCE = [
  [/afisha\.yandex\.ru$/i, 'yandex_afisha'],
  [/(^|\.)afisha\.ru$/i, 'afisha_ru'],
  [/portbilet\.ru$|portalbilet\.ru$/i, 'portbilet'],
  [/kassir\.ru$/i, 'kassir'],
  [/ticketland\.ru$/i, 'ticketland'],
  [/ponominalu\.ru$/i, 'ponominalu'],
  [/(^|\.)live\.mts\.ru$|(^|\.)mts\.ru$/i, 'mts_live'],
  [/ticketon\.(ru|kz)$/i, 'ticketon'],
];

export function competitorSourceFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
    for (const [re, source] of HOST_SOURCE) {
      if (re.test(host)) return source;
    }
    return 'other';
  } catch {
    return 'other';
  }
}

export function competitorSourceLabel(source) {
  return COMPETITOR_SOURCE_LABELS[source] || COMPETITOR_SOURCE_LABELS.other;
}

export function isSpaCompetitorHost(url) {
  const source = competitorSourceFromUrl(url);
  return source === 'afisha_ru' || source === 'portbilet' || source === 'kassir';
}

/**
 * @param {unknown} raw
 * @returns {number | null}
 */
export function parseRubAmount(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw >= MIN_TICKET_RUB && raw <= MAX_TICKET_RUB ? raw : null;
  }
  const s = String(raw)
    .replace(/\u00a0/g, ' ')
    .replace(/₽/g, ' ')
    .replace(/\bруб\.?/gi, ' ')
    .replace(/\bRUB\b/gi, ' ')
    .trim();
  const compact = s.replace(/\s+/g, '').replace(',', '.');
  const n = Number(compact);
  if (!Number.isFinite(n) || n < MIN_TICKET_RUB || n > MAX_TICKET_RUB) return null;
  return n;
}

function pushPrice(out, raw, method) {
  const n = parseRubAmount(raw);
  if (n == null) return;
  out.push({ price: n, method });
}

function walkJsonLdPrices(node, out, depth = 0) {
  if (node == null || depth > 12) return;
  if (Array.isArray(node)) {
    for (const x of node) walkJsonLdPrices(x, out, depth + 1);
    return;
  }
  if (typeof node !== 'object') return;
  const o = /** @type {Record<string, unknown>} */ (node);
  if (o['@graph']) walkJsonLdPrices(o['@graph'], out, depth + 1);
  pushPrice(out, o.lowPrice, 'jsonld:lowPrice');
  pushPrice(out, o.highPrice, 'jsonld:highPrice');
  pushPrice(out, o.price, 'jsonld:price');
  if (o.offers) walkJsonLdPrices(o.offers, out, depth + 1);
  for (const k of Object.keys(o)) {
    if (k === '@context') continue;
    const v = o[k];
    if (v && typeof v === 'object') walkJsonLdPrices(v, out, depth + 1);
  }
}

function extractFromJsonLdScripts(html, out) {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const txt = m[1]?.trim();
    if (!txt) continue;
    try {
      walkJsonLdPrices(JSON.parse(txt), out);
    } catch {
      /* ignore broken ld+json */
    }
  }
}

function extractFromEmbeddedJson(html, out) {
  const re =
    /"(?:lowPrice|minPrice|min_price|lowestPrice|priceFrom|minCost)"\s*:\s*"?([\d.]+)"?/gi;
  let m;
  while ((m = re.exec(html))) {
    pushPrice(out, m[1], 'json:minPrice');
  }
}

function extractFromOtRub(html, out) {
  const re = /от\s+([\d\s\u00a0]{2,16})\s*(?:₽|руб)/gi;
  let m;
  while ((m = re.exec(html))) {
    pushPrice(out, m[1], 'text:ot');
  }
}

function extractMetaProductPrice(html, out) {
  const re =
    /<meta[^>]+(?:property|name)=["'](?:product:price:amount|og:price:amount)["'][^>]+content=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    pushPrice(out, m[1], 'meta:product-price');
  }
}

/**
 * @param {string} html
 * @param {string} [pageUrl]
 * @returns {{ minPriceRub: number | null, maxPriceRub: number | null, method: string | null, samples: number }}
 */
export function extractPublicTicketMinPrice(html, pageUrl = '') {
  void pageUrl;
  if (!html || typeof html !== 'string') {
    return { minPriceRub: null, maxPriceRub: null, method: null, samples: 0 };
  }
  /** @type {{ price: number, method: string }[]} */
  const out = [];
  extractFromJsonLdScripts(html, out);
  extractMetaProductPrice(html, out);
  extractFromEmbeddedJson(html, out);
  extractFromOtRub(html, out);

  if (out.length === 0) {
    return { minPriceRub: null, maxPriceRub: null, method: null, samples: 0 };
  }
  let min = out[0];
  let maxP = out[0].price;
  for (const row of out) {
    if (row.price < min.price) min = row;
    if (row.price > maxP) maxP = row.price;
  }
  return {
    minPriceRub: min.price,
    maxPriceRub: maxP,
    method: min.method,
    samples: out.length,
  };
}

/**
 * @param {unknown} raw
 * @returns {{ source: string, url: string, label: string | null }[]}
 */
export function parseCompetitorUrlList(raw) {
  /** @type {string[]} */
  let lines = [];
  if (typeof raw === 'string') {
    lines = raw.split(/\n+/);
  } else if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string') lines.push(item);
      else if (item && typeof item === 'object' && item.url) lines.push(String(item.url));
    }
  }
  const seen = new Set();
  const rows = [];
  for (const line of lines) {
    const url = String(line || '').trim();
    if (!url || url.startsWith('#')) continue;
    let href;
    try {
      const u = new URL(url);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
      href = u.href;
    } catch {
      continue;
    }
    if (seen.has(href)) continue;
    seen.add(href);
    const source = competitorSourceFromUrl(href);
    rows.push({ source, url: href, label: competitorSourceLabel(source) });
  }
  return rows;
}
