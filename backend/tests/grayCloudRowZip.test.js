import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildGrayCloudRowZipMap,
  buildLabeledSeatIndex,
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
