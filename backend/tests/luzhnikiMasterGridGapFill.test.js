import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSectorMasterRowModel,
  isForceFullGrid,
  snapSeatToMasterGrid,
} from '../utils/luzhnikiMasterGridGapFill.js';

test('buildSectorMasterRowModel: заполняет ряды 1..maxRow', () => {
  const path = 'M 2000 2000 L 9000 2000 L 9000 8000 L 2000 8000 Z';
  const sectorDots = [];
  for (let row = 1; row <= 20; row += 1) {
    for (let seat = 1; seat <= 8; seat += 1) {
      const t = row / 20;
      sectorDots.push({
        xPct: 50 + 12 + t * 14 + seat * 0.1,
        yPct: 48 + t * 5,
      });
    }
  }
  const sectorSeats = [];
  for (const row of [3, 7, 12, 18]) {
    for (let seat = 1; seat <= 6; seat += 1) {
      sectorSeats.push({
        sector: 'Сектор TEST',
        row: String(row),
        seat: String(seat),
        xPct: 50 + 12 + (row / 20) * 14,
        yPct: 48 + (row / 20) * 5,
      });
    }
  }

  const prev = process.env.FORCE_FULL_GRID;
  process.env.FORCE_FULL_GRID = '1';
  const model = buildSectorMasterRowModel({
    sectorLabel: 'Сектор TEST',
    sectorPath: path,
    sectorSeats,
    sectorDots,
    fieldCenter: { xPct: 50, yPct: 50 },
    hallWidth: 11413,
    hallHeight: 9676,
  });
  if (prev == null) delete process.env.FORCE_FULL_GRID;
  else process.env.FORCE_FULL_GRID = prev;

  assert.ok(model.rows.length >= 15, `rows=${model.rows.length}`);
  const virtual = model.rows.filter((r) => r.virtual);
  assert.ok(virtual.length >= 5);
  const snap = snapSeatToMasterGrid(
    { sector: 'Сектор TEST', row: '10', seat: '3' },
    model,
    new Map(),
  );
  assert.ok(snap?.xPct);
});
