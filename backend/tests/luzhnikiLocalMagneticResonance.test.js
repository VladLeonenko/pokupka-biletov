import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyLocalMagneticResonanceToLabeledSeats,
  buildLMRDiagnosticGridFromLabeledSeats,
  buildSectorLocalFrame,
  circleCenterFromThreePoints,
  sectorTribuneClass,
  toFieldPolar,
} from '../utils/luzhnikiLocalMagneticResonance.js';
import { interpolatePbiletSeatGeodesy } from '../utils/luzhnikiPbiletGeodesyExtract.js';
import { buildLabeledSeatIndex } from '../utils/hallSeatGeodesyMatch.js';

test('LMR: uniform R в ряду', () => {
  const path = 'M 2000 2000 L 9000 2000 L 9000 8000 L 2000 8000 Z';
  const seats = [];
  for (let seat = 1; seat <= 6; seat += 1) {
    seats.push({
      sector: 'Сектор TEST',
      row: '10',
      seat: String(seat),
      xPct: 50 + 10 + seat * 0.2,
      yPct: 50 + 8 + (seat % 2) * 0.15,
      geodesySource: 'fieldGrid',
    });
  }
  const { seats: out } = applyLocalMagneticResonanceToLabeledSeats(
    seats,
    [{ label: 'Сектор TEST', path }],
    seats,
    11413,
    9676,
  );
  const fc = { xPct: 50, yPct: 50 };
  const rs = out.map((s) => Math.hypot(s.xPct - fc.xPct, s.yPct - fc.yPct));
  const spread = Math.max(...rs) - Math.min(...rs);
  assert.ok(spread < 0.08, `R spread=${spread}`);
  assert.equal(out[0].geodesySource, 'lmrSnap');
});

test('interpolatePbiletSeatGeodesy: snap к fieldGrid index', () => {
  const grid = buildLabeledSeatIndex([
    { sector: 'Сектор D 230', row: '24', seat: '8', xPct: 55.1, yPct: 22.0, geodesySource: 'lmrSnap' },
  ]);
  const hit = interpolatePbiletSeatGeodesy([], 'Сектор D 230', '24', '8', grid);
  assert.ok(hit);
  assert.equal(hit.geodesySource, 'fieldGridSnap');
  assert.ok(Math.abs(hit.xPct - 55.1) < 1e-6);
});

test('buildLMRDiagnosticGridFromLabeledSeats: master grid >= sparse rows', () => {
  const path = 'M 2000 2000 L 9000 2000 L 9000 8000 L 2000 8000 Z';
  const seats = [];
  for (let row = 10; row <= 25; row += 2) {
    for (let seat = 1; seat <= 10; seat += 1) {
      seats.push({
        sector: 'Сектор D 230',
        row: String(row),
        seat: String(seat),
        xPct: 55 + row * 0.08,
        yPct: 22 + row * 0.05,
        geodesySource: 'lmrSnap',
      });
    }
  }
  const grid = buildLMRDiagnosticGridFromLabeledSeats({
    labeledSeats: seats,
    sectorPaths: [{ label: 'Сектор D 230', path }],
    hallWidth: 11413,
    hallHeight: 9676,
    sectorFilter: 'D 230',
    forceFullGrid: true,
  });
  assert.ok(grid.rowLines.length >= 8);
  assert.ok((grid.virtualRowCount ?? 0) >= 1);
});

test('circleCenterFromThreePoints', () => {
  const c = circleCenterFromThreePoints(
    { xPct: 0, yPct: 0 },
    { xPct: 2, yPct: 0 },
    { xPct: 1, yPct: 1 },
  );
  assert.ok(c);
  assert.ok(Math.abs(c.xPct - 1) < 0.01);
  assert.ok(Math.abs(c.yPct - 0) < 0.01);
});

test('sectorTribuneClass: торцы A/C', () => {
  assert.equal(sectorTribuneClass('Сектор A 108'), 'end');
  assert.equal(sectorTribuneClass('Сектор B 230'), 'side');
});

test('buildSectorLocalFrame: ось от центра поля к сектору', () => {
  const path = 'M 3000 3000 L 8000 3000 L 8000 7000 L 3000 7000 Z';
  const field = { xPct: 50, yPct: 50 };
  const frame = buildSectorLocalFrame(field, path, 11413, 9676, 'Сектор D 230');
  assert.ok(Math.abs(frame.origin.xPct - 50) < 0.01);
  assert.ok(Number.isFinite(frame.phiBisector));
});

test('columnRayBounds: не вылетает за места', () => {
  const path = 'M 2000 2000 L 9000 2000 L 9000 8000 L 2000 8000 Z';
  const seats = [];
  for (let row = 1; row <= 5; row += 1) {
    for (let seat = 1; seat <= 4; seat += 1) {
      seats.push({
        sector: 'Сектор X',
        row: String(row),
        seat: String(seat),
        xPct: 50 + row * 2 + seat * 0.2,
        yPct: 48 + row * 0.5,
        geodesySource: 'lmrSnap',
      });
    }
  }
  const grid = buildLMRDiagnosticGridFromLabeledSeats({
    labeledSeats: seats,
    sectorPaths: [{ label: 'Сектор X', path }],
    hallWidth: 11413,
    hallHeight: 9676,
  });
  for (const col of grid.columnLines) {
    assert.equal(col.points.length, 2);
  }
});
