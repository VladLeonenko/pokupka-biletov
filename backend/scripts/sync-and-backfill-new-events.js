#!/usr/bin/env node
/**
 * Cron-friendly задача:
 * 1. синхронизирует каталог GetBilet в getbilet_catalog_cache/getbilet_events;
 * 2. генерирует description_pack_json для новых событий, у которых его ещё нет.
 *
 * Примеры:
 *   node scripts/sync-and-backfill-new-events.js
 *   node scripts/sync-and-backfill-new-events.js --limit=10 --sleep-ms=1500
 *   node scripts/sync-and-backfill-new-events.js --skip-sync --limit=3
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { syncGetbiletCatalogFromApi } from '../services/getbiletCatalogSync.js';
import { invalidateGetbiletEventsHttpCache } from '../services/getbiletEventsHttpCache.js';
import { backfillEventDescriptionPacks } from '../services/eventDescriptionBackfill.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

function parseArgs(argv) {
  const out = {
    limit: Math.max(1, parseInt(process.env.GETBILET_EVENT_DESCRIPTION_CRON_LIMIT || '5', 10) || 5),
    sleepMs: Math.max(0, parseInt(process.env.GETBILET_EVENT_DESCRIPTION_CRON_SLEEP_MS || '1200', 10) || 1200),
    skipSync: false,
    force: false,
  };
  for (const a of argv) {
    if (a === '--skip-sync') out.skipSync = true;
    else if (a === '--force' || a === '-f') out.force = true;
    else if (a.startsWith('--limit=')) out.limit = Math.max(0, parseInt(a.slice('--limit='.length), 10) || 0);
    else if (a.startsWith('--sleep-ms=')) out.sleepMs = Math.max(0, parseInt(a.slice('--sleep-ms='.length), 10) || 0);
  }
  return out;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const startedAt = new Date();
  console.log(
    `[getbilet cron] start ${startedAt.toISOString()} limit=${opts.limit} sleepMs=${opts.sleepMs} skipSync=${opts.skipSync} force=${opts.force}`,
  );

  if (!opts.skipSync) {
    const sync = await syncGetbiletCatalogFromApi();
    invalidateGetbiletEventsHttpCache();
    console.log(`[getbilet cron] catalog synced: count=${sync.count}`);
  }

  const backfill = await backfillEventDescriptionPacks({
    limit: opts.limit,
    sleepMs: opts.sleepMs,
    force: opts.force,
    onlyMissing: true,
  });
  console.log(
    `[getbilet cron] descriptions: queued=${backfill.queued} processed=${backfill.processed} ok=${backfill.ok} skipped=${backfill.skipped} failed=${backfill.failed}`,
  );

  if (backfill.failed > 0) process.exitCode = 2;
}

main().catch((e) => {
  console.error('[getbilet cron] failed:', e instanceof Error ? e.stack || e.message : e);
  process.exit(1);
});
