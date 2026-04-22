/**
 * Вытаскиваем URL страницы спектакля/афиши из сырого объекта репертуара GetBilet (rest_v2),
 * чтобы автозаполнять poster_page_url при синхронизации каталога.
 */

const DIRECT_KEYS = [
  'SiteUrl',
  'WebsiteUrl',
  'WebSite',
  'InfoUrl',
  'EventUrl',
  'ExternalUrl',
  'PosterPageUrl',
  'PlayUrl',
  'DetailUrl',
  'DescriptionUrl',
  'AfficheUrl',
  'PageUrl',
  'Url',
  'Link',
  'TicketUrl',
];

/**
 * @param {unknown} row
 * @returns {string | null}
 */
export function extractPosterPageUrlFromRepertoirePayload(row) {
  if (!row || typeof row !== 'object') return null;
  const o = /** @type {Record<string, unknown>} */ (row);

  for (const k of DIRECT_KEYS) {
    const u = tryUrl(o[k]);
    if (u) return u;
  }

  const place = o.Place ?? o.place;
  if (place && typeof place === 'object') {
    const p = /** @type {Record<string, unknown>} */ (place);
    for (const k of ['SiteUrl', 'WebsiteUrl', 'Url', 'WebSite']) {
      const u = tryUrl(p[k]);
      if (u) return u;
    }
  }

  const venue = o.Venue ?? o.venue;
  if (venue && typeof venue === 'object') {
    const v = /** @type {Record<string, unknown>} */ (venue);
    for (const k of ['SiteUrl', 'WebsiteUrl', 'Url']) {
      const u = tryUrl(v[k]);
      if (u) return u;
    }
  }

  return null;
}

/**
 * @param {unknown} v
 * @returns {string | null}
 */
function tryUrl(v) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!/^https?:\/\//i.test(s)) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.href;
  } catch {
    return null;
  }
}
