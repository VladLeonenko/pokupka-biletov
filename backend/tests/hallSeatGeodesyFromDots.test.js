import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSellableSeatGeodesy } from '../utils/hallSeatGeodesyMatch.js';
import {
  buildSellableSeatGeodesyWithDots,
  pathBBox,
  resolveOfferSeatFromCalibratedCloud,
  buildLabeledSectorOrientationIndex,
  pickNearestSectorOrientation,
} from '../utils/hallSeatGeodesyFromDots.js';

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

test('calibrated cloud separates row 3 and row 11 on different Y', () => {
  const sectorPath =
    'M2155.5,3580 L1181.5,3580 C1174.87256,3580 1169.5,3574.62742 1169.5,3568 L1169.5,3051 C1169.5,3044.37256 1174.87256,3039 1181.5,3039 L2155.5,3039 C2162.12741,3039 2167.5,3044.37256 2167.5,3051 L2167.5,3568 C2167.5,3574.62742 2162.12741,3580 2155.5,3580 Z';
  const dots = [];
  for (let band = 0; band < 12; band += 1) {
    for (let s = 0; s < 18; s += 1) {
      dots.push({ xPct: 11 + s * 0.35, yPct: 30 + band * 0.65 });
    }
  }
  const rowRange = { min: 3, max: 20 };
  const orientation = { rowYPctIncreases: 1, seatXPctIncreases: 1 };
  const r3 = resolveOfferSeatFromCalibratedCloud(3, 1, dots, rowRange, { min: 1, max: 8 }, orientation);
  const r11 = resolveOfferSeatFromCalibratedCloud(
    11,
    6,
    dots,
    rowRange,
    { min: 1, max: 12 },
    orientation,
  );
  assert.ok(r3 && r11);
  assert.ok(Math.abs(r11.yPct - r3.yPct) > 0.4, 'rows must not share same band Y');
});

test('B147 cloud geodesy uses nearest tribune orientation', () => {
  const layoutSeats = [
    { sector: 'Сектор B 258', row: '35', seat: '1', xPct: 10, yPct: 40 },
    { sector: 'Сектор B 258', row: '37', seat: '1', xPct: 10, yPct: 38 },
  ];
  const sectorPathB147 =
    'M2155.5,3580 L1181.5,3580 C1174.87256,3580 1169.5,3574.62742 1169.5,3568 L1169.5,3051 C1169.5,3044.37256 1174.87256,3039 1181.5,3039 L2155.5,3039 C2162.12741,3039 2167.5,3044.37256 2167.5,3051 L2167.5,3568 C2167.5,3574.62742 2162.12741,3580 2155.5,3580 Z';
  const sectorPathB258 =
    'M100,3900 L200,3900 L200,3800 L100,3800 Z';
  const paths = [
    { label: 'Сектор B 147', path: sectorPathB147 },
    { label: 'Сектор B 258', path: sectorPathB258 },
  ];
  const idx = buildLabeledSectorOrientationIndex(layoutSeats, paths, 11413, 9676);
  const o = pickNearestSectorOrientation('b147', idx);
  assert.ok(o);
  assert.equal(o.norm, 'b258');
});

test('D-218 sector alias matches layout', () => {
  const layoutSeats = [{ sector: 'Сектор D-218', row: '21', seat: '10', xPct: 93.3, yPct: 82.3 }];
  const offers = [{ Sector: 'сектор d218', Row: '21', SeatList: ['10'] }];
  const diag = buildSellableSeatGeodesy(layoutSeats, offers);
  assert.equal(diag.matched, 1);
});
