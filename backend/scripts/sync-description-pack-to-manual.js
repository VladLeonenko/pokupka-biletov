#!/usr/bin/env node
/**
 * Где есть description_pack.heroLead, а description_manual пуст — копируем lead.
 *   node scripts/sync-description-pack-to-manual.js [--dry]
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ticketPool from '../ticketDb.js';
import { invalidateGetbiletEventsHttpCache } from '../services/getbiletEventsHttpCache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
const dry = process.argv.includes('--dry');

async function main() {
  const r = await ticketPool.query(
    `SELECT id, getbilet_external_id, title_manual, description_pack_json
     FROM getbilet_events
     WHERE COALESCE(is_published, TRUE) = TRUE
       AND COALESCE(storefront_hidden, FALSE) = FALSE
       AND (description_manual IS NULL OR trim(description_manual) = '')
       AND description_pack_json IS NOT NULL
       AND NULLIF(trim(COALESCE(description_pack_json->>'heroLead','')), '') IS NOT NULL`,
  );
  let ok = 0;
  for (const row of r.rows) {
    const lead = String(row.description_pack_json?.heroLead || '').trim();
    if (!lead) continue;
    if (dry) console.log(`DRY ${row.getbilet_external_id}: ${lead.slice(0, 80)}`);
    else {
      await ticketPool.query(
        `UPDATE getbilet_events SET description_manual = $2, updated_at = NOW() WHERE id = $1`,
        [row.id, lead],
      );
    }
    ok += 1;
  }
  if (!dry) invalidateGetbiletEventsHttpCache();
  console.log(`${dry ? 'DRY ' : ''}synced ${ok}`);
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
