/**
 * Цены внешних витрин (Яндекс Афиша, Портбилет, Кассир…) vs наша «от N ₽».
 */
import ticketPool from '../ticketDb.js';
import { getOfferListByRepertoireIdCached } from './getbiletOffersCache.js';
import {
  applyExternalFromPriceToOfferPayload,
  applyGetbiletMarkupToOfferPayload,
  getGetbiletMarkupRuleForRepertoire,
} from './getbiletMarkupPublic.js';
import { loadManualOffersForRepertoire, mergeManualOffersIntoPayload } from './getbiletManualOffers.js';
import {
  competitorSourceFromUrl,
  competitorSourceLabel,
  extractPublicTicketMinPrice,
  isSpaCompetitorHost,
  parseCompetitorUrlList,
} from '../utils/extractPublicTicketPrice.js';
import { moscowTodayYmd } from './getbiletCompetitorPrices.js';

const FETCH_TIMEOUT_MS = Number(process.env.GETBILET_EXTERNAL_FETCH_MS) || 18000;
const MAX_HTML_BYTES = 2_800_000;
const PLAYWRIGHT_LIMIT = Math.max(0, Number(process.env.GETBILET_EXTERNAL_PLAYWRIGHT_MAX) || 12);

/** @type {Map<string, { at: number, min: number | null }>} */
const minCache = new Map();
const MIN_CACHE_MS = 45_000;

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export { parseCompetitorUrlList, competitorSourceFromUrl, competitorSourceLabel };

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {string} repertoireId
 * @returns {Promise<number | null>}
 */
export async function getLatestExternalCompetitorMin(repertoireId) {
  const rid = String(repertoireId || '').trim();
  if (!rid) return null;
  const hit = minCache.get(rid);
  if (hit && Date.now() - hit.at < MIN_CACHE_MS) return hit.min;
  try {
    const r = await ticketPool.query(
      `SELECT MIN(min_price_rub)::float AS min_price_rub
       FROM getbilet_external_price_daily
       WHERE repertoire_external_id = $1
         AND snapshot_date >= (CURRENT_DATE - 1)
         AND min_price_rub IS NOT NULL
         AND min_price_rub > 0`,
      [rid],
    );
    const n = Number(r.rows[0]?.min_price_rub);
    const min = Number.isFinite(n) && n > 0 ? n : null;
    minCache.set(rid, { at: Date.now(), min });
    return min;
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && e.code === '42P01') return null;
    throw e;
  }
}

/**
 * @param {string} repertoireId
 * @param {unknown} payload
 */
export async function applyExternalSiteUndercutToPayload(repertoireId, payload) {
  const min = await getLatestExternalCompetitorMin(repertoireId);
  if (min == null) return payload;
  return applyExternalFromPriceToOfferPayload(payload, min);
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
      },
    });
    const buf = await res.arrayBuffer();
    const slice = buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf;
    const html = new TextDecoder('utf-8').decode(slice);
    return { ok: res.ok, status: res.status, html, finalUrl: res.url || url };
  } finally {
    clearTimeout(timer);
  }
}

async function extractWithPlaywright(url) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ userAgent: BROWSER_UA, locale: 'ru-RU' });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: FETCH_TIMEOUT_MS });
    await new Promise((r) => setTimeout(r, 2800));
    const html = await page.content();
    return extractPublicTicketMinPrice(html, url);
  } finally {
    await browser.close();
  }
}

/**
 * @param {string} url
 * @param {{ allowPlaywright?: boolean }} [opts]
 */
