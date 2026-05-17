#!/usr/bin/env node
/**
 * БД luzhniki-football как 16.05.2026 до 15:00 МСК (коммит ff36981d):
 * reseed с layout.seats + cloud, без pilot-слоя в SVG, без sellableGeodesy/pilot-флагов.
 *
 *   cd backend && node scripts/reset-luzhniki-map-may16-morning.js
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import dotenv from 'dotenv';

import ticketPool from '../ticketDb.js';
import { LUZHNIKI_FOOTBALL_STAGE_MAP_KEY } from '../services/luzhnikiFootballStageMap.js';
import { countSvgNativeSeatCircles } from '../utils/hallSeatGeodesyFromSvgCircles.js';
import { stripLuzhnikiPilotSeatsLayerFromSvg } from '../utils/luzhnikiPilotSeatSvg.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(__dirname, '../.env') });

const PILOT_LAYOUT_KEYS = [
  'sellableSeats',
  'offerSeatGeodesy',
  'luzhnikiPilotSeatsFile',
  'luzhnikiPilotFullStadium',
  'luzhnikiPilotGeodesyActive',
  'luzhnikiPilotCircleCount',
  'luzhnikiPilotMergedAt',
  'luzhnikiPilotUseLayoutSeatsForLookup',
  'luzhnikiPilotBackgroundSeatsUrl',
  'layoutSeatsOmittedForClient',
  'layoutSeatsStoredInFile',
  'luzhnikiPilotSeatsBundle',
  'preferLayoutSeatPositions',
  'sellableGeodesyMode',
  'omitLayoutSeatSellableFallback',
  'omitClientSeatCoordinateCloud',
  'layoutSeatsFromGrid',
];

async function main() {
  const dbName = await ticketPool.query('SELECT current_database() AS name');
  console.log(JSON.stringify({ step: 'database', name: dbName.rows[0]?.name }));

  console.log(JSON.stringify({ step: 'reseed', message: 'tickets.json + luzhniki.txt (partial, seats in layout)' }));
  const r = spawnSync('node', ['scripts/reseed-luzhniki-geodesy-from-repo.js'], {
    cwd: path.join(repoRoot, 'backend'),
    stdio: 'inherit',
    env: process.env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);

  const sel = await ticketPool.query(
    `SELECT layout_json, svg_markup FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [LUZHNIKI_FOOTBALL_STAGE_MAP_KEY],
  );
  const row = sel.rows[0];
  if (!row) throw new Error(`Нет строки ${LUZHNIKI_FOOTBALL_STAGE_MAP_KEY}`);

  const layout =
    row.layout_json && typeof row.layout_json === 'object' ? { ...row.layout_json } : {};
  for (const key of PILOT_LAYOUT_KEYS) {
    delete layout[key];
  }
  layout.grayHallWhenNoOffers = false;
  layout.seatSelectionDisabled = false;
  layout.uniformHallSeatAppearance = true;
  layout.omitClientSeatCoordinateCloud = false;
  layout.checkoutMapResetAt = `may16-morning-${new Date().toISOString()}`;

  const svgAfter = stripLuzhnikiPilotSeatsLayerFromSvg(String(row.svg_markup ?? ''));

  await ticketPool.query(
    `UPDATE getbilet_stage_maps
     SET layout_json = $2::jsonb,
         svg_markup = $3,
         updated_at = NOW(),
         notes_internal = COALESCE(notes_internal, '') || $4
     WHERE stage_external_id = $1`,
    [
      LUZHNIKI_FOOTBALL_STAGE_MAP_KEY,
      JSON.stringify(layout),
      svgAfter,
      ` | reset-may16-morning ${new Date().toISOString()}`,
    ],
  );

  const verify = await ticketPool.query(
    `SELECT layout_json, length(svg_markup::text) AS svg_len
     FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [LUZHNIKI_FOOTBALL_STAGE_MAP_KEY],
  );
  const L = verify.rows[0]?.layout_json ?? {};
  console.log(
    JSON.stringify(
      {
        ok: true,
        cloud: Array.isArray(L.allSeatCoordinates) ? L.allSeatCoordinates.length : 0,
        seatsInLayout: Array.isArray(L.seats) ? L.seats.length : 0,
        pilotFile: L.luzhnikiPilotSeatsFile ?? null,
        svgLen: Number(verify.rows[0]?.svg_len),
        svgCircles: countSvgNativeSeatCircles(verify.rows[0]?.svg_markup ?? ''),
      },
      null,
      2,
    ),
  );

  await ticketPool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
