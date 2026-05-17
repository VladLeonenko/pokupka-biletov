#!/usr/bin/env node
/**
 * Сброс БД luzhniki-football к режиму «cloud + sector SVG» (как до вечернего pilot/80k).
 * Код отката (69bb657c) сам по себе не чистит layout_json и svg_markup в Postgres.
 *
 *   cd backend && node scripts/reset-luzhniki-checkout-map-db.js
 *   cd backend && node scripts/reset-luzhniki-checkout-map-db.js --reseed
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

const RESEED = process.argv.includes('--reseed');

const LAYOUT_KEYS_TO_DROP = [
  'seats',
  'nativeSeatCount',
  'layoutSeatsFromGrid',
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
  'layoutSeatsCount',
  'layoutSeatsStoredInFile',
  'luzhnikiPilotSeatsBundle',
  'preferLayoutSeatPositions',
  'sellableGeodesyMode',
  'omitLayoutSeatSellableFallback',
];

const LAYOUT_PATCH = {
  stadiumMapKey: LUZHNIKI_FOOTBALL_STAGE_MAP_KEY,
  luzhnikiStadiumCheckout: true,
  grayHallWhenNoOffers: false,
  seatSelectionDisabled: false,
  disablePositionalSeatZip: true,
  preferExactOfferSeatMatch: true,
  uniformHallSeatAppearance: true,
  omitClientSeatCoordinateCloud: false,
  disableStadiumCanvas: false,
  hallBackgroundFromLabeledSeats: false,
  checkoutMapResetAt: new Date().toISOString(),
};

async function main() {
  const useMain =
    process.env.GETBILET_USE_MAIN_DATABASE === '1' || process.env.TICKET_USE_MAIN_PG === '1';
  const dbName = await ticketPool.query('SELECT current_database() AS name');
  console.log(
    JSON.stringify({
      step: 'database',
      name: dbName.rows[0]?.name,
      useMainTicketPool: useMain,
      PGDATABASE: process.env.PGDATABASE ?? null,
      TICKET_PGDATABASE: process.env.TICKET_PGDATABASE ?? null,
    }),
  );

  if (RESEED) {
    console.log(JSON.stringify({ step: 'reseed', message: 'tickets.json + luzhniki.txt → DB' }));
    const r = spawnSync('node', ['scripts/reseed-luzhniki-geodesy-from-repo.js'], {
      cwd: path.join(repoRoot, 'backend'),
      stdio: 'inherit',
      env: process.env,
    });
    if (r.status !== 0) {
      process.exit(r.status ?? 1);
    }
  }

  const sel = await ticketPool.query(
    `SELECT layout_json, svg_markup FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [LUZHNIKI_FOOTBALL_STAGE_MAP_KEY],
  );
  const row = sel.rows[0];
  if (!row) throw new Error(`Нет строки ${LUZHNIKI_FOOTBALL_STAGE_MAP_KEY}`);

  const layout =
    row.layout_json && typeof row.layout_json === 'object' ? { ...row.layout_json } : {};
  const cloudBefore = Array.isArray(layout.allSeatCoordinates) ? layout.allSeatCoordinates.length : 0;
  const seatsBefore = Array.isArray(layout.seats) ? layout.seats.length : 0;

  for (const key of LAYOUT_KEYS_TO_DROP) {
    delete layout[key];
  }
  Object.assign(layout, LAYOUT_PATCH);

  const svgBefore = String(row.svg_markup ?? '');
  const circlesBefore = countSvgNativeSeatCircles(svgBefore);
  const svgAfter = stripLuzhnikiPilotSeatsLayerFromSvg(svgBefore);
  const circlesAfter = countSvgNativeSeatCircles(svgAfter);

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
      ` | reset-checkout-map ${new Date().toISOString()} cloud=${cloudBefore} droppedSeats=${seatsBefore}`,
    ],
  );

  const verify = await ticketPool.query(
    `SELECT layout_json,
            length(svg_markup::text) AS svg_len
     FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [LUZHNIKI_FOOTBALL_STAGE_MAP_KEY],
  );
  const L = verify.rows[0]?.layout_json ?? {};

  console.log(
    JSON.stringify(
      {
        ok: true,
        cloud: Array.isArray(L.allSeatCoordinates) ? L.allSeatCoordinates.length : 0,
        omitClientSeatCoordinateCloud: L.omitClientSeatCoordinateCloud,
        luzhnikiPilotSeatsFile: L.luzhnikiPilotSeatsFile ?? null,
        seatsInLayout: Array.isArray(L.seats) ? L.seats.length : 0,
        svgLen: Number(verify.rows[0]?.svg_len),
        svgCircles: countSvgNativeSeatCircles(verify.rows[0]?.svg_markup ?? ''),
        reseed: RESEED,
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
