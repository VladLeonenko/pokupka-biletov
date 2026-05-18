import assert from 'node:assert/strict';
import test from 'node:test';

import { resolvePolarGridSeatFromAnchors } from '../utils/luzhnikiSectorPolarGrid.js';

test('A216 row 29 seats stay inside sector anchor hull', () => {
  const hit = resolvePolarGridSeatFromAnchors('Сектор A 216', '29', '21');
  assert.ok(hit);
  assert.match(String(hit.geodesySource), /radialGrid|polarGrid/);
  assert.ok(hit.xPct > 86 && hit.xPct < 92, `xPct=${hit.xPct}`);
  assert.ok(hit.yPct > 88 && hit.yPct < 93, `yPct=${hit.yPct}`);
});
