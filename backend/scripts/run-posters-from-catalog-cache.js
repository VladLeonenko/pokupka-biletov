#!/usr/bin/env node
/**
 * Копирует ImageUrl из getbilet_catalog_cache в poster_url_manual (как админ-кнопка «Постеры из кэша API»).
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ticketPool from '../ticketDb.js';
import { invalidateGetbiletEventsHttpCache } from '../services/getbiletEventsHttpCache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const r = await ticketPool.query(`
    WITH imgs AS (
      SELECT
        repertoire_external_id AS ext_id,
        NULLIF(trim(COALESCE(payload_json->>'ImageUrl', payload_json->>'imageUrl', '')), '') AS img
      FROM getbilet_catalog_cache
    )
    UPDATE getbilet_events e
    SET poster_url_manual = i.img,
        updated_at = NOW()
    FROM imgs i
    WHERE e.getbilet_external_id = i.ext_id
      AND i.img IS NOT NULL
      AND (i.img ~ '^https?://' OR i.img ~ '^/')
      AND (e.poster_url_manual IS NULL OR trim(e.poster_url_manual) = '')
    RETURNING e.id, e.getbilet_external_id
  `);
  invalidateGetbiletEventsHttpCache();
  console.log(`Обновлено строк: ${r.rowCount}`);
  if (r.rows?.length) {
    r.rows.slice(0, 15).forEach((row) => console.log(`  id=${row.id} ${row.getbilet_external_id}`));
    if (r.rows.length > 15) console.log(`  … и ещё ${r.rows.length - 15}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
