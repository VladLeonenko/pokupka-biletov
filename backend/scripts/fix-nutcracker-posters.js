#!/usr/bin/env node
/**
 * Уникальные обложки для трёх «Щелкунчиков»:
 * Вахтангова / Станиславского / Кремлёвский дворец.
 * Большой не трогаем.
 *
 *   node scripts/fix-nutcracker-posters.js
 */
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import ticketPool from '../ticketDb.js';
import { invalidateGetbiletEventsHttpCache } from '../services/getbiletEventsHttpCache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const OUT_DIR = path.join(__dirname, '../uploads/images');
const PUBLIC_PREFIX = '/uploads/images';
const TARGET = 1024;
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const JOBS = [
  {
    id: 2675,
    venue: 'Вахтангова',
    pageUrl: 'https://vakhtangov.ru/show/nutcracker/',
    urls: [
      'https://s2.afisha.ru/mediastorage/83/5c/ea18a25ff6af4f65ae9feab35c83.jpg',
      'https://vakhtangov.ru/uploads/2021/10/D6C09253-343D-45AA-9A22-CA8451E6FB12.png',
      'https://vakhtangov.ru/uploads/2021/10/shhelkunchik-1000x409.jpg',
    ],
  },
  {
    id: 2881,
    venue: 'Станиславского',
    pageUrl: 'https://stanmus.ru/shows/shhelkunchik/',
    urls: [
      'https://s4.afisha.ru/mediastorage/0d/87/5ec4b35488e44943b8559005870d.jpg',
      'https://stanmus.ru/wp-content/uploads/2022/09/002A1838.jpg',
      'https://stanmus.ru/wp-content/uploads/2021/12/snipet.png',
      'https://www.stanmuz.ru/images/upload/a8c229d43cc861ab6cc8114fa8a01ae2.jpg',
    ],
  },
  {
    id: 3054,
    venue: 'Кремль',
    pageUrl:
      'https://www.kremlinpalace.org/events/shchelkunchik-p-chaykovskiy-spektakl-teatra-kremlevskiy-balet-73',
    urls: [
      'https://www.kremlinpalace.org/images/events/1697816136.jpg',
      'https://s.afisha.ru/mediastorage/22/81/3417b22999c349d785cd27f58122.jpg',
      'https://www.kremlinpalace.org/photos/shares/Concert/ballet/Schelkun/_______________________________________________.jpg',
    ],
  },
];

async function fetchBinary(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'image/*,*/*;q=0.8',
      Referer: 'https://www.afisha.ru/',
    },
    signal: AbortSignal.timeout(30000),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 15000) throw new Error(`too small ${buf.length}`);
  return buf;
}

async function saveCover(buf, externalId) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ts = Date.now();
  const file = `event-${externalId}-${ts}.jpg`;
  const abs = path.join(OUT_DIR, file);
  await sharp(buf)
    .rotate()
    .resize(TARGET, TARGET, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(abs);
  const bannerFile = `event-${externalId}-banner-${ts}.jpg`;
  const bannerAbs = path.join(OUT_DIR, bannerFile);
  await sharp(buf)
    .rotate()
    .resize(1600, 900, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(bannerAbs);
  return {
    poster: `${PUBLIC_PREFIX}/${file}`,
    banner: `${PUBLIC_PREFIX}/${bannerFile}`,
    abs,
  };
}

async function main() {
  const results = [];
  for (const job of JOBS) {
    const ev = (
      await ticketPool.query(
        'SELECT id, getbilet_external_id, title_manual, venue_manual, poster_url_manual FROM getbilet_events WHERE id = $1',
        [job.id],
      )
    ).rows[0];
    if (!ev) throw new Error(`missing event ${job.id}`);

    let saved = null;
    let used = null;
    let lastErr = null;
    for (const url of job.urls) {
      try {
        const buf = await fetchBinary(url);
        const meta = await sharp(buf).metadata();
        console.log(
          `try ${job.venue}: ${url.slice(0, 90)} -> ${meta.width}x${meta.height} ${buf.length}b`,
        );
        saved = await saveCover(buf, ev.getbilet_external_id);
        used = url;
        break;
      } catch (e) {
        lastErr = e;
        console.warn(`fail ${job.venue}:`, e instanceof Error ? e.message : e);
      }
    }
    if (!saved) throw lastErr || new Error(`no image for ${job.venue}`);

    await ticketPool.query(
      `UPDATE getbilet_events
       SET poster_url_manual = $2,
           banner_url_manual = $3,
           poster_page_url = COALESCE(NULLIF(trim(poster_page_url), ''), $4),
           updated_at = NOW()
       WHERE id = $1`,
      [job.id, saved.poster, saved.banner, job.pageUrl],
    );

    const md5 = createHash('md5').update(fs.readFileSync(saved.abs)).digest('hex');
    results.push({
      id: job.id,
      venue: ev.venue_manual,
      poster: saved.poster,
      source: used,
      md5,
    });
    console.log(`OK ${job.id} ${job.venue} <- ${used}`);
  }

  invalidateGetbiletEventsHttpCache();
  console.log(JSON.stringify(results, null, 2));
  const md5s = new Set(results.map((r) => r.md5));
  if (md5s.size !== results.length) {
    throw new Error('posters still collide by md5');
  }
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
