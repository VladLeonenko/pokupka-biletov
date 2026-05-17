import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSimpleSeatRowColumnGrid } from '../utils/luzhnikiSimpleSeatRowColumnGrid.js';

test('buildSimpleSeatRowColumnGrid: одна линия на ряд', () => {
  const labeledSeats = [];
  for (let row = 1; row <= 8; row += 1) {
    for (let seat = 1; seat <= 6; seat += 1) {
      labeledSeats.push({
        sector: 'Сектор POLAR',
        row: String(row),
        seat: String(seat),
        xPct: 50 + row * 1.2 + seat * 0.15,
        yPct: 48 + row * 0.35,
      });
    }
  }

  const { rowLines, columnLines } = buildSimpleSeatRowColumnGrid(labeledSeats, {
    sector: 'POLAR',
    hallWidth: 11413,
    hallHeight: 9676,
  });

  assert.equal(rowLines.length, 8, `expected 8 rows, got ${rowLines.length}`);
  assert.ok(columnLines.length >= 3);
  assert.equal(rowLines[0]?.source, 'layoutSeat');
});
