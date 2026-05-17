#!/usr/bin/env node
/**
 * SVG-слой с центрами кресел = strict pbilet (tickets.json x,y), без fieldGrid/warp.
 * Круги в viewBox 11413×9676, атрибуты place-name / row / place как у GetBilet.
 *
 *   node scripts/export-luzhniki-pbilet-geodesy-svg.js
 *   node scripts/export-luzhniki-pbilet-geodesy-svg.js --merge-db
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';

import ticketPool from '../ticketDb.js';
import { LUZHNIKI_FOOTBALL_STAGE_MAP_KEY } from '../services/luzhnikiFootballStageMap.js';
import { extractPbiletTicketsSeatGeodesy } from '../utils/luzhnikiPbiletGeodesyExtract.js';
import { normalizeHallSvgDataIds } from '../utils/normalizeHallSvgDataIds.js';
import {
  LUZHNIKI_PILOT_SEATS_LAYER_ID,
  pilotSeatCircleMarkup,
  stripLuzhnikiPilotSeatsLayerFromSvg,
} from '../utils/luzhnikiPilotSeatSvg.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const outDir = path.join(repoRoot, 'backend/data/luzhniki-geodesy/hand');

dotenv.config({ path: path.join(__dirname, '../.env') });

const LAYER_ID = 'pbilet-strict-seat-geodesy';
const W = 11413;
const H = 9676;

function buildStrictLayerSvg(seats) {
  const chunks = seats.map((s) => {
    const cx = (s.xPct / 100) * W;
    const cy = (s.yPct / 100) * H;
    return pilotSeatCircleMarkup(s.sector, s.row, s.seat, cx, cy, W, H, 'data-source="strict"');
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <g id="${LAYER_ID}" data-geodesy="pbilet-strict">${chunks.join('')}</g>
</svg>`;
}

async function mergeLayerIntoBase(baseSvg, layerSvg) {
  const cheerio = (await import('cheerio')).default;
  const base = stripLuzhnikiPilotSeatsLayerFromSvg(String(baseSvg ?? '').trim());
  const $ = cheerio.load(base, { xml: true });
  $(`#${LAYER_ID}`).remove();
  $(`#${LUZHNIKI_PILOT_SEATS_LAYER_ID}`).remove();

  const $layer = cheerio.load(layerSvg, { xml: true });
  const g = $layer(`#${LAYER_ID}`).first();
  if (!g.length) throw new Error('layer empty');
  $('svg').first().append($.html(g));
  return normalizeHallSvgDataIds($.xml ? $.xml() : $.html());
}

async function main() {
  const mergeDb = process.argv.includes('--merge-db');
  const tickets = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tickets.json'), 'utf8'));
  const seats = extractPbiletTicketsSeatGeodesy(tickets, W, H);

  const layerSvg = buildStrictLayerSvg(seats);
  fs.mkdirSync(outDir, { recursive: true });
  const layerPath = path.join(outDir, 'luzhniki-pbilet-strict-seats.svg');
  const bundlePath = path.join(outDir, 'bundle-luzhniki-pbilet-strict-seats.json');

  fs.writeFileSync(layerPath, layerSvg, 'utf8');
  fs.writeFileSync(
    bundlePath,
    `${JSON.stringify(
      {
        hallWidth: W,
        hallHeight: H,
        mode: 'pbilet-strict',
        source: 'tickets.json r[].s[]',
        builtAt: new Date().toISOString(),
        circleCount: seats.length,
        sectorCount: new Set(seats.map((s) => s.sector)).size,
        svgMarkup: layerSvg,
        seats,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  let mergedDb = false;
  if (mergeDb) {
    const r = await ticketPool.query(
      `SELECT svg_markup FROM getbilet_stage_maps WHERE stage_external_id = $1`,
      [LUZHNIKI_FOOTBALL_STAGE_MAP_KEY],
    );
    const base = r.rows[0]?.svg_markup;
    if (String(base).includes('<svg')) {
      const merged = await mergeLayerIntoBase(base, layerSvg);
      await ticketPool.query(
        `UPDATE getbilet_stage_maps SET svg_markup = $2, updated_at = NOW() WHERE stage_external_id = $1`,
        [LUZHNIKI_FOOTBALL_STAGE_MAP_KEY, merged],
      );
      mergedDb = true;
    }
    await ticketPool.end();
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        strictSeats: seats.length,
        layerPath,
        bundlePath,
        mergedDb,
        note: 'Только подписанные места tickets.json; sellable без strict — interpolatePbiletSeatGeodesy',
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
