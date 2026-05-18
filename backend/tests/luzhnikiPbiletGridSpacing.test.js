import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  getPbiletGridSpacing,
  measurePbiletGridSpacingFromTickets,
  resolveCornerSectorPbiletStepGrid,
} from '../utils/luzhnikiPbiletGridSpacing.js';
import { loadSectorCalibrationBlocksByNorm } from '../utils/hallSeatGeodesySectorRowAnchors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ticketsPath = path.resolve(__dirname, '../../tickets.json');

test('D124 strict: seatStep ~0.2067%, rowStep ~0.1928%', () => {
  const t = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
  const m = measurePbiletGridSpacingFromTickets(t);
  assert.ok(Math.abs(m.seatStepPct - 0.206697) < 0.0001);
  assert.ok(Math.abs(m.rowStepPct - 0.192763) < 0.0001);
});

test('a101 row11 seat7: step grid ближе к svg row11 чем row33', () => {
  const block = loadSectorCalibrationBlocksByNorm().get('a101');
  const anchors = block?.anchors ?? [];
  const opts = {
    rowCurve: 0.42,
    rowStepMultiplier: 1.12,
    seatSpreadMultiplier: 2,
    minSeatPerRow: 4,
    maxSeatPerRow: 39,
    originRow: 1,
    originSeat: 1,
  };
  const pt = resolveCornerSectorPbiletStepGrid(anchors, 11, 7, opts);
  assert.ok(pt);
  const pt33 = resolveCornerSectorPbiletStepGrid(anchors, 33, 7, opts);
  assert.ok(pt33);
  assert.ok(Math.abs(pt.yPct - pt33.yPct) > 0.5, 'row 11 and 33 separated');
});

test('a101 row11: места 7,8,9 монотонно слева направо', () => {
  const block = loadSectorCalibrationBlocksByNorm().get('a101');
  const opts = {
    rowCurve: 0.42,
    rowStepMultiplier: 1.12,
    seatSpreadMultiplier: 2,
    minSeatPerRow: 4,
    maxSeatPerRow: 39,
    originRow: 1,
    originSeat: 1,
  };
  const pts = [7, 8, 9].map((seat) =>
    resolveCornerSectorPbiletStepGrid(block.anchors, 11, seat, opts),
  );
  assert.ok(pts.every(Boolean));
  assert.ok(pts[0].xPct < pts[1].xPct && pts[1].xPct < pts[2].xPct, 'от поля: 7 слева от 8 слева от 9');
});

function pointInConvexQuad(p, q) {
  const cross = (a, b, c) =>
    (b.xPct - a.xPct) * (c.yPct - a.yPct) - (b.yPct - a.yPct) * (c.xPct - a.xPct);
  const signs = [
    cross(q[0], q[1], p),
    cross(q[1], q[2], p),
    cross(q[2], q[3], p),
    cross(q[3], q[0], p),
  ];
  const pos = signs.filter((s) => s >= -1e-9).length;
  const neg = signs.filter((s) => s <= 1e-9).length;
  return pos === 4 || neg === 4;
}

test('a101: sellable-ряды внутри четырёхугольника якорей', () => {
  const block = loadSectorCalibrationBlocksByNorm().get('a101');
  const roles = ['nearLeft', 'nearRight', 'farRight', 'farLeft'];
  const byRole = Object.fromEntries(block.anchors.map((a) => [a.role, a]));
  const quad = roles.map((r) => byRole[r]);
  const opts = {
    rowCurve: 0.42,
    rowStepMultiplier: 1.12,
    seatSpreadMultiplier: 2,
    minSeatPerRow: 4,
    maxSeatPerRow: 39,
    originRow: 1,
    originSeat: 1,
  };
  const samples = [
    [1, 1],
    [1, 4],
    [11, 7],
    [11, 9],
    [35, 26],
    [38, 25],
    [42, 1],
  ];
  for (const [row, seat] of samples) {
    const pt = resolveCornerSectorPbiletStepGrid(block.anchors, row, seat, opts);
    assert.ok(pt, `row ${row} seat ${seat}`);
    assert.ok(
      pointInConvexQuad(pt, quad),
      `r${row}s${seat} (${pt.xPct.toFixed(2)},${pt.yPct.toFixed(2)}) outside quad`,
    );
  }
});

test('a101 row38: место 25 правее места 7 (слева направо)', () => {
  const block = loadSectorCalibrationBlocksByNorm().get('a101');
  const opts = {
    rowCurve: 0.42,
    rowStepMultiplier: 1.12,
    seatSpreadMultiplier: 2,
    minSeatPerRow: 4,
    maxSeatPerRow: 39,
    originRow: 1,
    originSeat: 1,
  };
  const p7 = resolveCornerSectorPbiletStepGrid(block.anchors, 38, 7, opts);
  const p25 = resolveCornerSectorPbiletStepGrid(block.anchors, 38, 25, opts);
  assert.ok(p7 && p25);
  assert.ok(p25.xPct > p7.xPct + 0.3, `seat25 x=${p25.xPct} should be right of seat7 x=${p7.xPct}`);
});
