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
 *   node scripts/backfill-event-description-packs.js --repertoire-id=12345
 *   node scripts/backfill-event-description-packs.js --sleep-ms=2000
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import ticketPool from '../ticketDb.js';
import { getRepertoireBackfillDescriptionInputs } from '../services/repertoirePublicContext.js';
import {
  generateEventDescriptionWithOpenAI,
  serializeDescriptionPackForStorage,
  isEventDescriptionAiEnabled,
} from '../services/eventDescriptionAi.js';
import { descPackFromStoredJson } from '../services/eventDescriptionPackStored.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

function parseArgs(argv) {
  const out = { limit: 0, force: false, sleepMs: 1200, repertoireId: '' };
  for (const a of argv) {
    if (a === '--force') out.force = true;
    else if (a.startsWith('--limit=')) out.limit = Math.max(0, parseInt(a.slice('--limit='.length), 10) || 0);
    else if (a.startsWith('--sleep-ms=')) out.sleepMs = Math.max(0, parseInt(a.slice('--sleep-ms='.length), 10) || 0);
    else if (a.startsWith('--repertoire-id=')) out.repertoireId = String(a.slice('--repertoire-id='.length)).trim();
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const { limit, force, sleepMs, repertoireId } = parseArgs(process.argv.slice(2));

  if (!isEventDescriptionAiEnabled()) {
    console.error('Нужен OPENAI_API_KEY и EVENT_DESCRIPTION_USE_OPENAI не равен 0.');
    process.exit(1);
  }

  /** @type {string[]} */
  let ids = [];
  if (repertoireId) {
    ids = [repertoireId];
  } else {
    const r = await ticketPool.query(`
      SELECT DISTINCT c.repertoire_external_id AS rid
      FROM getbilet_catalog_cache c
      INNER JOIN getbilet_events e ON e.getbilet_external_id = c.repertoire_external_id
      ORDER BY c.repertoire_external_id
    `);
    ids = r.rows.map((row) => String(row.rid));
  }

  if (limit > 0 && ids.length > limit) ids = ids.slice(0, limit);

  console.log(`В очереди: ${ids.length} репертуар(ов). force=${force} sleepMs=${sleepMs}`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const rid of ids) {
    const inputs = await getRepertoireBackfillDescriptionInputs(rid);
    if (!inputs || !inputs.eventRowId) {
      console.warn(`[skip] ${rid}: нет каталога или строки getbilet_events`);
      skipped += 1;
      continue;
    }

    if (!force && inputs.existingStoredPack && descPackFromStoredJson(inputs.existingStoredPack)) {
      console.log(`[skip] ${rid}: уже есть description_pack_json`);
      skipped += 1;
      continue;
    }

    try {
      const pack = await generateEventDescriptionWithOpenAI({
        title: inputs.title,
        kind: inputs.kind,
        categoryLabel: inputs.categoryLabel,
        venueLabel: inputs.venueLabel,
        manualHint: inputs.manualHint,
        catalogHints: inputs.catalogHints,
      });
      const stored = serializeDescriptionPackForStorage(pack);
      await ticketPool.query(
        `UPDATE getbilet_events SET description_pack_json = $2::jsonb, updated_at = NOW() WHERE id = $1`,
        [inputs.eventRowId, JSON.stringify(stored)],
      );
      console.log(`[ok] ${rid} (event id ${inputs.eventRowId}), sections=${pack.sections?.length ?? 0}`);
      ok += 1;
    } catch (e) {
      console.error(`[fail] ${rid}:`, e instanceof Error ? e.message : e);
      failed += 1;
    }

    if (sleepMs > 0) await sleep(sleepMs);
  }

  console.log(`Готово. ok=${ok} skipped=${skipped} failed=${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
