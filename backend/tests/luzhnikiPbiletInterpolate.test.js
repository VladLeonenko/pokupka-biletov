import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLabeledSeatIndex } from '../utils/hallSeatGeodesyMatch.js';
import {
  collectLayoutSectorPbiletSeats,
  extractPbiletTicketsSeatGeodesy,
  interpolatePbiletSeatGeodesy,
} from '../utils/luzhnikiPbiletGeodesyExtract.js';
import {
  luzhnikiSectorLookupNorms,
  normalizeSectorLabel,
} from '../utils/ticketHallSectorNormalize.js';

test('interpolatePbiletSeatGeodesy: row 24 не совпадает с row 28', () => {
  const tickets = {
    sectors: [
      {
        i: 'Сектор D 230',
        r: [
          { i: '26', s: [{ i: '8', x: 10900, y: 2126 }, { i: '2', x: 10870, y: 2006 }] },
          { i: '28', s: [{ i: '8', x: 10940, y: 2108 }, { i: '2', x: 10910, y: 1990 }] },
        ],
      },
    ],
  };
  const pbilet = extractPbiletTicketsSeatGeodesy(tickets, 11413, 9676);
  const r24 = interpolatePbiletSeatGeodesy(pbilet, 'Сектор D 230', '24', '8');
  const r28 = interpolatePbiletSeatGeodesy(pbilet, 'Сектор D 230', '28', '8');
  assert.ok(r24 && r28);
  assert.notDeepEqual(
    { x: +r24.xPct.toFixed(2), y: +r24.yPct.toFixed(2) },
    { x: +r28.xPct.toFixed(2), y: +r28.yPct.toFixed(2) },
  );
});

test('vipc138 → якоря c138', () => {
  const tickets = {
    sectors: [
      {
        i: 'Сектор C 138',
        r: [
          { i: '5', s: [{ i: '1', x: 5000, y: 1500 }] },
          { i: '8', s: [{ i: '1', x: 5100, y: 1600 }] },
        ],
      },
    ],
  };
  const pbilet = extractPbiletTicketsSeatGeodesy(tickets, 11413, 9676);
  const normSet = new Set(luzhnikiSectorLookupNorms('vip c138'));
  const anchors = pbilet.filter((s) => normSet.has(normalizeSectorLabel(s.sector)));
  assert.ok(interpolatePbiletSeatGeodesy(anchors, 'VIP C 138', '6', '1'));
});

test('A101 layout-якоря', () => {
  const index = buildLabeledSeatIndex([
    { sector: 'Сектор A 101', row: '10', seat: '5', xPct: 18, yPct: 22 },
    { sector: 'Сектор A 101', row: '14', seat: '5', xPct: 20, yPct: 24 },
  ]);
  const anchors = collectLayoutSectorPbiletSeats(index, ['a101'], 'Сектор A 101');
  assert.ok(interpolatePbiletSeatGeodesy(anchors, 'Сектор A 101', '12', '5'));
});
