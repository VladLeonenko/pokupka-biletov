/**
 * Догоняющая генерация description_pack_json для событий GetBilet.
 * Используется и разовым скриптом, и cron-скриптом после синхронизации каталога.
 */

import ticketPool from '../ticketDb.js';
import { getRepertoireBackfillDescriptionInputs } from './repertoirePublicContext.js';
import {
  generateEventDescriptionWithOpenAI,
  serializeDescriptionPackForStorage,
  isEventDescriptionAiEnabled,
} from './eventDescriptionAi.js';
import { descPackFromStoredJson } from './eventDescriptionPackStored.js';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {{ limit?: number; force?: boolean; sleepMs?: number; repertoireId?: string; onlyMissing?: boolean }} opts
 * @returns {Promise<{ queued: number; processed: number; ok: number; skipped: number; failed: number }>}
 */
export async function backfillEventDescriptionPacks(opts = {}) {
  const limit = Math.max(0, Number(opts.limit || 0));
  const force = Boolean(opts.force);
  const sleepMs = Math.max(0, Number(opts.sleepMs ?? 1200));
  const repertoireId = String(opts.repertoireId || '').trim();
  const onlyMissing = Boolean(opts.onlyMissing);

  if (!isEventDescriptionAiEnabled()) {
    throw new Error('Нужен OPENAI_API_KEY и EVENT_DESCRIPTION_USE_OPENAI не равен 0.');
  }

  /** @type {string[]} */
  let ids = [];
  if (repertoireId) {
    ids = [repertoireId];
  } else {
    const where = onlyMissing && !force ? 'WHERE e.description_pack_json IS NULL' : '';
    const r = await ticketPool.query(`
      SELECT DISTINCT c.repertoire_external_id AS rid,
             e.description_pack_json,
             c.synced_at,
             (e.description_pack_json IS NULL) AS needs_pack
      FROM getbilet_catalog_cache c
      INNER JOIN getbilet_events e ON e.getbilet_external_id = c.repertoire_external_id
      ${where}
      ORDER BY needs_pack DESC, c.synced_at DESC NULLS LAST, c.repertoire_external_id
    `);
    ids = r.rows.map((row) => String(row.rid));
  }

  let ok = 0;
  let skipped = 0;
  let failed = 0;
  let processed = 0;

  for (const rid of ids) {
    if (limit > 0 && ok >= limit) break;
    processed += 1;
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

  return { queued: ids.length, processed, ok, skipped, failed };
}
