/**
 * One-shot: ensure 089 + fill structure_json/date_label/campaign_negatives
 * when empty (does not overwrite non-empty structure).
 *
 * Usage: node scripts/fill-ads-mediaplan-structure.js
 */
import {
  ensureTable,
  seedIfEmpty,
  seedStructureIfMissing,
} from '../routes/adsMediaplan.js';
import ticketPool from '../ticketDb.js';

async function main() {
  await ensureTable();
  const seeded = await seedIfEmpty();
  const filled = await seedStructureIfMissing();
  const { rows } = await ticketPool.query(
    `SELECT event_slug, date_label,
            COALESCE(jsonb_array_length(structure_json), 0) AS groups,
            COALESCE(cardinality(campaign_negatives), 0) AS camp_neg
     FROM ads_mediaplan_events
     ORDER BY sort_order, id`,
  );
  console.log(JSON.stringify({ seeded, filled, rows }, null, 2));
  await ticketPool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
