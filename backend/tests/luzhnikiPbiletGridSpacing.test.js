import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  getPbiletGridSpacing,
  measureD124SeatGapPct,
  measurePbiletGridSpacingFromTickets,
  resolveCornerSectorPbiletStepGrid,
} from '../utils/luzhnikiPbiletGridSpacing.js';
import { loadSectorCalibrationBlocksByNorm } from '../utils/hallSeatGeodesySectorRowAnchors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ticketsPath = path.resolve(__dirname, '../../tickets.json');

const A101_OPTS = {
  rowCurve: 0.42,
  rowStepMultiplier: 1.12,
  seatSpreadMultiplier: 0.206697,
  rowLiftPct: 0,
  rowRadialDepthBoost: 0,
  seatCountFromLeft: true,
  radialFanExponent: 2,
  minSeatPerRow: 4,
  maxSeatPerRow: 39,
  originRow: 1,
  originSeat: 1,
};

test('D124 strict: seatStep ~0.2067%, rowStep ~0.1928%', () => {
  const t = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
  const m = measurePbiletGridSpacingFromTickets(t);
  assert.ok(Math.abs(m.seatStepPct - 0.206697) < 0.0001);
  assert.ok(Math.abs(m.rowStepPct - 0.192763) < 0.0001);
});

test('D124 row10 seat5-6 gap (fallback row9) ~0.206697%', () => {
  const t = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
  const gap = measureD124SeatGapPct(t, 10, 5, 6);
  assert.ok(Math.abs(gap - 0.206697) < 0.0001, `gap=${gap}`);
});

test('a101 row11 не на глубине ряда 4 (rowT, не rowT²)', () => {
  const block = loadSectorCalibrationBlocksByNorm().get('a101');
  const y4 = resolveCornerSectorPbiletStepGrid(block.anchors, 4, 7, A101_OPTS)?.yPct;
  const y11 = resolveCornerSectorPbiletStepGrid(block.anchors, 11, 7, A101_OPTS)?.yPct;
  const y20 = resolveCornerSectorPbiletStepGrid(block.anchors, 20, 7, A101_OPTS)?.yPct;
  assert.ok(y4 != null && y11 != null && y20 != null);
  assert.ok(y11 > y4 + 0.35, `row11 y=${y11} should be below row4 y=${y4}`);
  assert.ok(y11 < y20 + 0.2, `row11 y=${y11} should be above row20 y=${y20}`);
});

test('a101 row11 seat7: step grid ближе к svg row11 чем row33', () => {
  const block = loadSectorCalibrationBlocksByNorm().get('a101');
  const anchors = block?.anchors ?? [];
  const pt = resolveCornerSectorPbiletStepGrid(anchors, 11, 7, A101_OPTS);
  assert.ok(pt);
  const pt33 = resolveCornerSectorPbiletStepGrid(anchors, 33, 7, A101_OPTS);
  assert.ok(pt33);
  assert.ok(Math.abs(pt.yPct - pt33.yPct) > 0.5, 'row 11 and 33 separated');
});

test('a101 row11: seatCountFromLeft — 7,8,9 разведены, не слиплись', () => {
  const block = loadSectorCalibrationBlocksByNorm().get('a101');
  const pts = [7, 8, 9].map((seat) =>
    resolveCornerSectorPbiletStepGrid(block.anchors, 11, seat, A101_OPTS),
  );
  assert.ok(pts.every(Boolean));
  const xs = pts.map((p) => p.xPct);
  assert.ok(new Set(xs.map((x) => x.toFixed(4))).size === 3);
  assert.ok(pts[0].xPct > pts[1].xPct && pts[1].xPct > pts[2].xPct, 'от поля: 7 правее 8 правее 9');
});

test('a101 row11: места 22–25 не в одной точке', () => {
  const block = loadSectorCalibrationBlocksByNorm().get('a101');
  const xs = [22, 23, 24, 25].map(
    (s) => resolveCornerSectorPbiletStepGrid(block.anchors, 11, s, A101_OPTS).xPct,
  );
  assert.ok(new Set(xs.map((x) => x.toFixed(3))).size === 4);
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
  const samples = [
    [1, 1],
    [1, 4],
    [11, 7],
    [11, 9],
    [30, 8],
    [38, 7],
  ];
  for (const [row, seat] of samples) {
    const pt = resolveCornerSectorPbiletStepGrid(block.anchors, row, seat, A101_OPTS);
    assert.ok(pt, `row ${row} seat ${seat}`);
    assert.ok(
      pointInConvexQuad(pt, quad),
      `r${row}s${seat} (${pt.xPct.toFixed(2)},${pt.yPct.toFixed(2)}) outside quad`,
    );
  }
});

test('a101 radialFan: хорда ряда 38 шире ряда 1', () => {
  const block = loadSectorCalibrationBlocksByNorm().get('a101');
  const p1a = resolveCornerSectorPbiletStepGrid(block.anchors, 1, 1, A101_OPTS);
  const p1b = resolveCornerSectorPbiletStepGrid(block.anchors, 1, 4, A101_OPTS);
  const p38a = resolveCornerSectorPbiletStepGrid(block.anchors, 38, 1, A101_OPTS);
  const p38b = resolveCornerSectorPbiletStepGrid(block.anchors, 38, 16, A101_OPTS);
  const chord1 = Math.hypot(p1b.xPct - p1a.xPct, p1b.yPct - p1a.yPct);
  const chord38 = Math.hypot(p38b.xPct - p38a.xPct, p38b.yPct - p38a.yPct);
  assert.ok(chord38 > chord1 * 1.5, `chord38=${chord38} chord1=${chord1}`);
});

