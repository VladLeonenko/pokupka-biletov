#!/usr/bin/env node
/**
 * Подмешать пилотный SVG (круги сектора) в getbilet_stage_maps.luzhniki-football.
 * layout_json (чаша 77k) не трогаем — только svg_markup.
 *
 *   cd backend && node scripts/apply-luzhniki-sector-pilot-svg.js \
 *     --bundle data/luzhniki-geodesy/hand/bundle-sector-sektor-d-230-pilot.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';

import ticketPool from '../ticketDb.js';
import { LUZHNIKI_FOOTBALL_STAGE_MAP_KEY } from '../services/luzhnikiFootballStageMap.js';
import { countSvgNativeSeatCircles } from '../utils/hallSeatGeodesyFromSvgCircles.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(__dirname, '../.env') });

function requiredFile(relOrAbs) {
  const candidates = path.isAbsolute(relOrAbs)
    ? [relOrAbs]
    : [
        path.resolve(repoRoot, relOrAbs),
        path.resolve(repoRoot, 'backend', relOrAbs),
        path.resolve(process.cwd(), relOrAbs),
      ];
  const abs = candidates.find((p) => fs.existsSync(p));
  if (!abs) throw new Error(`Файл не найден: ${relOrAbs}`);
  return abs;
}

async function main() {
  const args = process.argv.slice(2);
  const bundleIdx = args.indexOf('--bundle');
  if (bundleIdx < 0) {
    throw new Error('Укажите --bundle path/to/bundle-sector-*-pilot.json');
  }
  const bundlePath = requiredFile(args[bundleIdx + 1]);
  const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
  const svgMarkup = String(bundle.svgMarkup ?? '').trim();
  if (!svgMarkup.includes('<svg')) throw new Error('bundle: пустой svgMarkup');

  const circles = countSvgNativeSeatCircles(svgMarkup);
  const stageId = process.env.STAGE_MAP_STAGE_ID?.trim() || LUZHNIKI_FOOTBALL_STAGE_MAP_KEY;

  const r = await ticketPool.query(
    `UPDATE getbilet_stage_maps
     SET svg_markup = $2,
         updated_at = NOW(),
         notes_internal = COALESCE(notes_internal, '') || $3
     WHERE stage_external_id = $1
     RETURNING id, stage_external_id, length(svg_markup::text) AS svg_len`,
    [
      stageId,
      svgMarkup,
      ` | pilot-svg ${new Date().toISOString()} circles=${circles} from ${path.basename(bundlePath)}`,
    ],
  );

  if (!r.rows[0]) {
    throw new Error(`Нет строки stage_external_id=${stageId} — сначала npm run reseed:luzhniki-from-repo`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        stage: stageId,
        svgLen: Number(r.rows[0].svg_len),
        svgCircleCount: circles,
        bundle: bundlePath,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
