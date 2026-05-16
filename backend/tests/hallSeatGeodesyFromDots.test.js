import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSellableSeatGeodesyWithDots, pathBBox } from '../utils/hallSeatGeodesyFromDots.js';

test('pathBBox extracts bounds from SVG path', () => {
  const b = pathBBox('M10,20 L30,40 L50,20 Z');
  assert.ok(b);
  assert.equal(b.minX, 10);
  assert.equal(b.minY, 20);
  assert.equal(b.maxX, 50);
  assert.equal(b.maxY, 40);
});

test('dot resolver places offer seat using anchors and hall dots', () => {
  const layoutSeats = [
    { sector: 'Сектор A 1', row: '1', seat: '1', xPct: 10, yPct: 20 },
    { sector: 'Сектор A 1', row: '1', seat: '2', xPct: 12, yPct: 20 },
    { sector: 'Сектор A 1', row: '2', seat: '1', xPct: 10, yPct: 22 },
    { sector: 'Сектор A 1', row: '2', seat: '2', xPct: 12, yPct: 22 },
  ];
  const allSeatCoordinates = [
    { xPct: 10, yPct: 20 },
    { xPct: 12, yPct: 20 },
    { xPct: 14, yPct: 20 },
    { xPct: 10, yPct: 22 },
    { xPct: 12, yPct: 22 },
    { xPct: 14, yPct: 22 },
  ];
  const sectorPaths = [
    {
      label: 'Сектор A 1',
      path: 'M0,0 L100,0 L100,100 L0,100 Z',
    },
  ];
  const offers = [
    {
      Sector: 'сектор a1',
      Row: '1',
      SeatList: ['3'],
    },
  ];
  const diag = buildSellableSeatGeodesyWithDots(
    layoutSeats,
    allSeatCoordinates,
    sectorPaths,
    100,
    100,
    offers,
  );
  assert.equal(diag.matched, 1);
  assert.equal(diag.seats.length, 1);
  assert.equal(diag.seats[0].seat, '3');
});
