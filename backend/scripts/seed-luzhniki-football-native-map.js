/**
 * Полная схема Лужники (футбол) для stage_external_id=luzhniki-football:
 * path секторов + circle[place-name][row][place] + layout_json (svgNative, sectorMode).
 *
 * ⚠️ Для прода с реальной геодезией используй `npm run seed:luzhniki-football-map`
 * (seed-luzhniki-football-geodesy.js). Этот скрипт — синтетическая сетка для демо.
 *
 * Манифест: frontend/public/hall-maps/luzhniki-football-sector-manifest.json
 * или LUZHNIKI_FOOTBALL_MANIFEST_PATH=./path.json
 *
 * Подписи sector.label должны совпадать с полем Sector в офферах GetBilet (или fuzzy — см. svgNativeSeatLayout).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ticketPool from '../ticketDb.js';
import { LUZHNIKI_FOOTBALL_STAGE_MAP_KEY } from '../services/luzhnikiFootballStageMap.js';
import {
  buildLuzhnikiFootballNativeArtifacts,
  loadManifest,
} from '../utils/luzhnikiFootballNativeGenerator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

function optionalEnv(name) {
  return process.env[name]?.trim() || null;
}

async function main() {
  const stageId = optionalEnv('STAGE_MAP_STAGE_ID') || LUZHNIKI_FOOTBALL_STAGE_MAP_KEY;
  const title =
    optionalEnv('STAGE_MAP_TITLE') || 'Стадион «Лужники» — футбол (общая схема)';
  const placeExternalId = optionalEnv('STAGE_MAP_PLACE_ID');
  const notesExtra = optionalEnv('STAGE_MAP_NOTES');
  const externalPlanUrl = optionalEnv(
    'STAGE_MAP_EXTERNAL_PLAN_URL',
    'https://tickets-luzhniki.ru/',
  );

  const envManifest = optionalEnv('LUZHNIKI_FOOTBALL_MANIFEST_PATH');
  const defaultManifest = path.join(
    repoRoot,
    'frontend/public/hall-maps/luzhniki-football-sector-manifest.json',
  );
  const manifestAbs = envManifest
    ? path.isAbsolute(envManifest)
      ? envManifest
      : path.resolve(repoRoot, envManifest)
    : defaultManifest;

  const manifest = loadManifest(fs.existsSync(manifestAbs) ? manifestAbs : null);
  const { svgMarkup, layoutJson, stats } = buildLuzhnikiFootballNativeArtifacts(manifest);

  const notesInternal =
    `luzhnikiFootballNativeGenerator manifest=${fs.existsSync(manifestAbs) ? manifestAbs : '(defaults)'}; sectors=${stats.sectors}; seats=${stats.seats}` +
    (notesExtra ? `. ${notesExtra}` : '');

  const result = await ticketPool.query(
    `INSERT INTO getbilet_stage_maps (
       stage_external_id, place_external_id, title, svg_markup, layout_json,
       notes_internal, external_plan_url, updated_at
     )
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, NOW())
     ON CONFLICT (stage_external_id) DO UPDATE SET
       place_external_id = EXCLUDED.place_external_id,
       title = EXCLUDED.title,
       svg_markup = EXCLUDED.svg_markup,
       layout_json = EXCLUDED.layout_json,
       notes_internal = EXCLUDED.notes_internal,
       external_plan_url = EXCLUDED.external_plan_url,
       updated_at = NOW()
     RETURNING id, stage_external_id, title`,
    [
      stageId,
      placeExternalId,
      title,
      svgMarkup,
      JSON.stringify(layoutJson),
      notesInternal,
      externalPlanUrl,
    ],
  );

  console.log(
    JSON.stringify(
      {
        saved: result.rows[0],
        stats,
        manifestUsed: fs.existsSync(manifestAbs) ? manifestAbs : null,
        layoutMode: layoutJson.layoutMode,
        sectorModeEnabled: layoutJson.sectorMode?.enabled === true,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
