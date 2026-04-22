#!/usr/bin/env node
/**
 * Заполняет description_manual в getbilet_events по эвристикам названия (длинный текст).
 *
 * Использование:
 *   node scripts/fill-event-metadata-from-titles.js                 # только где описание пустое
 *   node scripts/fill-event-metadata-from-titles.js --force         # все с title_manual (шаблонный текст)
 *   node scripts/fill-event-metadata-from-titles.js --force --ai    # OpenAI при доступности, иначе шаблоны (геоблок не валит прогон)
 *   node scripts/fill-event-metadata-from-titles.js --dry-run [--force] [--ai]
 *   node scripts/fill-event-metadata-from-titles.js --force --ai --limit=20   # первые N подходящих строк
 *
 * Требуется ticket DB (см. backend/.env) и таблица getbilet_events.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import ticketPool from '../ticketDb.js';
import { classifyEventTitle } from '../services/eventTitleHeuristics.js';
import { buildEventDescriptionSections } from '../services/eventLongDescription.js';
import { buildEventDescriptionPackResolved } from '../services/eventDescriptionAi.js';
import { openAiUpstreamCircuitOpen } from '../services/openaiUpstream.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const dryRun = process.argv.includes('--dry-run');
const forceAll = process.argv.includes('--force');
const useAi = process.argv.includes('--ai');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const rowLimit =
  limitArg != null ? Math.max(0, parseInt(String(limitArg.split('=')[1] || '0'), 10) || 0) : 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (useAi && !process.env.OPENAI_API_KEY?.trim()) {
    console.error('Режим --ai: задайте OPENAI_API_KEY в backend/.env');
    process.exit(1);
  }
  const r = await ticketPool.query(
    `SELECT id, getbilet_external_id, COALESCE(NULLIF(trim(title_manual), ''), '') AS title_manual, description_manual
     FROM getbilet_events
     ORDER BY id`,
  );

  let updated = 0;
  let skippedNoTitle = 0;
  let limitRemaining = rowLimit > 0 ? rowLimit : Infinity;
  for (const row of r.rows) {
    const title = row.title_manual || '';
    if (!title.trim()) {
      skippedNoTitle++;
      continue;
    }
    if (!forceAll && row.description_manual && String(row.description_manual).trim()) continue;
    if (limitRemaining <= 0) break;

    const { kind, categoryLabel } = classifyEventTitle(title);
    let plainText;
    if (useAi && !dryRun) {
      const pack = await buildEventDescriptionPackResolved({
        title,
        kind,
        categoryLabel,
        venueLabel: null,
        manualText: null,
      });
      plainText = pack.plainText;
      await sleep(openAiUpstreamCircuitOpen ? 0 : 400);
    } else if (useAi && dryRun) {
      console.log(`[dry-run+ai] #${row.id} ${row.getbilet_external_id}: «${title.slice(0, 50)}…» (без запроса к API)`);
      updated++;
      limitRemaining--;
      continue;
    } else {
      plainText = buildEventDescriptionSections({
        title,
        kind,
        categoryLabel,
        venueLabel: null,
        manualText: null,
      }).plainText;
    }
    if (dryRun) {
      console.log(`[dry-run] #${row.id} ${row.getbilet_external_id}: ${plainText.length} chars`);
      updated++;
      limitRemaining--;
      continue;
    }
    await ticketPool.query(`UPDATE getbilet_events SET description_manual = $1, updated_at = NOW() WHERE id = $2`, [
      plainText,
      row.id,
    ]);
    updated++;
    limitRemaining--;
  }

  const suffix = skippedNoTitle ? ` Пропущено без названия: ${skippedNoTitle}.` : '';
  console.log(
    dryRun ? `Dry-run: ${updated} строк.${suffix}` : `Обновлено записей: ${updated}.${suffix}`,
  );
  await ticketPool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
