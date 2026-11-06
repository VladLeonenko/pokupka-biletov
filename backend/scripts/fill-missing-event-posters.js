#!/usr/bin/env node
/**
 * Заполняет пустые постеры опубликованных событий:
 * Yandex Images → Openverse → download → sharp → /uploads/images → poster_url_manual.
 * Без OpenRouter / OpenAI generation.
 *
 *   node scripts/fill-missing-event-posters.js [--limit=80] [--delay-ms=900] [--offset=0]
 *   ONLY_IDS=id1,id2 node scripts/fill-missing-event-posters.js
 */
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import ticketPool from '../ticketDb.js';
import { invalidateGetbiletEventsHttpCache } from '../services/getbiletEventsHttpCache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'uploads/images');
const PUBLIC_PREFIX = '/uploads/images';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const MIN_BYTES = 25_000;
const MIN_W = 500;
const TARGET = 1024;

const PREFER_HOST =
  /afisha\.ru|bolshoi\.ru|ticketland|portalbilet|intickets|kassir\.ru|mts-live|yandex\.net\/get-afisha|mds\.yandex|classicalmusicnews|rg\.ru|rt\.com|1tv\.ru|cultura/i;
const JUNK_URL =
  /yastatic|favicon|sprite|logo[_-]?small|1x1|pixel|tracking|avatar\/default|captcha|smartcaptcha|emoji|icon[_-]|\.svg(\?|$)/i;

