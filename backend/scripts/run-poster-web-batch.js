#!/usr/bin/env node
/**
 * Массово заполняет poster_url_web через Google CSE (как POST .../batch-fetch-posters-web).
 * Использование: node scripts/run-poster-web-batch.js [--limit=30] [--force] [--delay-ms=700]
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ticketPool from '../ticketDb.js';
import { isPosterSearchConfigured, searchPosterImageByEventTitle } from '../services/eventPosterWebSearch.js';
import { invalidateGetbiletEventsHttpCache } from '../services/getbiletEventsHttpCache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

function argNum(name, def) {
  const a = process.argv.find((x) => x.startsWith(`${name}=`));
  if (!a) return def;
  const n = Number(a.split('=')[1]);
  return Number.isFinite(n) ? n : def;
}

async function resolveTitleForPosterWebSearch(externalId, titleManual) {
  const m = titleManual != null && String(titleManual).trim() ? String(titleManual).trim() : '';
  if (m) return m;
  const r = await ticketPool.query(
    `SELECT NULLIF(trim(COALESCE(payload_json->>'Name', payload_json->>'name', '')), '') AS n
     FROM getbilet_catalog_cache WHERE repertoire_external_id = $1`,
    [externalId],
  );
  const n = r.rows[0]?.n;
  return n ? String(n) : null;
}

async function main() {
  const limit = Math.min(Math.max(argNum('--limit', 30), 1), 80);
  const delayMs = Math.min(Math.max(argNum('--delay-ms', 650), 0), 8000);
  const force = process.argv.includes('--force');

  if (!isPosterSearchConfigured()) {
    console.error(
      '❌ Задайте в backend/.env Google CSE (GOOGLE_CUSTOM_SEARCH_*) и/или OPENAI_API_KEY.\n' +
        '   Режим auto: сначала Google Image Search по названию, при неудаче — OpenAI (отключить: POSTER_AUTO_OPENAI_FALLBACK=0).\n' +
        '   Только Google: POSTER_SEARCH_PROVIDER=google. Точная фраза названия: POSTER_WEB_SEARCH_EXACT_PHRASE=1 (по умолчанию).',
    );
    process.exit(1);
  }

  const emptyWeb = force
    ? 'TRUE'
    : `(e.poster_url_web IS NULL OR trim(e.poster_url_web) = '')`;

  const r = await ticketPool.query(
    `SELECT e.id, e.getbilet_external_id, e.title_manual,
            NULLIF(trim(COALESCE(c.payload_json->>'Name', c.payload_json->>'name', '')), '') AS cache_title
     FROM getbilet_events e
     LEFT JOIN getbilet_catalog_cache c ON c.repertoire_external_id = e.getbilet_external_id
     WHERE e.is_published = TRUE
       AND (e.poster_url_manual IS NULL OR trim(e.poster_url_manual) = '')
       AND ${emptyWeb}
       AND (
         NULLIF(trim(COALESCE(e.title_manual, '')), '') IS NOT NULL
         OR NULLIF(trim(COALESCE(c.payload_json->>'Name', c.payload_json->>'name', '')), '') IS NOT NULL
       )
     ORDER BY e.id ASC
     LIMIT $1`,
    [limit],
  );

  if (r.rows.length === 0) {
    console.log('Нет строк для обработки (нужны опубликованные события без ручного постера и с названием).');
    process.exit(0);
  }

  console.log(`Обработка до ${r.rows.length} карточек (limit=${limit}, force=${force}, delay_ms=${delayMs})…`);

  let ok = 0;
  let fail = 0;
  for (const row of r.rows) {
    const title =
      (row.title_manual && String(row.title_manual).trim()) ||
      (row.cache_title && String(row.cache_title).trim()) ||
      '';
    const label = `${row.id} ${row.getbilet_external_id}`;
    try {
      if (!title) {
        console.log(`  ⏭ ${label} — нет названия`);
        fail += 1;
      } else {
        const found = await searchPosterImageByEventTitle(title);
        if (!found?.url) {
          console.log(`  ✗ ${label} — нет картинок («${title.slice(0, 60)}…»)`);
          fail += 1;
        } else {
          await ticketPool.query(
            `UPDATE getbilet_events SET poster_url_web = $2, updated_at = NOW() WHERE id = $1`,
            [row.id, found.url],
          );
          console.log(`  ✓ ${label} — ${found.url.slice(0, 72)}…`);
          ok += 1;
        }
      }
    } catch (e) {
      console.log(`  ✗ ${label} — ${e instanceof Error ? e.message : e}`);
      fail += 1;
    }
    if (delayMs > 0) await new Promise((res) => setTimeout(res, delayMs));
  }

  invalidateGetbiletEventsHttpCache();
  console.log(`\nГотово: ${ok} с обложкой, ${fail} без/ошибка. Кэш /api/bilet/events сброшен.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
