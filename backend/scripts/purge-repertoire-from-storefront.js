#!/usr/bin/env node
/**
 * Полностью убрать ручное/тестовое мероприятие с витрины (кэш каталога + офферы + карточка).
 *
 *   node backend/scripts/purge-repertoire-from-storefront.js luzhniki-cup-final-2026
 *   node backend/scripts/purge-repertoire-from-storefront.js final-kubka-rossii-po-futbolu-2026
 */

import ticketPool from '../ticketDb.js';
import { invalidateGetbiletEventsHttpCache } from '../services/getbiletEventsHttpCache.js';

const ids = process.argv.slice(2).map((s) => s.trim()).filter(Boolean);
if (!ids.length) {
  console.error('Usage: node backend/scripts/purge-repertoire-from-storefront.js <repertoireId> [more...]');
  process.exit(1);
}

async function purgeOne(repertoireId) {
  const ev = await ticketPool.query(
    `DELETE FROM getbilet_events WHERE getbilet_external_id = $1 RETURNING id`,
    [repertoireId],
  );
  const cat = await ticketPool.query(
    `DELETE FROM getbilet_catalog_cache WHERE repertoire_external_id = $1 RETURNING repertoire_external_id`,
    [repertoireId],
  );
  const off = await ticketPool.query(
    `DELETE FROM getbilet_repertoire_offers_cache WHERE repertoire_external_id = $1 RETURNING repertoire_external_id`,
    [repertoireId],
  ).catch(() => ({ rows: [] }));
  return {
    repertoireId,
    eventsDeleted: ev.rowCount,
    catalogDeleted: cat.rowCount,
    offersDeleted: off.rowCount ?? 0,
  };
}

try {
  const results = [];
  for (const id of ids) {
    results.push(await purgeOne(id));
  }
  invalidateGetbiletEventsHttpCache();
  console.log(JSON.stringify({ ok: true, results }, null, 2));
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await ticketPool.end().catch(() => {});
}
