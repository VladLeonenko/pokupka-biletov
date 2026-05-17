import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeSellableSeatsIntoLayout } from '../utils/luzhnikiLayoutSeatPatch.js';

test('mergeSellableSeatsIntoLayout patches layout entry by sector/row/seat', () => {
  const layoutSeats = [
    {
      sector: 'Сектор C 243',
      row: '35',
      seat: '8',
      xPct: 48.23,
      yPct: 0.63,
      geodesySource: 'fieldGrid',
    },
  ];
  const sellable = [
    {
      sector: 'сектор c243',
      row: '35',
      seat: '8',
      xPct: 47.88,
      yPct: 1.54,
      geodesySource: 'svgCircle',
    },
  ];
  const { patched } = mergeSellableSeatsIntoLayout(layoutSeats, sellable);
  assert.equal(patched, 1);
  assert.ok(layoutSeats[0].yPct > 1);
  assert.equal(layoutSeats[0].geodesySource, 'svgCircle');
});
