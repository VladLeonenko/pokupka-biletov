import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadProdLayoutSeats } from '../utils/luzhnikiProdLayoutSeats.js';
import { buildLayoutSeatConcentricRowRings } from '../utils/luzhnikiLayoutSeatPolarRowGrid.js';
import { analyzeSeatGridQuality } from '../utils/luzhnikiSeatRowColumnGrid.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

test('concentric row rings: ~35 circles, zero crossings, round in px', () => {
  const sidecar = path.join(
    repoRoot,
    'backend/data/luzhniki-geodesy/hand/bundle-luzhniki-stadium-pilot-seats.json',
  );
  if (!fs.existsSync(sidecar)) {
    return;
  }
  const prod = loadProdLayoutSeats({ hallWidth: 11413, hallHeight: 9676 });
  const grid = buildLayoutSeatConcentricRowRings(prod.seats, 11413, 9676);
  assert.ok(grid.rowLines.length >= 30, `rings ${grid.rowLines.length}`);
  assert.equal(grid.columnLines.length, 0);

  const q = analyzeSeatGridQuality(grid.rowLines, grid.columnLines, { polarRowRings: true });
  assert.equal(q.rowLineCrossings, 0);

  const line = grid.rowLines.find((l) => l.rowId === '20') || grid.rowLines[0];
  const pts = line.points;
  const cx = (grid.fieldCenter.xPct / 100) * 11413;
  const cy = (grid.fieldCenter.yPct / 100) * 9676;
  const rs = pts.map((p) => Math.hypot(p.x - cx, p.y - cy));
  const rMed = rs.sort((a, b) => a - b)[Math.floor(rs.length / 2)];
  const spread = Math.max(...rs) - Math.min(...rs);
  assert.ok(spread / rMed < 0.02, `ring should be circular in px, spread=${spread}, r=${rMed}`);
});
