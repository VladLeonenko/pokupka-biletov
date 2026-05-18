import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  labelAxisGridSector,
  labelCornerSector,
  labelSectorDots,
  labelStraightSector,
  loadPrecomputeContext,
} from '../utils/luzhnikiGrayDotsLabeler.js';
import {
  buildLabeledDotsMap,
  labeledDotsFileExists,
  LUZHNIKI_PRECOMPUTE_SECTOR_NORMS,
  loadLabeledDotsArray,
} from '../utils/luzhnikiLabeledDotsStore.js';
import { resolveSellableFromLabeledDots } from '../utils/luzhnikiSectorCloudRowSeat.js';
import { computeFieldCenterPct } from '../utils/hallSeatGeodesySectorNative.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const hasLuzhniki = fs.existsSync(path.join(repoRoot, 'luzhniki.txt'));

function assertNoDupes(dots) {
  const keys = new Set();
  for (const p of dots) {
    const k = `${p.row}:${p.seat}`;
    assert.ok(!keys.has(k), `duplicate ${k}`);
    keys.add(k);
    assert.ok(p.row >= 1 && p.seat >= 1);
  }
}

test('labelStraightSector: synthetic grid', () => {
  const dots = [];
  for (let row = 0; row < 3; row += 1) {
    for (let seat = 0; seat < 4; seat += 1) {
      dots.push({ xPct: 10 + seat * 0.3, yPct: 50 - row * 0.2 });
    }
  }
  const labeled = labelStraightSector(dots, { expectedRows: 3 });
  assert.equal(labeled.length, 12);
  assertNoDupes(labeled);
  const row1 = labeled.filter((p) => p.row === 1);
  assert.equal(row1.length, 4);
});

test('labelAxisGridSector: skips row 17', () => {
  const dots = [];
  for (let r = 0; r < 5; r += 1) {
    for (let s = 0; s < 3; s += 1) {
      dots.push({ xPct: 30 + s * 0.2, yPct: 40 - r * 0.25 });
    }
  }
  const labeled = labelAxisGridSector(dots, { rowGap: 17 });
  assert.ok(!labeled.some((p) => p.row === 17));
  assertNoDupes(labeled);
});

test('resolveSellableFromLabeledDots: O(1) lookup', () => {
  const arr = [
    { x: 10, y: 20, row: 5, seat: 3 },
    { x: 11, y: 21, row: 5, seat: 4 },
  ];
  const map = new Map();
  for (const p of arr) map.set(`${p.row}:${p.seat}`, p);
  const hit = resolveSellableFromLabeledDots(map, 5, 3);
  assert.ok(hit);
  assert.equal(hit.xPct, 10);
  assert.equal(hit.yPct, 20);
  assert.match(hit.geodesySource, /labeled/);
});

test('all precompute norms have unique row:seat after label', { skip: !hasLuzhniki }, () => {
  const ctx = loadPrecomputeContext();
  for (const norm of LUZHNIKI_PRECOMPUTE_SECTOR_NORMS) {
    const labeled = labelSectorDots(norm, ctx);
    if (!labeled.length) continue;
    assertNoDupes(labeled);
  }
});

test('a101 precompute: row bands and labeled file', { skip: !hasLuzhniki }, () => {
  const ctx = loadPrecomputeContext();
  const labeled = labelSectorDots('a101', ctx);
  assert.ok(labeled.length > 100, `a101 dots=${labeled.length}`);
  const rows = new Set(labeled.map((p) => p.row));
  assert.ok(rows.size >= 20, `row count ${rows.size}`);
  const row1 = labeled.filter((p) => p.row === 1);
  assert.ok(row1.length >= 3 && row1.length <= 8, `row1 seats=${row1.length}`);
  assertNoDupes(labeled);
});

test('b154: no row 17 in labeled output', { skip: !hasLuzhniki }, () => {
  const ctx = loadPrecomputeContext();
  const labeled = labelSectorDots('b154', ctx);
  assert.ok(labeled.length > 50);
  assert.ok(!labeled.some((p) => p.row === 17));
  const rows = new Set(labeled.map((p) => p.row));
  assert.ok(rows.has(16));
  assert.ok(rows.has(18));
});

test('labeled-dots files exist after precompute script', { skip: !hasLuzhniki }, () => {
  const missing = LUZHNIKI_PRECOMPUTE_SECTOR_NORMS.filter((n) => !labeledDotsFileExists(n));
  if (missing.length) {
    assert.fail(
      `Run: cd backend && npm run precompute:luzhniki-labeled-dots — missing: ${missing.join(', ')}`,
    );
  }
  for (const norm of LUZHNIKI_PRECOMPUTE_SECTOR_NORMS) {
    const arr = loadLabeledDotsArray(norm);
    assert.ok(arr?.length, norm);
    assertNoDupes(arr);
  }
});
