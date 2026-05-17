#!/usr/bin/env node
/**
 * Подмешать пилотные geodesy-круги (#luzhniki-pilot-seats) в svg_markup, не заменяя всю схему.
 *
 *   cd backend && node scripts/apply-luzhniki-sector-pilot-svg.js \
 *     --bundle data/luzhniki-geodesy/hand/bundle-sector-d-230-pilot.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

import cheerio from 'cheerio';
import dotenv from 'dotenv';

import ticketPool from '../ticketDb.js';
import { LUZHNIKI_FOOTBALL_STAGE_MAP_KEY } from '../services/luzhnikiFootballStageMap.js';
import { countSvgNativeSeatCircles } from '../utils/hallSeatGeodesyFromSvgCircles.js';
import { normalizeHallSvgDataIds } from '../utils/normalizeHallSvgDataIds.js';
import {
  LUZHNIKI_PILOT_SEATS_LAYER_ID,
  LUZHNIKI_PILOT_SECTOR_LAYER_ID,
} from '../utils/luzhnikiPilotSeatSvg.js';

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

function mergePilotSeatsIntoSvg(baseSvg, pilotSvg) {
  const $base = cheerio.load(String(baseSvg ?? '').trim(), { xml: true });
  const svg = $base('svg').first();
  if (!svg.length) throw new Error('Текущий svg_markup без <svg>');

  $base(`#${LUZHNIKI_PILOT_SECTOR_LAYER_ID}`).remove();
  $base(`#${LUZHNIKI_PILOT_SEATS_LAYER_ID}`).remove();

  const $pilot = cheerio.load(String(pilotSvg ?? '').trim(), { xml: true });
  const pilotG = $pilot(`#${LUZHNIKI_PILOT_SEATS_LAYER_ID}`).first();
  if (!pilotG.length) throw new Error('bundle: нет #luzhniki-pilot-seats');

  svg.append($base(pilotG.clone()).toString());
  return normalizeHallSvgDataIds($base.xml ? $base.xml() : $base.html());
}

async function main() {
  const args = process.argv.slice(2);
  const bundleIdx = args.indexOf('--bundle');
  if (bundleIdx < 0) {
    throw new Error('Укажите --bundle path/to/bundle-sector-*-pilot.json');
  }
  const bundlePath = requiredFile(args[bundleIdx + 1]);
  const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
  const pilotSvg = String(bundle.svgMarkup ?? '').trim();
  if (!pilotSvg.includes('<svg')) throw new Error('bundle: пустой svgMarkup');

  const stageId = process.env.STAGE_MAP_STAGE_ID?.trim() || LUZHNIKI_FOOTBALL_STAGE_MAP_KEY;

  const current = await ticketPool.query(
    `SELECT svg_markup FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [stageId],
  );
  const baseSvg = String(current.rows[0]?.svg_markup ?? '').trim();
  if (!baseSvg.includes('<svg')) {
    throw new Error(`Пустой svg_markup для ${stageId} — сначала reseed схемы`);
  }

  const merged = mergePilotSeatsIntoSvg(baseSvg, pilotSvg);
  const circles = countSvgNativeSeatCircles(merged);

  const r = await ticketPool.query(
    `UPDATE getbilet_stage_maps
     SET svg_markup = $2,
         updated_at = NOW(),
         notes_internal = COALESCE(notes_internal, '') || $3
     WHERE stage_external_id = $1
     RETURNING id, stage_external_id, length(svg_markup::text) AS svg_len`,
    [
      stageId,
      merged,
      ` | pilot-merge ${new Date().toISOString()} circles=${circles} from ${path.basename(bundlePath)}`,
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
        mergeMode: 'pilot-seats-layer-only',
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
