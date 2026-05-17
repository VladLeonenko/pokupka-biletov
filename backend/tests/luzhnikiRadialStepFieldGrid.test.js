import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildStadiumLayoutSeatsFromDotGrid } from '../utils/hallSeatGeodesyLuzhnikiGrid.js';
import {
  extractPbiletCoordinatesSeatDots,
  extractPbiletTicketsSeatGeodesy,
  extractPbiletTicketSectorPaths,
} from '../utils/luzhnikiPbiletGeodesyExtract.js';
import { buildLayoutSeatConcentricRowRings } from '../utils/luzhnikiLayoutSeatPolarRowGrid.js';
import { DEFAULT_SECTOR_MAX_ROW } from '../utils/luzhnikiRadialStepFieldGrid.js';
import { analyzeSeatGridQuality } from '../utils/luzhnikiSeatRowColumnGrid.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

test('polar row rings from layout: 35 arcs, zero row crossings', () => {
  const l = JSON.parse(fs.readFileSync(path.join(repoRoot, 'luzhniki.txt'), 'utf8'));
  const cloud = extractPbiletCoordinatesSeatDots(l, 11413, 9676);
  const seats = cloud.map((d, i) => ({
    sector: 'cloud',
    row: String(1 + (i % DEFAULT_SECTOR_MAX_ROW)),
    seat: String((i % 20) + 1),
    xPct: d.xPct,
    yPct: d.yPct,
  }));
  const grid = buildLayoutSeatConcentricRowRings(seats, 11413, 9676);
  assert.equal(grid.rowLines.length, DEFAULT_SECTOR_MAX_ROW);
  const q = analyzeSeatGridQuality(grid.rowLines, [], { polarRowRings: true });
  assert.equal(q.rowLineCrossings, 0, 'concentric arcs must not cross');
  assert.equal(q.verdict, 'grid_ok');
});

test('radial step fieldGrid: D230 has rows 1..35 coverage', () => {
  const W = 11413;
  const H = 9676;
  const t = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tickets.json'), 'utf8'));
  const l = JSON.parse(fs.readFileSync(path.join(repoRoot, 'luzhniki.txt'), 'utf8'));
  const strictAll = extractPbiletTicketsSeatGeodesy(t, W, H);
  const cloud = extractPbiletCoordinatesSeatDots(l, W, H);
  const sectors = extractPbiletTicketSectorPaths(t);

  const grid = buildStadiumLayoutSeatsFromDotGrid({
    sectorPaths: sectors,
    allSeatCoordinates: cloud,
    svgMarkup: '',
    hallWidth: W,
    hallHeight: H,
    ticketsSeats: strictAll,
  });

  const d230 = grid.filter((s) => s.sector === 'Сектор D 230');
  const rows = [...new Set(d230.map((s) => parseInt(s.row, 10)))].filter(Number.isFinite).sort((a, b) => a - b);
  assert.ok(d230.length >= 500, `D230 seat count ${d230.length}`);
  assert.ok(rows.length >= 25, `D230 rows ${rows.length}`);
  assert.equal(rows[0], 1, 'first row');
  assert.ok(rows[rows.length - 1] >= 30, 'top rows');

  const rows = [...new Set(d230.map((s) => parseInt(s.row, 10)))].filter(Number.isFinite);
  assert.equal(rows[0], 1);
  assert.ok(rows.length >= 25);
});
