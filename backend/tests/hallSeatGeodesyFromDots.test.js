import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSellableSeatGeodesy } from '../utils/hallSeatGeodesyMatch.js';
import { buildSellableSeatGeodesyWithDots, pathBBox } from '../utils/hallSeatGeodesyFromDots.js';

test('pathBBox extracts bounds from SVG path', () => {
  const b = pathBBox('M10,20 L30,40 L50,20 Z');
  assert.ok(b);
  assert.equal(b.minX, 10);
  assert.equal(b.minY, 20);
  assert.equal(b.maxX, 50);
  assert.equal(b.maxY, 40);
});

test('labeled lookup places offer seat using exact layout row+seat', () => {
  const layoutSeats = [
    { sector: 'Сектор A 1', row: '1', seat: '1', xPct: 10, yPct: 20 },
    { sector: 'Сектор A 1', row: '1', seat: '2', xPct: 12, yPct: 20 },
    { sector: 'Сектор A 1', row: '2', seat: '1', xPct: 10, yPct: 22 },
    { sector: 'Сектор A 1', row: '2', seat: '2', xPct: 12, yPct: 22 },
  ];
  const offers = [{ Sector: 'сектор a1', Row: '1', SeatList: ['2'] }];
  const diag = buildSellableSeatGeodesy(layoutSeats, offers);
  assert.equal(diag.matched, 1);
  assert.equal(diag.seats[0].xPct, 12);
  assert.equal(diag.seats[0].yPct, 20);
});

test('seat number 08 matches layout seat 8', () => {
  const layoutSeats = [
    { sector: 'Сектор D 218', row: '21', seat: '8', xPct: 50, yPct: 60 },
  ];
  const offers = [{ Sector: 'сектор d218', Row: '21', SeatList: ['08'] }];
  const diag = buildSellableSeatGeodesy(layoutSeats, offers);
  assert.equal(diag.matched, 1);
  assert.equal(diag.seats[0].xPct, 50);
});

test('withDots wrapper does not invent coordinates for unknown row', () => {
  const layoutSeats = [
    { sector: 'Сектор B 145', row: '20', seat: '1', xPct: 10, yPct: 30 },
    { sector: 'Сектор B 145', row: '22', seat: '1', xPct: 10, yPct: 32 },
  ];
  const offers = [{ Sector: 'сектор b145', Row: '26', SeatList: ['1'] }];
  const diag = buildSellableSeatGeodesyWithDots(layoutSeats, [], [], 200, 200, offers);
  assert.equal(diag.matched, 0);
  assert.equal(diag.dotMatched, 0);
});

test('D-218 sector alias matches layout', () => {
  const layoutSeats = [{ sector: 'Сектор D-218', row: '21', seat: '10', xPct: 93.3, yPct: 82.3 }];
  const offers = [{ Sector: 'сектор d218', Row: '21', SeatList: ['10'] }];
  const diag = buildSellableSeatGeodesy(layoutSeats, offers);
  assert.equal(diag.matched, 1);
});
