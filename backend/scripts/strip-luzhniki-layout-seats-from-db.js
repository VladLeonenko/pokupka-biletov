#!/usr/bin/env node
/**
 * Убрать 80k layout.seats из layout_json в БД (оставить sidecar + флаги).
 *   node scripts/strip-luzhniki-layout-seats-from-db.js
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

import ticketPool from '../ticketDb.js';
import { LUZHNIKI_FOOTBALL_STAGE_MAP_KEY } from '../services/luzhnikiFootballStageMap.js';
import { LUZHNIKI_PILOT_SEATS_REL_PATH } from '../utils/luzhnikiSeatIndexCache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const r = await ticketPool.query(
    `SELECT layout_json FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [LUZHNIKI_FOOTBALL_STAGE_MAP_KEY],
  );
  const layout = r.rows[0]?.layout_json ?? {};
  const seats = Array.isArray(layout.seats) ? layout.seats : [];
  if (seats.length < 10000) {
    console.log(JSON.stringify({ ok: true, skipped: true, seats: seats.length }));
    await ticketPool.end();
    return;
  }

  const patch = {
    layoutSeatsOmittedForClient: true,
    layoutSeatsCount: seats.length,
    layoutSeatsStoredInFile: true,
    luzhnikiPilotSeatsFile: LUZHNIKI_PILOT_SEATS_REL_PATH,
  };

  await ticketPool.query(
    `UPDATE getbilet_stage_maps
     SET layout_json = (layout_json - 'seats' - 'nativeSeatCount' - 'layoutSeatsFromGrid') || $2::jsonb,
         updated_at = NOW()
     WHERE stage_external_id = $1`,
    [LUZHNIKI_FOOTBALL_STAGE_MAP_KEY, JSON.stringify(patch)],
  );

  console.log(JSON.stringify({ ok: true, removedSeats: seats.length, patch }, null, 2));
  await ticketPool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
