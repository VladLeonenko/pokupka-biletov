#!/usr/bin/env node
/**
 * Один раз (или догоняюще) генерирует описание через OpenAI и пишет в getbilet_events.description_pack_json.
 * Публичная страница билета после этого читает пакет из БД без вызова API.
 *
 * Требует: OPENAI_API_KEY, миграция 078, строки в getbilet_events для repertoire из каталога.
 *
 *   node scripts/backfill-event-description-packs.js
 *   node scripts/backfill-event-description-packs.js --limit=5
 *   node scripts/backfill-event-description-packs.js --force
 *   npm run backfill:event-description-packs -- --force   (обязательно «--» перед --force)
 *   BACKFILL_EVENT_DESCRIPTIONS_FORCE=1 npm run backfill:event-description-packs
 *   node scripts/backfill-event-description-packs.js --repertoire-id=12345
 *   node scripts/backfill-event-description-packs.js --sleep-ms=2000
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { backfillEventDescriptionPacks } from '../services/eventDescriptionBackfill.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

function parseArgs(argv) {
  const out = { limit: 0, force: false, sleepMs: 1200, repertoireId: '' };
  /** Без второго `--` npm съедает `--force`; env — запасной вариант для CI/сервера. */
  if (process.env.BACKFILL_EVENT_DESCRIPTIONS_FORCE === '1') out.force = true;
  for (const a of argv) {
    if (a === '--force' || a === '-f') out.force = true;
    else if (a.startsWith('--limit=')) out.limit = Math.max(0, parseInt(a.slice('--limit='.length), 10) || 0);
    else if (a.startsWith('--sleep-ms=')) out.sleepMs = Math.max(0, parseInt(a.slice('--sleep-ms='.length), 10) || 0);
    else if (a.startsWith('--repertoire-id=')) out.repertoireId = String(a.slice('--repertoire-id='.length)).trim();
  }
  return out;
}

async function main() {
  const { limit, force, sleepMs, repertoireId } = parseArgs(process.argv.slice(2));
  if (force) {
    console.log('Режим force: существующие description_pack_json будут перезаписаны.');
  }
  console.log(`Запуск backfill. limit=${limit} force=${force} sleepMs=${sleepMs} repertoireId=${repertoireId || 'all'}`);
  const stats = await backfillEventDescriptionPacks({ limit, force, sleepMs, repertoireId });
  console.log(
    `Готово. queued=${stats.queued} processed=${stats.processed} ok=${stats.ok} skipped=${stats.skipped} failed=${stats.failed}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
