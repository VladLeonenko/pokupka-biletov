#!/usr/bin/env node
/**
 * Полный SVG стадиона: каждое место с id, place-name, row, place (из pilot sidecar / full build).
 *
 *   npm run export:luzhniki-full-stadium-geodesy-svg
 *   node scripts/export-luzhniki-full-stadium-geodesy-svg.js --sector "D 230"
 *   node scripts/export-luzhniki-full-stadium-geodesy-svg.js --rebuild
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'node:child_process';

import dotenv from 'dotenv';

import { buildFullStadiumLabeledSeats } from '../utils/luzhnikiStadiumFullGeodesy.js';
import { pilotSeatCircleMarkup } from '../utils/luzhnikiPilotSeatSvg.js';
import { normalizeSectorLabel } from '../utils/ticketHallSectorNormalize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const outDir = path.join(repoRoot, 'backend/data/luzhniki-geodesy/hand');

dotenv.config({ path: path.join(__dirname, '../.env') });

const W = 11413;
const H = 9676;
const DEFAULT_SEATS = path.join(outDir, 'bundle-luzhniki-stadium-pilot-seats.json');

function parseArgs() {
  const sector = process.argv.find((a, i) => process.argv[i - 1] === '--sector')?.trim() ?? '';
  const rebuild = process.argv.includes('--rebuild');
  const visible = !process.argv.includes('--invisible');
  return { sector, rebuild, visible };
}

function loadSeats(rebuild) {
  if (rebuild) {
    const r = spawnSync('npm', ['run', 'build:luzhniki-stadium-pilot'], {
      cwd: path.join(repoRoot, 'backend'),
      stdio: 'inherit',
      env: { ...process.env, LUZHNIKI_CLOUD_MASTER: '0' },
    });
    if (r.status !== 0) throw new Error('build:luzhniki-stadium-pilot failed');
  }
  if (fs.existsSync(DEFAULT_SEATS)) {
    const raw = JSON.parse(fs.readFileSync(DEFAULT_SEATS, 'utf8'));
    return Array.isArray(raw) ? raw : [];
  }
  const tickets = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tickets.json'), 'utf8'));
  const coords = JSON.parse(fs.readFileSync(path.join(repoRoot, 'luzhniki.txt'), 'utf8'));
  let svg = '';
  const pilotSvg = path.join(outDir, 'sector-luzhniki-stadium-pilot.svg');
  if (fs.existsSync(pilotSvg)) svg = fs.readFileSync(pilotSvg, 'utf8');
  const built = buildFullStadiumLabeledSeats({
    ticketsPayload: tickets,
    coordinatesPayload: coords,
    svgMarkup: svg,
    hallWidth: W,
    hallHeight: H,
  });
  return built.seats;
}

function filterSector(seats, sectorArg) {
  if (!sectorArg?.trim()) return seats;
  const f = normalizeSectorLabel(sectorArg);
  return seats.filter((s) => {
    const n = normalizeSectorLabel(s.sector);
    return n.includes(f) || f.includes(n);
  });
}

function seatCircleMarkup(seat, visible) {
  const cx = (seat.xPct / 100) * W;
  const cy = (seat.yPct / 100) * H;
  const base = pilotSeatCircleMarkup(seat.sector, seat.row, seat.seat, cx, cy, W, H, `data-source="${seat.geodesySource ?? 'fieldGrid'}"`);
  if (!visible) return base;
  return base
    .replace('fill="none"', 'fill="#94a3b8"')
    .replace('stroke="none"', 'stroke="#1e293b"')
    .replace('opacity="0"', 'opacity="0.72"');
}

function main() {
  const { sector, rebuild, visible } = parseArgs();
  const all = loadSeats(rebuild);
  const seats = filterSector(all, sector);
  if (!seats.length) {
    console.error('No seats for sector filter:', sector || '(all)');
    process.exit(1);
  }

  const rowSet = new Set(seats.map((s) => s.row));
  const chunks = seats.map((s) => seatCircleMarkup(s, visible));
  const suffix = sector ? `-${normalizeSectorLabel(sector)}` : '-full';
  const layerId = 'luzhniki-full-seat-geodesy';
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <g id="${layerId}" data-geodesy="full-stadium" data-seat-count="${seats.length}" data-row-count="${rowSet.size}">
${chunks.join('\n')}
  </g>
</svg>`;

  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `luzhniki-stadium-geodesy${suffix}.svg`);
  const bundlePath = path.join(outDir, `bundle-luzhniki-stadium-geodesy${suffix}.json`);
  fs.writeFileSync(outPath, svg, 'utf8');
  fs.writeFileSync(
    bundlePath,
    `${JSON.stringify(
      {
        hallWidth: W,
        hallHeight: H,
        mode: 'full-stadium-geodesy',
        sectorFilter: sector || null,
        seatCount: seats.length,
        rowCount: rowSet.size,
        builtAt: new Date().toISOString(),
        svgPath: path.basename(outPath),
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        seats: seats.length,
        rows: rowSet.size,
        svg: outPath,
        bundle: bundlePath,
        visible,
      },
      null,
      2,
    ),
  );
}

main();
