/**
 * Данные для /test/luzhniki-seat-grid: strict 6132 vs fieldGrid, сравнение рядов.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildFullStadiumLabeledSeats } from '../utils/luzhnikiStadiumFullGeodesy.js';
import { extractPbiletTicketsSeatGeodesy } from '../utils/luzhnikiPbiletGeodesyExtract.js';
import { normalizeSectorLabel } from '../utils/ticketHallSectorNormalize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

function loadRepoJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relPath), 'utf8'));
}

function sectorMatches(sector, filter) {
  if (!filter?.trim()) return true;
  const f = normalizeSectorLabel(filter);
  const s = normalizeSectorLabel(sector);
  return s.includes(f) || f.includes(s);
}

/** @param {{ sector: string, row: string, seat: string, xPct: number, yPct: number }} strict
 *  @param {{ sector: string, row: string, seat: string, xPct: number, yPct: number, geodesySource?: string }[]} grid
 */
export function compareStrictToFieldGrid(strict, grid) {
  const gsec = grid.filter((s) => s.geodesySource === 'fieldGrid' || !s.geodesySource);
  const deltas = [];
  const samples = [];

  for (const st of strict) {
    const sameRow = gsec.find(
      (g) => g.row === st.row && Math.hypot(g.xPct - st.xPct, g.yPct - st.yPct) < 0.25,
    );
    if (sameRow) {
      deltas.push(0);
      continue;
    }
    let best = null;
    for (const g of gsec) {
      const d = Math.hypot(g.xPct - st.xPct, g.yPct - st.yPct);
      if (d < 0.25 && (!best || d < best.d)) best = { g, d };
    }
    if (best) {
      const dr = parseInt(best.g.row, 10) - parseInt(st.row, 10);
      deltas.push(dr);
      if (samples.length < 8 && Math.abs(dr) > 0) {
        samples.push({
          strictRow: st.row,
          strictSeat: st.seat,
          gridRow: best.g.row,
          gridSeat: best.g.seat,
          rowDelta: dr,
          distPct: Math.round(best.d * 1000) / 1000,
        });
      }
    }
  }

  const exact = deltas.filter((d) => d === 0).length;
  const within1 = deltas.filter((d) => Math.abs(d) <= 1).length;
  const hist = new Map();
  for (const d of deltas) hist.set(d, (hist.get(d) || 0) + 1);

  return {
    strictCount: strict.length,
    gridCount: gsec.length,
    matched: deltas.length,
    exactRowMatch: exact,
    within1Row: within1,
    exactPct: deltas.length ? Math.round((exact / deltas.length) * 1000) / 10 : 0,
    medianRowDelta:
      deltas.length > 0 ? deltas.sort((a, b) => a - b)[Math.floor(deltas.length / 2)] : null,
    rowDeltaHistogram: [...hist.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([delta, count]) => ({ delta, count })),
    mismatchSamples: samples,
  };
}

let cachedBuild = null;

function loadFullBuild() {
  if (cachedBuild) return cachedBuild;
  const tickets = loadRepoJson('tickets.json');
  const coords = loadRepoJson('luzhniki.txt');
  cachedBuild = buildFullStadiumLabeledSeats({
    ticketsPayload: tickets,
    coordinatesPayload: coords,
    svgMarkup: '',
  });
  return cachedBuild;
}

/**
 * @param {{ sectorFilter?: string }} options
 */
export function buildLuzhnikiSeatGridDiagnosticPayload(options = {}) {
  const sectorFilter = options.sectorFilter?.trim() ?? '';
  const W = 11413;
  const H = 9676;
  const tickets = loadRepoJson('tickets.json');
  const strictAll = extractPbiletTicketsSeatGeodesy(tickets, W, H);
  const { seats, stats, hallWidth, hallHeight } = loadFullBuild();

  const strict = strictAll.filter((s) => sectorMatches(s.sector, sectorFilter));
  const grid = seats.filter(
    (s) => s.geodesySource === 'fieldGrid' && sectorMatches(s.sector, sectorFilter),
  );

  const sectors = [...new Set(strictAll.map((s) => s.sector.trim()))].sort((a, b) =>
    a.localeCompare(b, 'ru'),
  );

  return {
    hallWidth,
    hallHeight,
    stats,
    sectorFilter: sectorFilter || null,
    sectors,
    strict,
    fieldGrid: grid,
    compare: compareStrictToFieldGrid(strict, grid),
    referenceSectors: ['Сектор D 230', 'Сектор A 103', 'Сектор C 131'],
  };
}
