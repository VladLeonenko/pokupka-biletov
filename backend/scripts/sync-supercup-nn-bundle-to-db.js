#!/usr/bin/env node
/**
 * После git pull: layout_json.seats ← bundle с диска (ручная разметка редактора).
 *   node scripts/sync-supercup-nn-bundle-to-db.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import ticketPool from '../ticketDb.js';
import { SUPERKUP_NN_STAGE_MAP_KEY } from '../utils/footballStadiumRepertoires.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, '..');
dotenv.config({ path: path.join(backendRoot, '.env') });

const BUNDLE_PATH = path.join(
  backendRoot,
  'data/supercup-nn/hand/supercup-nn-football-seats.bundle.json',
);

if (!fs.existsSync(BUNDLE_PATH)) {
  console.log('[sync-supercup-nn-bundle] bundle not found — skip');
  process.exit(0);
}

const bundle = JSON.parse(fs.readFileSync(BUNDLE_PATH, 'utf8'));
const bundleSeats = Array.isArray(bundle.seats) ? bundle.seats : [];
if (bundleSeats.length < 100) {
  console.log('[sync-supercup-nn-bundle] bundle too small — skip', bundleSeats.length);
  process.exit(0);
}

const r = await ticketPool.query(
  `SELECT layout_json FROM getbilet_stage_maps WHERE stage_external_id = $1`,
  [SUPERKUP_NN_STAGE_MAP_KEY],
);
const row = r.rows[0];
if (!row) {
  console.error('[sync-supercup-nn-bundle] stage map missing — run seed:supercup-nn-2026');
  process.exit(1);
}

const layout = row.layout_json && typeof row.layout_json === 'object' ? { ...row.layout_json } : {};
const prevCount = Array.isArray(layout.seats) ? layout.seats.length : 0;
if (prevCount >= bundleSeats.length) {
  console.log(
    JSON.stringify({
      ok: true,
      skipped: true,
      prevCount,
      bundleCount: bundleSeats.length,
    }),
  );
  process.exit(0);
}

layout.seats = bundleSeats;
layout.preferLayoutSeatPositions = true;
layout.layoutMode = layout.layoutMode || 'svgNative';

await ticketPool.query(
  `UPDATE getbilet_stage_maps
   SET layout_json = $2::jsonb,
       notes_internal = COALESCE(notes_internal, '') || $3,
       updated_at = NOW()
   WHERE stage_external_id = $1`,
  [
    SUPERKUP_NN_STAGE_MAP_KEY,
    JSON.stringify(layout),
    `\n[${new Date().toISOString()}] sync bundle → DB: ${bundleSeats.length} seats (was ${prevCount})`,
  ],
);

console.log(
  JSON.stringify({
    ok: true,
    synced: true,
    prevCount,
    bundleCount: bundleSeats.length,
    builtAt: bundle.builtAt ?? null,
  }),
);
await ticketPool.end().catch(() => {});