test('a101 row21: от чёрной линии 14 правее 15 правее 21', () => {
  const block = loadSectorCalibrationBlocksByNorm().get('a101');
  const p14 = resolveCornerSectorPbiletStepGrid(block.anchors, 21, 14, A101_OPTS);
  const p15 = resolveCornerSectorPbiletStepGrid(block.anchors, 21, 15, A101_OPTS);
  const p21 = resolveCornerSectorPbiletStepGrid(block.anchors, 21, 21, A101_OPTS);
  assert.ok(p14 && p15 && p21);
  assert.ok(p14.xPct > p15.xPct && p15.xPct > p21.xPct);
});

test('a101 row35: места 1–4 не слипаются', () => {
  const block = loadSectorCalibrationBlocksByNorm().get('a101');
  const pts = [1, 2, 3, 4].map((seat) =>
    resolveCornerSectorPbiletStepGrid(block.anchors, 35, seat, A101_OPTS),
  );
  assert.ok(pts.every(Boolean));
  const xs = pts.map((p) => p.xPct);
  assert.ok(new Set(xs.map((x) => x.toFixed(3))).size === 4);
});

test('a101 row38: места 22–25 отдельные, 22 левее 25', () => {
  const block = loadSectorCalibrationBlocksByNorm().get('a101');
  const pts = [22, 23, 24, 25].map((seat) =>
    resolveCornerSectorPbiletStepGrid(block.anchors, 38, seat, A101_OPTS),
  );
  assert.ok(pts.every(Boolean));
  const xs = pts.map((p) => p.xPct);
  assert.ok(new Set(xs.map((x) => x.toFixed(3))).size === 4);
  assert.ok(pts[0].xPct > pts[3].xPct + 0.15, 'seat22 правее seat25 (от поля)');
  const p30 = resolveCornerSectorPbiletStepGrid(block.anchors, 38, 30, A101_OPTS);
  assert.ok(Math.abs(pts[0].xPct - p30.xPct) > 0.25, 'seat22 not at seat30');
});

test('a101 row38: место 7 правее места 25 (от поля)', () => {
  const block = loadSectorCalibrationBlocksByNorm().get('a101');
  const p7 = resolveCornerSectorPbiletStepGrid(block.anchors, 38, 7, A101_OPTS);
  const p25 = resolveCornerSectorPbiletStepGrid(block.anchors, 38, 25, A101_OPTS);
  assert.ok(p7 && p25);
  assert.ok(p7.xPct > p25.xPct + 0.15, `seat7 x=${p7.xPct} right of seat25 x=${p25.xPct}`);
});

const B155_OPTS = {
  rowCurve: 0.42,
  rowStepMultiplier: 1.1,
  seatSpreadMultiplier: 1.2,
  seatCountFromRight: true,
  radialFanExponent: 2,
  rowBendExtraDeg: 5,
  originRow: 1,
  originSeat: 1,
  minSeatPerRow: 4,
  maxSeatPerRow: 29,
};

test('b155 row20: seatCountFromRight — 8 правее 9', () => {
  const block = loadSectorCalibrationBlocksByNorm().get('b155');
  const pts = [8, 9, 10].map((seat) =>
    resolveCornerSectorPbiletStepGrid(block.anchors, 20, seat, B155_OPTS),
  );
  assert.ok(pts.every(Boolean));
  assert.ok(pts[0].xPct > pts[1].xPct && pts[1].xPct > pts[2].xPct);
});

const B156_OPTS = {
  rowCurve: 0.42,
  rowStepMultiplier: 1.12,
  seatSpreadMultiplier: 1.25,
  seatCountFromRight: true,
  radialFanExponent: 2,
  rowBendExtraDeg: 5,
  originRow: 1,
  originSeat: 1,
  minSeatPerRow: 4,
  maxSeatPerRow: 62,
};

test('b156 row1 seat1: у nearLeft якоря', () => {
  const block = loadSectorCalibrationBlocksByNorm().get('b156');
  const pt = resolveCornerSectorPbiletStepGrid(block.anchors, 1, 1, B156_OPTS);
  const nearL = block.anchors.find((a) => a.role === 'nearLeft');
  assert.ok(pt && nearL);
  assert.ok(Math.hypot(pt.xPct - nearL.xPct, pt.yPct - nearL.yPct) < 0.25);
});

test('b156 row20: seatCountFromRight — 8 правее 9', () => {
  const block = loadSectorCalibrationBlocksByNorm().get('b156');
  const pts = [8, 9, 10].map((seat) =>
    resolveCornerSectorPbiletStepGrid(block.anchors, 20, seat, B156_OPTS),
  );
  assert.ok(pts.every(Boolean));
  assert.ok(pts[0].xPct > pts[1].xPct && pts[1].xPct > pts[2].xPct);
});
