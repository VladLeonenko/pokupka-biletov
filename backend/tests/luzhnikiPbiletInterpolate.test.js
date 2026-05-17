import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractPbiletTicketsSeatGeodesy,
  interpolatePbiletSeatGeodesy,
} from '../utils/luzhnikiPbiletGeodesyExtract.js';

test('interpolatePbiletSeatGeodesy: row 24 не совпадает с row 28 (layout grid bug)', () => {
  const tickets = {
    sectors: [
      {
        i: 'Сектор D 230',
        r: [
          {
            i: '26',
            s: [
              { i: '8', x: 10900, y: 2126 },
              { i: '2', x: 10870, y: 2006 },
            ],
          },
          {
            i: '28',
            s: [
              { i: '8', x: 10940, y: 2108 },
              { i: '2', x: 10910, y: 1990 },
            ],
          },
        ],
      },
    ],
  };
  const pbilet = extractPbiletTicketsSeatGeodesy(tickets, 11413, 9676);
  const r24 = interpolatePbiletSeatGeodesy(pbilet, 'Сектор D 230', '24', '8');
  const r28 = interpolatePbiletSeatGeodesy(pbilet, 'Сектор D 230', '28', '8');
  assert.ok(r24);
  assert.ok(r28);
  assert.notDeepEqual(
    { x: +r24.xPct.toFixed(2), y: +r24.yPct.toFixed(2) },
    { x: +r28.xPct.toFixed(2), y: +r28.yPct.toFixed(2) },
  );
});
