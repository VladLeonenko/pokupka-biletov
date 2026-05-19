import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildGrayCloudRowZipMap,
  buildLabeledSeatIndex,
  dedupeLabeledSeatsByKey,
  lookupLabeledSeat,
} from '../utils/hallSeatGeodesyMatch.js';

test('rowZip: API seats 28–31 → bundle places 1–4', () => {
  const index = buildLabeledSeatIndex([
    { sector: 'Сектор A 101', row: '34', seat: '1', xPct: 10, yPct: 20 },
    { sector: 'Сектор A 101', row: '34', seat: '2', xPct: 11, yPct: 20 },
    { sector: 'Сектор A 101', row: '34', seat: '3', xPct: 12, yPct: 20 },
    { sector: 'Сектор A 101', row: '34', seat: '4', xPct: 13, yPct: 20 },
  ]);
  const map = buildGrayCloudRowZipMap(index, 'a101', '34', ['31', '28', '30', '29']);
  assert.equal(map.size, 4);
  assert.equal(map.get('28')?.xPct, 10);
  assert.equal(map.get('29')?.xPct, 11);
  assert.equal(map.get('30')?.xPct, 12);
  assert.equal(map.get('31')?.xPct, 13);
});

test('rowZip: B262 row 41 seats 7–10 — exact, не подмена на 1–4', () => {
  const index = buildLabeledSeatIndex([
    { sector: 'b262', row: '41', seat: '1', xPct: 1, yPct: 1 },
    { sector: 'b262', row: '41', seat: '2', xPct: 2, yPct: 1 },
    { sector: 'b262', row: '41', seat: '7', xPct: 70, yPct: 41 },
    { sector: 'b262', row: '41', seat: '8', xPct: 71, yPct: 41 },
    { sector: 'b262', row: '41', seat: '9', xPct: 72, yPct: 41 },
    { sector: 'b262', row: '41', seat: '10', xPct: 73, yPct: 41 },
  ]);
  const map = buildGrayCloudRowZipMap(index, 'b262', '41', ['7', '8', '9', '10']);
  assert.equal(map.get('9')?.xPct, 72);
  assert.equal(map.get('7')?.xPct, 70);
  assert.notEqual(map.get('9')?.xPct, 1);
});

test('dedupeLabeledSeatsByKey: последняя точка по ключу', () => {
  const seats = dedupeLabeledSeatsByKey([
    { sector: 'b262', row: '41', seat: '9', xPct: 1, yPct: 1 },
    { sector: 'b262', row: '41', seat: '9', xPct: 72, yPct: 41 },
  ]);
  assert.equal(seats.length, 1);
  const index = buildLabeledSeatIndex(seats);
  assert.equal(lookupLabeledSeat(index, 'b262', '41', '9')?.xPct, 72);
});