export async function fetchCompetitorMinPrice(url, opts = {}) {
  const allowPlaywright = opts.allowPlaywright !== false;
  try {
    const page = await fetchHtml(url);
    let extracted = extractPublicTicketMinPrice(page.html, page.finalUrl);
    if (
      extracted.minPriceRub == null &&
      allowPlaywright &&
      isSpaCompetitorHost(url) &&
      page.html.length < 80_000
    ) {
      try {
        extracted = await extractWithPlaywright(url);
        return {
          ok: extracted.minPriceRub != null,
          status: page.status,
          url: page.finalUrl,
          ...extracted,
          usedPlaywright: true,
          error: extracted.minPriceRub == null ? 'no_price' : null,
        };
      } catch (e) {
        return {
          ok: false,
          status: page.status,
          url: page.finalUrl,
          minPriceRub: null,
          maxPriceRub: null,
          method: null,
          samples: 0,
          usedPlaywright: true,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }
    return {
      ok: page.ok && extracted.minPriceRub != null,
      status: page.status,
      url: page.finalUrl,
      ...extracted,
      usedPlaywright: false,
      error: !page.ok ? `HTTP ${page.status}` : extracted.minPriceRub == null ? 'no_price' : null,
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      url,
      minPriceRub: null,
      maxPriceRub: null,
      method: null,
      samples: 0,
      usedPlaywright: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function ourStorefrontMin(repertoireId) {
  const { data } = await getOfferListByRepertoireIdCached(repertoireId, { cacheOnly: true });
  const manual = await loadManualOffersForRepertoire(repertoireId);
  const merged = mergeManualOffersIntoPayload(data, manual);
  const rule = await getGetbiletMarkupRuleForRepertoire(repertoireId);
  const marked = applyGetbiletMarkupToOfferPayload(merged, rule);
  const rows = Array.isArray(marked?.ResultData) ? marked.ResultData : [];
  let min = null;
  for (const row of rows) {
    const p = Number(row?.AgentPrice ?? row?.NominalPrice ?? 0);
    if (!Number.isFinite(p) || p <= 0) continue;
    if (min == null || p < min) min = p;
  }
  return min;
}

async function eventTitle(repertoireId, fallback) {
  try {
    const r = await ticketPool.query(
      `SELECT COALESCE(
         NULLIF(TRIM(e.title_manual), ''),
         NULLIF(TRIM(c.payload_json->>'Name'), ''),
         NULLIF(TRIM(c.payload_json->>'name'), ''),
         $1
       ) AS title
       FROM getbilet_events e
       LEFT JOIN getbilet_catalog_cache c ON c.repertoire_external_id = e.getbilet_external_id
       WHERE e.getbilet_external_id = $1
       LIMIT 1`,
      [repertoireId],
    );
    return r.rows[0]?.title ? String(r.rows[0].title) : fallback || repertoireId;
  } catch {
    return fallback || repertoireId;
  }
}

function isWebSearchConfigured() {
  return Boolean(
    process.env.GOOGLE_CUSTOM_SEARCH_API_KEY?.trim() && process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID?.trim(),
  );
}

const DISCOVER_SITES = [
  'afisha.yandex.ru',
  'www.afisha.ru',
  'www.portbilet.ru',
  'www.kassir.ru',
  'www.ticketland.ru',
  'ponominalu.ru',
];

async function cseWebSearch(query) {
  const key = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY.trim();
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID.trim();
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', key);
  url.searchParams.set('cx', cx);
  url.searchParams.set('q', query);
  url.searchParams.set('num', '5');
  url.searchParams.set('hl', 'ru');
  url.searchParams.set('gl', 'ru');
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`CSE HTTP ${res.status}`);
  const body = await res.json();
  const items = Array.isArray(body?.items) ? body.items : [];
  return items
    .map((it) => (typeof it.link === 'string' ? it.link : ''))
    .filter(Boolean);
}

/**
 * @param {{ title: string, venue?: string | null }} q
 */
export async function discoverCompetitorUrlsForTitle({ title, venue }) {
  if (!isWebSearchConfigured()) {
    throw new Error('Задайте GOOGLE_CUSTOM_SEARCH_API_KEY и GOOGLE_CUSTOM_SEARCH_ENGINE_ID');
  }
  const t = String(title || '').replace(/"/g, '').trim();
  if (!t) return [];
  const venueBit = venue ? ` ${String(venue).replace(/"/g, '').trim()}` : '';
  const found = [];
  const seen = new Set();
  for (const site of DISCOVER_SITES) {
    const q = `"${t}"${venueBit} купить билеты site:${site}`;
    try {
      const links = await cseWebSearch(q);
      for (const link of links) {
        const source = competitorSourceFromUrl(link);
        if (source === 'other') continue;
        if (seen.has(link)) continue;
        seen.add(link);
        found.push({ source, url: link, label: competitorSourceLabel(source) });
      }
    } catch (e) {
      console.warn('[externalCompetitor] CSE', site, e instanceof Error ? e.message : e);
    }
    await sleep(250);
  }
  return found;
}

export async function saveCompetitorUrlsForEvent(eventId, urlsRaw) {
  const parsed = parseCompetitorUrlList(urlsRaw);
  await ticketPool.query(
    `UPDATE getbilet_events SET competitor_urls_json = $2::jsonb, updated_at = NOW() WHERE id = $1`,
    [eventId, JSON.stringify(parsed)],
  );
  return parsed;
}

async function loadEventsWithUrls() {
  const r = await ticketPool.query(
    `SELECT e.id, e.getbilet_external_id, e.title_manual, e.venue_manual,
            COALESCE(e.competitor_urls_json, '[]'::jsonb) AS competitor_urls_json,
            c.payload_json
     FROM getbilet_events e
     LEFT JOIN getbilet_catalog_cache c ON c.repertoire_external_id = e.getbilet_external_id
     WHERE e.is_published = TRUE
       AND COALESCE(e.storefront_hidden, FALSE) = FALSE`,
  );
  return r.rows.map((row) => {
    const catalogName =
      row.payload_json && typeof row.payload_json === 'object'
        ? String(row.payload_json.Name ?? row.payload_json.name ?? '')
        : '';
    return {
      id: row.id,
      repertoireId: String(row.getbilet_external_id),
      title: String(row.title_manual || catalogName || row.getbilet_external_id),
      venue: row.venue_manual || null,
      urls: parseCompetitorUrlList(row.competitor_urls_json),
    };
  });
}

/**
 * @param {{ discover?: boolean, limit?: number }} [opts]
 */
export async function scanExternalCompetitorPrices(opts = {}) {
  const discover = Boolean(opts.discover);
  const limit = Math.max(1, Math.min(80, Number(opts.limit) || 40));
  const snapshotDate = moscowTodayYmd();
  const events = (await loadEventsWithUrls()).slice(0, 200);
  let discovered = 0;
  let scannedUrls = 0;
  let withPrice = 0;
  let playwrightUsed = 0;
  let losing = 0;

  const todo = events.filter((e) => e.urls.length > 0 || discover).slice(0, limit);

  for (const ev of todo) {
    let urls = ev.urls;
    if (discover && urls.length === 0) {
      try {
        const found = await discoverCompetitorUrlsForTitle({ title: ev.title, venue: ev.venue });
        if (found.length) {
          urls = found;
          await saveCompetitorUrlsForEvent(ev.id, found);
          discovered += found.length;
        }
      } catch (e) {
        console.warn('[externalCompetitor] discover', ev.repertoireId, e instanceof Error ? e.message : e);
      }
    }
    if (urls.length === 0) continue;

    const ourMin = await ourStorefrontMin(ev.repertoireId);
    const title = await eventTitle(ev.repertoireId, ev.title);
    /** @type {{ source: string, min: number, url: string }[]} */
    const got = [];
    let fail = 0;

    for (const item of urls) {
      const allowPw = playwrightUsed < PLAYWRIGHT_LIMIT;
      const shot = await fetchCompetitorMinPrice(item.url, { allowPlaywright: allowPw });
      scannedUrls += 1;
      if (shot.usedPlaywright) playwrightUsed += 1;
      if (shot.minPriceRub != null) {
        withPrice += 1;
        got.push({ source: item.source, min: shot.minPriceRub, url: shot.url || item.url });
      } else {
        fail += 1;
      }
      try {
        await ticketPool.query(
          `INSERT INTO getbilet_external_price_daily (
             snapshot_date, repertoire_external_id, source, url,
             min_price_rub, max_price_rub, our_min_price_rub,
             extract_method, http_status, error, used_playwright, updated_at
           ) VALUES (
             $1::date, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
           )
           ON CONFLICT (snapshot_date, repertoire_external_id, source, url) DO UPDATE SET
             min_price_rub = EXCLUDED.min_price_rub,
             max_price_rub = EXCLUDED.max_price_rub,
             our_min_price_rub = EXCLUDED.our_min_price_rub,
             extract_method = EXCLUDED.extract_method,
             http_status = EXCLUDED.http_status,
             error = EXCLUDED.error,
             used_playwright = EXCLUDED.used_playwright,
             updated_at = NOW()`,
          [
            snapshotDate,
            ev.repertoireId,
            item.source,
            item.url,
            shot.minPriceRub,
            shot.maxPriceRub,
            ourMin,
            shot.method,
            shot.status,
            shot.error,
            Boolean(shot.usedPlaywright),
          ],
        );
      } catch (e) {
        if (e && typeof e === 'object' && 'code' in e && e.code === '42P01') {
          return { ok: false, reason: 'no_table', scannedUrls, discovered };
        }
        throw e;
      }
      await sleep(350);
    }

    const competitorMin = got.length ? Math.min(...got.map((g) => g.min)) : null;
    const cheapest = got.length ? got.reduce((a, b) => (a.min <= b.min ? a : b)) : null;
    if (ourMin != null && competitorMin != null && ourMin > competitorMin) losing += 1;

    await ticketPool.query(
      `INSERT INTO getbilet_external_event_daily (
         snapshot_date, repertoire_external_id, event_title,
         our_min_rub, competitor_min_rub, cheapest_source, cheapest_url,
         sources_ok, sources_fail, updated_at
       ) VALUES ($1::date, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (snapshot_date, repertoire_external_id) DO UPDATE SET
         event_title = EXCLUDED.event_title,
         our_min_rub = EXCLUDED.our_min_rub,
         competitor_min_rub = EXCLUDED.competitor_min_rub,
         cheapest_source = EXCLUDED.cheapest_source,
         cheapest_url = EXCLUDED.cheapest_url,
         sources_ok = EXCLUDED.sources_ok,
         sources_fail = EXCLUDED.sources_fail,
         updated_at = NOW()`,
      [
        snapshotDate,
        ev.repertoireId,
        title,
        ourMin,
        competitorMin,
        cheapest?.source ?? null,
        cheapest?.url ?? null,
        got.length,
        fail,
      ],
    );
    minCache.delete(ev.repertoireId);
  }

  return {
    ok: true,
    snapshotDate,
    events: todo.length,
    scannedUrls,
    withPrice,
    discovered,
    losing,
    playwrightUsed,
  };
}

export async function getExternalCompetitorOverview({ days = 14 } = {}) {
  const dayCount = Math.max(1, Math.min(90, Number(days) || 14));
  const latest = await ticketPool.query(
    `SELECT d.*, e.id AS event_id, COALESCE(e.competitor_urls_json, '[]'::jsonb) AS competitor_urls_json
     FROM getbilet_external_event_daily d
     LEFT JOIN getbilet_events e ON e.getbilet_external_id = d.repertoire_external_id
     WHERE d.snapshot_date = (SELECT MAX(snapshot_date) FROM getbilet_external_event_daily)
     ORDER BY
       CASE WHEN d.our_min_rub IS NOT NULL AND d.competitor_min_rub IS NOT NULL
                 AND d.our_min_rub > d.competitor_min_rub THEN 0 ELSE 1 END,
       d.competitor_min_rub NULLS LAST,
       d.event_title`,
  );
  const history = await ticketPool.query(
    `SELECT snapshot_date::text AS snapshot_date,
            COUNT(*)::int AS events,
            COUNT(*) FILTER (
              WHERE our_min_rub IS NOT NULL AND competitor_min_rub IS NOT NULL
                AND our_min_rub > competitor_min_rub
            )::int AS losing
     FROM getbilet_external_event_daily
     WHERE snapshot_date >= (CURRENT_DATE - $1::int)
     GROUP BY snapshot_date
     ORDER BY snapshot_date`,
    [dayCount],
  );
  const missingUrls = await ticketPool.query(
    `SELECT COUNT(*)::int AS n FROM getbilet_events e
     WHERE e.is_published = TRUE
       AND COALESCE(e.storefront_hidden, FALSE) = FALSE
       AND COALESCE(jsonb_array_length(COALESCE(e.competitor_urls_json, '[]'::jsonb)), 0) = 0`,
  );
  return {
    snapshotDate: latest.rows[0]?.snapshot_date ?? null,
    cseConfigured: isWebSearchConfigured(),
    eventsWithoutUrls: missingUrls.rows[0]?.n ?? 0,
    events: latest.rows,
    history: history.rows,
  };
}

export async function getExternalCompetitorEventDetail(repertoireId, { days = 14 } = {}) {
  const rid = String(repertoireId || '').trim();
  const dayCount = Math.max(1, Math.min(90, Number(days) || 14));
  const daily = await ticketPool.query(
    `SELECT snapshot_date::text AS snapshot_date, event_title, our_min_rub, competitor_min_rub,
            cheapest_source, cheapest_url, sources_ok, sources_fail
     FROM getbilet_external_event_daily
     WHERE repertoire_external_id = $1
       AND snapshot_date >= (CURRENT_DATE - $2::int)
     ORDER BY snapshot_date`,
    [rid, dayCount],
  );
  const latestDate = daily.rows.length ? daily.rows[daily.rows.length - 1].snapshot_date : moscowTodayYmd();
  const sources = await ticketPool.query(
    `SELECT source, url, min_price_rub, max_price_rub, our_min_price_rub,
            extract_method, http_status, error, used_playwright, updated_at
     FROM getbilet_external_price_daily
     WHERE repertoire_external_id = $1 AND snapshot_date = $2::date
     ORDER BY min_price_rub NULLS LAST, source`,
    [rid, latestDate],
  );
  const ev = await ticketPool.query(
    `SELECT id, COALESCE(competitor_urls_json, '[]'::jsonb) AS competitor_urls_json
     FROM getbilet_events WHERE getbilet_external_id = $1 LIMIT 1`,
    [rid],
  );
  return {
    repertoireId: rid,
    eventId: ev.rows[0]?.id ?? null,
    urls: parseCompetitorUrlList(ev.rows[0]?.competitor_urls_json),
    snapshotDate: latestDate,
    daily: daily.rows,
    sources: sources.rows,
  };
}

export async function discoverMissingCompetitorUrls({ limit = 15 } = {}) {
  const cap = Math.max(1, Math.min(30, Number(limit) || 15));
  const events = (await loadEventsWithUrls()).filter((e) => e.urls.length === 0).slice(0, cap);
  let added = 0;
  const rows = [];
  for (const ev of events) {
    try {
      const found = await discoverCompetitorUrlsForTitle({ title: ev.title, venue: ev.venue });
      if (found.length) {
        await saveCompetitorUrlsForEvent(ev.id, found);
        added += found.length;
      }
      rows.push({ repertoireId: ev.repertoireId, title: ev.title, found: found.length });
    } catch (e) {
      rows.push({
        repertoireId: ev.repertoireId,
        title: ev.title,
        found: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
    await sleep(300);
  }
  return { events: events.length, added, rows, cseConfigured: isWebSearchConfigured() };
}
