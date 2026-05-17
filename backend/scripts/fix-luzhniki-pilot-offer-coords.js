#!/usr/bin/env node
/**
 * Пересчитать координаты live-offer кругов в пилоте из tickets.json (интерполяция рядов).
 * layout.seats сдвигает ряд 24 на позицию ~28.
 *
 *   cd backend && node scripts/fix-luzhniki-pilot-offer-coords.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

import cheerio from 'cheerio';

import { normalizeHallSvgDataIds } from '../utils/normalizeHallSvgDataIds.js';
import {
  extractPbiletTicketsSeatGeodesy,
  interpolatePbiletSeatGeodesy,
} from '../utils/luzhnikiPbiletGeodesyExtract.js';
import {
  LUZHNIKI_PILOT_SEATS_LAYER_ID,
  pilotSeatCircleMarkup,
} from '../utils/luzhnikiPilotSeatSvg.js';
import { parseSvgNativeSeatCircles } from '../utils/hallSeatGeodesyFromSvgCircles.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const bundlePath = path.join(__dirname, '../data/luzhniki-geodesy/hand/bundle-sector-d-230-pilot.json');
const ticketsPath = path.join(repoRoot, 'tickets.json');

function main() {
  const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
  const w = Number(bundle.hallWidth) || 11413;
  const h = Number(bundle.hallHeight) || 9676;
  const canonicalSector =
    bundle.sectors?.[0]?.label || bundle.seats?.[0]?.sector || 'Сектор D 230';

  const tickets = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
  const pbilet = extractPbiletTicketsSeatGeodesy(tickets, w, h);

  let svgMarkup = String(bundle.svgMarkup ?? '').trim();
  const $ = cheerio.load(svgMarkup, { xml: true });
  const g = $(`#${LUZHNIKI_PILOT_SEATS_LAYER_ID}`);
  if (!g.length) throw new Error('Нет #luzhniki-pilot-seats');

  const kept = [];
  g.find('circle[place-name]').each((_, el) => {
    const c = $(el);
    const row = String(c.attr('row') ?? '').trim();
    const seat = String(c.attr('place') ?? '').trim();
    const isLive = c.attr('data-source') === 'live-offer' || row === '24';
    if (isLive) return;
    kept.push({
      sector: c.attr('place-name') || canonicalSector,
      row,
      seat,
      cx: Number.parseFloat(c.attr('cx') || ''),
      cy: Number.parseFloat(c.attr('cy') || ''),
    });
  });

  const offerSeats = process.env.PILOT_FIX_SEATS?.trim() || '8,9,10,11';
  const offerList = offerSeats.split(',').map((s) => s.trim()).filter(Boolean);
  const live = [];
  for (const seat of offerList) {
    const hit = interpolatePbiletSeatGeodesy(pbilet, canonicalSector, '24', seat);
    if (!hit) continue;
    live.push({ row: '24', seat, xPct: hit.xPct, yPct: hit.yPct });
  }

  g.empty();
  for (const s of kept) {
    if (!Number.isFinite(s.cx) || !Number.isFinite(s.cy)) continue;
    g.append(pilotSeatCircleMarkup(canonicalSector, s.row, s.seat, s.cx, s.cy, w, h));
  }
  for (const s of live) {
    const cx = (s.xPct / 100) * w;
    const cy = (s.yPct / 100) * h;
    g.append(
      pilotSeatCircleMarkup(
        canonicalSector,
        s.row,
        s.seat,
        cx,
        cy,
        w,
        h,
        'data-source="live-offer"',
      ),
    );
  }

  svgMarkup = normalizeHallSvgDataIds($.xml ? $.xml() : $.html());
  fs.writeFileSync(bundlePath, `${JSON.stringify({ ...bundle, svgMarkup }, null, 2)}\n`, 'utf8');
  const svgPath = bundlePath.replace(/bundle-/, 'sector-').replace(/\.json$/, '.svg');
  fs.writeFileSync(svgPath, svgMarkup, 'utf8');

  const circles = parseSvgNativeSeatCircles(svgMarkup, w, h);
  const r24 = circles.filter((c) => c.row === '24');
  console.log(
    JSON.stringify(
      {
        ok: true,
        keptTicketsCircles: kept.length,
        liveRow24: r24.map((s) => ({
          seat: s.seat,
          xPct: +s.xPct.toFixed(3),
          yPct: +s.yPct.toFixed(3),
        })),
        totalCircles: circles.length,
      },
      null,
      2,
    ),
  );
}

main();
