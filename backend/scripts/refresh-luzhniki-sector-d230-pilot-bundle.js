#!/usr/bin/env node
/**
 * Нормализовать пилотный bundle: без рамки сектора, невидимые geodesy-круги, канонический place-name.
 *
 *   cd backend && node scripts/refresh-luzhniki-sector-d230-pilot-bundle.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

import cheerio from 'cheerio';

import { normalizeHallSvgDataIds } from '../utils/normalizeHallSvgDataIds.js';
import { strictSeatKey } from '../utils/ticketHallSectorNormalize.js';
import {
  LUZHNIKI_PILOT_SEATS_LAYER_ID,
  LUZHNIKI_PILOT_SECTOR_LAYER_ID,
  pilotSeatCircleMarkup,
} from '../utils/luzhnikiPilotSeatSvg.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundlePath = path.join(__dirname, '../data/luzhniki-geodesy/hand/bundle-sector-d-230-pilot.json');

function main() {
  const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
  const w = Number(bundle.hallWidth) || 11413;
  const h = Number(bundle.hallHeight) || 9676;
  const canonicalSector =
    bundle.sectors?.[0]?.label || bundle.seats?.[0]?.sector || 'Сектор D 230';

  let svgMarkup = String(bundle.svgMarkup ?? '').trim();
  const $ = cheerio.load(svgMarkup, { xml: true });
  $(`#${LUZHNIKI_PILOT_SECTOR_LAYER_ID}`).remove();

  let g = $(`#${LUZHNIKI_PILOT_SEATS_LAYER_ID}`);
  if (!g.length) throw new Error('Нет #luzhniki-pilot-seats в bundle');

  const circles = [];
  g.find('circle[place-name]').each((_, el) => {
    const c = $(el);
    const row = String(c.attr('row') ?? '').trim();
    const seat = String(c.attr('place') ?? '').trim();
    if (!row || !seat) return;
    const cx = Number.parseFloat(c.attr('cx') || '');
    const cy = Number.parseFloat(c.attr('cy') || '');
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
    const dataSource = c.attr('data-source') ? `data-source="${c.attr('data-source')}"` : '';
    circles.push({ row, seat, cx, cy, dataSource });
  });

  g.empty();
  g.attr('fill', 'none');
  g.removeAttr('stroke');
  g.removeAttr('stroke-width');

  for (const s of circles) {
    g.append(pilotSeatCircleMarkup(canonicalSector, s.row, s.seat, s.cx, s.cy, w, h, s.dataSource));
  }

  svgMarkup = normalizeHallSvgDataIds($.xml ? $.xml() : $.html());
  const out = { ...bundle, svgMarkup };
  fs.writeFileSync(bundlePath, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

  const svgPath = bundlePath.replace(/bundle-/, 'sector-').replace(/\.json$/, '.svg');
  fs.writeFileSync(svgPath, svgMarkup, 'utf8');

  console.log(
    JSON.stringify(
      {
        ok: true,
        canonicalSector,
        circles: circles.length,
        keysSample: circles.slice(0, 3).map((s) => strictSeatKey(canonicalSector, s.row, s.seat)),
        bundlePath,
      },
      null,
      2,
    ),
  );
}

main();
