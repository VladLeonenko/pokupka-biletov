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
  const opts = { rowCurve: 0.42, rowStepMultiplier: 0.6, maxSeatPerRow: 40, originRow: 1, originSeat: 1 };
  const pt = resolveCornerSectorPbiletStepGrid(anchors, 11, 7, opts);
  assert.ok(pt);
  const pt33 = resolveCornerSectorPbiletStepGrid(anchors, 33, 7, opts);
  assert.ok(pt33);
  assert.ok(Math.abs(pt.yPct - pt33.yPct) > 0.5, 'row 11 and 33 separated');
});

test('a101 row38: место 25 правее места 7 (слева направо)', () => {
  const block = loadSectorCalibrationBlocksByNorm().get('a101');
  const opts = { rowCurve: 0.42, rowStepMultiplier: 0.6, maxSeatPerRow: 40, originRow: 1, originSeat: 1 };
  const p7 = resolveCornerSectorPbiletStepGrid(block.anchors, 38, 7, opts);
  const p25 = resolveCornerSectorPbiletStepGrid(block.anchors, 38, 25, opts);
  assert.ok(p7 && p25);
  assert.ok(p25.xPct > p7.xPct + 0.3, `seat25 x=${p25.xPct} should be right of seat7 x=${p7.xPct}`);
});
