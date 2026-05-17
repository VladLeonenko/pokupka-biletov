#!/usr/bin/env node
/**
 * Одноразово убрать 80k pilot-circle из svg_markup в БД (оставить layout_json.seats).
 *
 *   cd backend && node scripts/strip-luzhniki-pilot-circles-from-db-svg.js
 */
import path from 'node:path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';

import ticketPool from '../ticketDb.js';
import { LUZHNIKI_FOOTBALL_STAGE_MAP_KEY } from '../services/luzhnikiFootballStageMap.js';
import { countSvgNativeSeatCircles } from '../utils/hallSeatGeodesyFromSvgCircles.js';
import { stripLuzhnikiPilotSeatsLayerFromSvg } from '../utils/luzhnikiPilotSeatSvg.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const stageId = process.env.STAGE_MAP_STAGE_ID?.trim() || LUZHNIKI_FOOTBALL_STAGE_MAP_KEY;
  const r = await ticketPool.query(
    `SELECT length(svg_markup::text) AS svg_len, svg_markup FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [stageId],
  );
  const row = r.rows[0];
  if (!row?.svg_markup) throw new Error(`Нет svg_markup для ${stageId}`);

  const beforeLen = Number(row.svg_len);
  const beforeCircles = countSvgNativeSeatCircles(row.svg_markup);
  const stripped = stripLuzhnikiPilotSeatsLayerFromSvg(row.svg_markup);
  const afterCircles = countSvgNativeSeatCircles(stripped);

  const upd = await ticketPool.query(
    `UPDATE getbilet_stage_maps
     SET svg_markup = $2,
         updated_at = NOW(),
         notes_internal = COALESCE(notes_internal, '') || $3
     WHERE stage_external_id = $1
     RETURNING length(svg_markup::text) AS svg_len`,
    [
      stageId,
      stripped,
      ` | strip-pilot-svg ${new Date().toISOString()} circles ${beforeCircles}→${afterCircles}`,
    ],
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        stage: stageId,
        svgLenBefore: beforeLen,
        svgLenAfter: Number(upd.rows[0]?.svg_len),
        circlesBefore: beforeCircles,
        circlesAfter: afterCircles,
      },
      null,
      2,
    ),
  );
  await ticketPool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
