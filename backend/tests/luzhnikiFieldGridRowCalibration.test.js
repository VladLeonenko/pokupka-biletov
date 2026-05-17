import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractPbiletCoordinatesSeatDots, extractPbiletTicketsSeatGeodesy } from '../utils/luzhnikiPbiletGeodesyExtract.js';
import { buildStadiumLayoutSeatsFromDotGrid } from '../utils/hallSeatGeodesyLuzhnikiGrid.js';
import { extractPbiletTicketSectorPaths } from '../utils/luzhnikiPbiletGeodesyExtract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

function spatialRowDelta(strict, grid, sector) {
  const gsec = grid.filter((s) => s.sector === sector);
  const deltas = [];
  for (const st of strict.filter((s) => s.sector === sector)) {
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
    if (best) deltas.push(parseInt(best.g.row, 10) - parseInt(st.row, 10));
  }
  return deltas;
}

test('fieldGrid row labels align with strict tickets (A103, D230)', () => {
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

  for (const sector of ['Сектор A 103', 'Сектор D 230']) {
    const strict = strictAll.filter((s) => s.sector === sector);
    const deltas = spatialRowDelta(strict, grid, sector);
    assert.ok(deltas.length >= 5, `${sector}: need spatial matches`);
    const exact = deltas.filter((d) => d === 0).length;
    const within1 = deltas.filter((d) => Math.abs(d) <= 1).length;
    assert.ok(
      exact / deltas.length >= 0.85 || within1 / deltas.length >= 0.95,
      `${sector}: row delta poor exact=${exact}/${deltas.length} within1=${within1}/${deltas.length} sample=${deltas.slice(0, 8)}`,
    );
  }

  const d230 = grid.filter((s) => s.sector === 'Сектор D 230');
  const rowNums = [...new Set(d230.map((s) => parseInt(s.row, 10)))].filter(Number.isFinite).sort((a, b) => a - b);
  assert.ok(rowNums.length >= 25, `D230: need full tribune rows, got ${rowNums.length} (${rowNums[0]}..${rowNums[rowNums.length - 1]})`);
  assert.equal(rowNums[0], 1, 'D230: radial step starts at row 1');
});
