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
  const anchors = loadSectorCalibrationBlocksByNorm().get('a101')?.anchors ?? [];
  const pt = resolveCornerSectorPbiletStepGrid(anchors, 11, 7, { rowCurve: 0.32 });
  assert.ok(pt);
  const pt33 = resolveCornerSectorPbiletStepGrid(anchors, 33, 7, { rowCurve: 0.32 });
  assert.ok(pt33);
  assert.ok(Math.abs(pt.yPct - pt33.yPct) > 0.5, 'row 11 and 33 separated');
});
