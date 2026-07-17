#!/usr/bin/env node
/**
 * Восстановить layout.seats из pbilet preview + наложить manual bundle поверх.
 * Нужно после бага save, который затёр pbilet-базу до N manual-мест.
 *
 *   cd backend && node scripts/restore-supercup-nn-pbilet-seats.js
 */
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ticketPool from '../ticketDb.js';
import { buildLuzhnikiFootballStadiumPreview } from '../services/pbiletLuzhnikiFootballPreview.js';
import { footballStadiumCheckoutLayoutFlags } from '../utils/footballStadiumCheckoutLayout.js';
import {
  SUPERKUP_NN_PBILET_LAYOUT_ID,
  SUPERKUP_NN_PBILET_EVENT_SOURCE_ID,
  SUPERKUP_NN_PBILET_EVENT_DATE_ID,
  SUPERKUP_NN_PBILET_SOURCE_ID,
  SUPERKUP_NN_STAGE_MAP_KEY,
} from '../utils/footballStadiumRepertoires.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const BUNDLE_PATH = path.join(__dirname, '../data/supercup-nn/hand/supercup-nn-football-seats.bundle.json');

function seatKey(sector, row, seat) {
  return `${String(sector || '').trim().toLowerCase()}|${String(row || '').trim()}|${String(seat || '').trim()}`;
}

function mergeManualOntoPbilet(pbiletSeats, manualSeats) {
  const manualByKey = new Map(manualSeats.map((s) => [seatKey(s.sector, s.row, s.seat), s]));
  const out = [];
  const seen = new Set();
  for (const s of pbiletSeats) {
    const sk = seatKey(s.sector, s.row, s.seat);
    const m = manualByKey.get(sk);
    out.push(m || s);
    seen.add(sk);
    if (m) manualByKey.delete(sk);
  }
  for (const s of manualByKey.values()) {
    const sk = seatKey(s.sector, s.row, s.seat);
    if (seen.has(sk)) continue;
    seen.add(sk);
    out.push(s);
  }
  return out;
}

const preview = await buildLuzhnikiFootballStadiumPreview({
  layoutId: SUPERKUP_NN_PBILET_LAYOUT_ID,
  eventSourceId: SUPERKUP_NN_PBILET_EVENT_SOURCE_ID,
  eventDateId: SUPERKUP_NN_PBILET_EVENT_DATE_ID,
  sourceId: SUPERKUP_NN_PBILET_SOURCE_ID,
});

const pbiletSeats = Array.isArray(preview.layout_json?.seats) ? preview.layout_json.seats : [];
let manualSeats = [];
if (fs.existsSync(BUNDLE_PATH)) {
  manualSeats = JSON.parse(fs.readFileSync(BUNDLE_PATH, 'utf8')).seats || [];
}

const r = await ticketPool.query(
  `SELECT layout_json FROM getbilet_stage_maps WHERE stage_external_id = $1`,
  [SUPERKUP_NN_STAGE_MAP_KEY],
);
const layout = r.rows[0]?.layout_json || {};
const mergedSeats = mergeManualOntoPbilet(pbiletSeats, manualSeats);
const nextLayout = footballStadiumCheckoutLayoutFlags(
  {
    ...preview.layout_json,
    seats: mergedSeats,
    allSeatCoordinates:
      preview.layout_json?.allSeatCoordinates || layout.allSeatCoordinates,
  },
  SUPERKUP_NN_STAGE_MAP_KEY,
);

await ticketPool.query(
  `UPDATE getbilet_stage_maps SET layout_json = $2::jsonb, updated_at = NOW() WHERE stage_external_id = $1`,
  [SUPERKUP_NN_STAGE_MAP_KEY, JSON.stringify(nextLayout)],
);

console.log(
  '[restore-supercup-nn-pbilet-seats]',
  'pbilet',
  pbiletSeats.length,
  'manual',
  manualSeats.length,
  'merged',
  mergedSeats.length,
);
await ticketPool.end();