function argNum(name, def) {
  const a = process.argv.find((x) => x.startsWith(`${name}=`));
  if (!a) return def;
  const n = Number(a.split('=')[1]);
  return Number.isFinite(n) ? n : def;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function decodeUrl(u) {
  return String(u || '')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&')
    .replace(/\\u0026/g, '&')
    .trim();
}

function slugify(s) {
  return String(s || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'event';
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.5' },
    signal: AbortSignal.timeout(22000),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function fetchBinary(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'image/*,*/*;q=0.8', Referer: 'https://yandex.ru/' },
    signal: AbortSignal.timeout(25000),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`img HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < MIN_BYTES) throw new Error(`too small ${buf.length}`);
  return buf;
}

function extractYandexOrigins(html) {
  const out = [];
  const re = /"origin":\{[^}]*?"url":"(https:\\\/\\\/[^"]+|https:[^"]+)"/g;
  let m;
  while ((m = re.exec(html))) out.push(decodeUrl(m[1]));
  const re2 = /img_url=(https?%3A%2F%2F[^&"\\]+)/g;
  while ((m = re2.exec(html))) {
    try {
      out.push(decodeUrl(decodeURIComponent(m[1])));
    } catch {
      /* ignore */
    }
  }
  const uniq = [];
  const seen = new Set();
  for (const u of out) {
    if (!u.startsWith('http') || JUNK_URL.test(u) || seen.has(u)) continue;
    seen.add(u);
    uniq.push(u);
  }
  uniq.sort((a, b) => Number(PREFER_HOST.test(b)) - Number(PREFER_HOST.test(a)));
  return uniq;
}

function cleanSearchQuery(title) {
  return String(title || '')
    .replace(/[#@]+/g, ' ')
    .replace(/[«»""']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);
}

async function searchYandex(query) {
  const q = cleanSearchQuery(query);
  if (!q) return [];
  const url = `https://yandex.ru/images/search?text=${encodeURIComponent(q)}&isize=large`;
  const html = await fetchText(url);
  if (/SmartCaptcha|showcaptcha/i.test(html)) throw new Error('yandex captcha');
  return extractYandexOrigins(html);
}

async function searchOpenverse(query) {
  const q = cleanSearchQuery(query);
  if (!q) return [];
  const url = new URL('https://api.openverse.org/v1/images/');
  url.searchParams.set('q', q.slice(0, 80));
  url.searchParams.set('page_size', '10');
  const res = await fetch(url, {
    headers: { 'User-Agent': 'BiletVsemPosterBot/1.0 (+https://biletvsem.com)' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];
  const json = await res.json();
  const rows = Array.isArray(json?.results) ? json.results : [];
  return rows
    .filter((r) => Number(r.width || 0) >= MIN_W && r.url)
    .map((r) => String(r.url))
    .filter((u) => !JUNK_URL.test(u));
}

/** Wikimedia Commons — fallback без капчи. */
async function searchCommons(query) {
  const q = cleanSearchQuery(query);
  if (!q) return [];
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  api.searchParams.set('action', 'query');
  api.searchParams.set('generator', 'search');
  api.searchParams.set('gsrsearch', q);
  api.searchParams.set('gsrlimit', '8');
  api.searchParams.set('gsrnamespace', '6');
  api.searchParams.set('prop', 'imageinfo');
  api.searchParams.set('iiprop', 'url|size|mime');
  api.searchParams.set('iiurlwidth', '1600');
  api.searchParams.set('format', 'json');
  const res = await fetch(api, {
    headers: { 'User-Agent': 'BiletVsemPosterBot/1.0 (https://biletvsem.com; posters)' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];
  const json = await res.json();
  const pages = json?.query?.pages || {};
  const urls = [];
  for (const p of Object.values(pages)) {
    const ii = Array.isArray(p.imageinfo) ? p.imageinfo[0] : null;
    if (!ii) continue;
    const mime = String(ii.mime || '');
    if (mime && !mime.startsWith('image/')) continue;
    const u = ii.thumburl || ii.url;
    if (u && !JUNK_URL.test(u)) urls.push(String(u));
  }
  return urls;
}

async function saveCover(buf, externalId, title) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const meta = await sharp(buf).rotate().metadata();
  const w = Number(meta.width || 0);
  if (w > 0 && w < MIN_W) throw new Error(`narrow ${w}`);
  const ts = Date.now();
  const file = `event-${slugify(externalId || title)}-${ts}.jpg`;
  const abs = path.join(OUT_DIR, file);
  await sharp(buf)
    .rotate()
    .resize(TARGET, TARGET, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(abs);
  return `${PUBLIC_PREFIX}/${file}`;
}

async function resolveCover(title) {
  const base = cleanSearchQuery(title);
  const queries = [`${base} афиша`, `${base} спектакль`, base];
  const candidates = [];
  let captchaHits = 0;

  for (const q of queries) {
    try {
      candidates.push(...(await searchYandex(q)).slice(0, 10));
      if (candidates.length >= 8) break;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`    yandex: ${msg}`);
      if (/captcha/i.test(msg)) {
        captchaHits += 1;
        await sleep(4000 + captchaHits * 2000);
      }
    }
  }

  if (candidates.length < 4) {
    try {
      candidates.push(...(await searchOpenverse(base)));
      candidates.push(...(await searchOpenverse(`${base} theatre`)));
    } catch {
      /* ignore */
    }
  }
  if (candidates.length < 3) {
    try {
      candidates.push(...(await searchCommons(base)));
    } catch {
      /* ignore */
    }
  }

  const seen = new Set();
  for (const url of candidates) {
    if (seen.has(url)) continue;
    seen.add(url);
    try {
      const buf = await fetchBinary(url);
      return { buf, sourceUrl: url };
    } catch {
      /* try next */
    }
  }
  return null;
}
async function main() {
  const limit = Math.min(Math.max(argNum('--limit', 60), 1), 300);
  const offset = Math.max(argNum('--offset', 0), 0);
  const delayMs = Math.min(Math.max(argNum('--delay-ms', 900), 0), 8000);
  const onlyRaw = String(process.env.ONLY_IDS || '').trim();
  const only = onlyRaw
    ? new Set(onlyRaw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean))
    : null;

  const r = await ticketPool.query(
    `SELECT e.id, e.getbilet_external_id, e.title_manual,
            NULLIF(trim(COALESCE(c.payload_json->>'Name', c.payload_json->>'name', '')), '') AS cache_title
     FROM getbilet_events e
     LEFT JOIN getbilet_catalog_cache c ON c.repertoire_external_id = e.getbilet_external_id
     WHERE COALESCE(e.is_published, TRUE) = TRUE
       AND COALESCE(e.storefront_hidden, FALSE) = FALSE
       AND (e.poster_url_manual IS NULL OR trim(e.poster_url_manual) = '')
       AND (e.poster_url_web IS NULL OR trim(e.poster_url_web) = '')
       AND (e.banner_url_manual IS NULL OR trim(e.banner_url_manual) = '')
       AND (
         NULLIF(trim(COALESCE(e.title_manual, '')), '') IS NOT NULL
         OR NULLIF(trim(COALESCE(c.payload_json->>'Name', c.payload_json->>'name', '')), '') IS NOT NULL
       )
     ORDER BY e.sort_order NULLS LAST, e.id ASC
     OFFSET $1 LIMIT $2`,
    [offset, limit],
  );

  const rows = only
    ? r.rows.filter((row) => only.has(String(row.getbilet_external_id)))
    : r.rows;

  console.log(`fill-missing-posters: ${rows.length} (offset=${offset} limit=${limit})`);
  let ok = 0;
  let fail = 0;

  for (const row of rows) {
    const title =
      (row.title_manual && String(row.title_manual).trim()) ||
      (row.cache_title && String(row.cache_title).trim()) ||
      '';
    const label = `${row.getbilet_external_id} · ${title.slice(0, 56)}`;
    if (!title) {
      console.log(`  ⏭ ${label}`);
      fail += 1;
      continue;
    }
    try {
      const hit = await resolveCover(title);
      if (!hit) {
        console.log(`  ✗ ${label} — no image`);
        fail += 1;
      } else {
        const local = await saveCover(hit.buf, row.getbilet_external_id, title);
        await ticketPool.query(
          `UPDATE getbilet_events
           SET poster_url_manual = $2,
               banner_url_manual = COALESCE(NULLIF(trim(banner_url_manual), ''), $2),
               updated_at = NOW()
           WHERE id = $1`,
          [row.id, local],
        );
        console.log(`  ✓ ${label} → ${local}`);
        ok += 1;
      }
    } catch (e) {
      console.log(`  ✗ ${label} — ${e instanceof Error ? e.message : e}`);
      fail += 1;
    }
    if (delayMs) await sleep(delayMs);
  }

  invalidateGetbiletEventsHttpCache();
  console.log(`\nDone: ok=${ok} fail=${fail}`);
}

main()
  .then(async () => {
    await ticketPool.end();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    try {
      await ticketPool.end();
    } catch {
      /* ignore */
    }
    process.exit(1);
  });
