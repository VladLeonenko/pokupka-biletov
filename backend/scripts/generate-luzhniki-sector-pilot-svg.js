#!/usr/bin/env node
/**
 * Пилот векторной схемы: один сектор из tickets.json → SVG (viewBox 11413×9676) + bundle.
 *
 * Координаты из pbilet (strict), не fieldGrid. Круги с place-name / row / place для svgNative.
 *
 *   cd backend && node scripts/generate-luzhniki-sector-pilot-svg.js
 *   cd backend && node scripts/generate-luzhniki-sector-pilot-svg.js --sector "Сектор D 230" --with-bg
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

import cheerio from 'cheerio';

import { normalizeHallSvgDataIds } from '../utils/normalizeHallSvgDataIds.js';
import {
  LUZHNIKI_PILOT_SEATS_LAYER_ID,
  pilotSeatCircleMarkup,
} from '../utils/luzhnikiPilotSeatSvg.js';
import {
  extractPbiletTicketsSeatGeodesy,
  extractPbiletTicketSectorPaths,
} from '../utils/luzhnikiPbiletGeodesyExtract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

function escAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sectorMatch(label, pattern) {
  const norm = String(label).replace(/\s+/g, ' ').trim().toLowerCase();
  const p = String(pattern).replace(/\s+/g, ' ').trim().toLowerCase();
  return norm === p || norm.includes(p);
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      accept: 'image/svg+xml,text/plain,*/*',
      'user-agent': 'pokupka-biletov-luzhniki-pilot/1.0',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

function buildSeatCirclesXml(seats, w, h) {
  return seats
    .map((s) => {
      const cx = (s.xPct / 100) * w;
      const cy = (s.yPct / 100) * h;
      return pilotSeatCircleMarkup(s.sector, s.row, s.seat, cx, cy, w, h);
    })
    .join('\n    ');
}

function appendPilotLayers(svgMarkup, sectorMeta, seats, w, h) {
  const $ = cheerio.load(svgMarkup, { xml: true });
  const svg = $('svg').first();
  if (!svg.length) throw new Error('Нет корневого <svg>');

  svg.attr('viewBox', `0 0 ${w} ${h}`);
  svg.attr('width', String(w));
  svg.attr('height', String(h));

  $(`#${LUZHNIKI_PILOT_SEATS_LAYER_ID}`).remove();

  const gSeats = $(`<g id="${LUZHNIKI_PILOT_SEATS_LAYER_ID}" fill="none"/>`);
  gSeats.append(buildSeatCirclesXml(seats, w, h));
  svg.append(gSeats);

  return normalizeHallSvgDataIds($.xml ? $.xml() : $.html());
}

function buildMinimalSvg(sectorMeta, seats, w, h) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="#f8fafc"/>
  <g id="${LUZHNIKI_PILOT_SEATS_LAYER_ID}" fill="none">
    ${buildSeatCirclesXml(seats, w, h)}
  </g>
</svg>`;
}

async function main() {
  const args = process.argv.slice(2);
  const sectorIdx = args.indexOf('--sector');
  const sectorQuery = sectorIdx >= 0 ? args[sectorIdx + 1] : 'Сектор D 230';
  const withBg = args.includes('--with-bg');

  const outDir = path.join(repoRoot, 'backend/data/luzhniki-geodesy/hand');
  fs.mkdirSync(outDir, { recursive: true });

  const coords = JSON.parse(fs.readFileSync(path.join(repoRoot, 'luzhniki.txt'), 'utf8'));
  const tickets = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tickets.json'), 'utf8'));
  const w = Number(coords.width) || 11413;
  const h = Number(coords.height) || 9676;

  const allSeats = extractPbiletTicketsSeatGeodesy(tickets, w, h);
  const seats = allSeats.filter((s) => sectorMatch(s.sector, sectorQuery));
  const sectorPaths = extractPbiletTicketSectorPaths(tickets).filter((s) =>
    sectorMatch(s.label, sectorQuery),
  );

  if (seats.length < 1) {
    throw new Error(`Нет мест с координатами для «${sectorQuery}» в tickets.json`);
  }
  if (sectorPaths.length < 1) {
    throw new Error(`Нет контура сектора «${sectorQuery}» (path) в tickets.json`);
  }

  const sectorMeta = sectorPaths[0];
  let svgMarkup;

  if (withBg) {
    const bgUrl = String(coords.bg ?? '').trim();
    if (!bgUrl) throw new Error('luzhniki.txt: нет bg URL для --with-bg');
    const rawBg = await fetchText(bgUrl);
    svgMarkup = appendPilotLayers(normalizeHallSvgDataIds(rawBg), sectorMeta, seats, w, h);
  } else {
    svgMarkup = normalizeHallSvgDataIds(buildMinimalSvg(sectorMeta, seats, w, h));
  }

  const slug =
    sectorQuery
      .replace(/сектор/gi, 'sector')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'sector';

  const svgPath = path.join(outDir, `sector-${slug}-pilot.svg`);
  const bundlePath = path.join(outDir, `bundle-${slug}-pilot.json`);

  const bundle = {
    hallWidth: w,
    hallHeight: h,
    source: `hand-vector-pilot-${slug}`,
    svgMarkup,
    sectors: [
      {
        id: sectorMeta.id,
        label: sectorMeta.label,
        path: sectorMeta.path,
      },
    ],
    seats: seats.map((s) => ({
      sector: s.sector,
      row: s.row,
      seat: s.seat,
      x: (s.xPct / 100) * w,
      y: (s.yPct / 100) * h,
    })),
  };

  fs.writeFileSync(svgPath, svgMarkup, 'utf8');
  fs.writeFileSync(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');

  console.log(
    JSON.stringify(
      {
        ok: true,
        sector: sectorMeta.label,
        seatCount: seats.length,
        rows: [...new Set(seats.map((s) => s.row))].sort((a, b) => Number(b) - Number(a)),
        viewBox: `0 0 ${w} ${h}`,
        withBg,
        svgPath,
        bundlePath,
        next: [
          'Локально: open hand/sector-*-pilot.svg в браузере',
          'Прод: node scripts/apply-luzhniki-sector-pilot-svg.js --bundle hand/bundle-*-pilot.json',
        ],
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
