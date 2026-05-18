import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildLabeledSeatIndex } from '../utils/hallSeatGeodesyMatch.js';
import { buildSellableSeatGeodesyPbiletAccurate } from '../utils/luzhnikiPbiletSellableGeodesy.js';
import { extractPbiletCoordinatesSeatDots } from '../utils/luzhnikiPbiletGeodesyExtract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const ticketsPath = path.join(repoRoot, 'tickets.json');
const W = 11413;
const H = 9676;

test('a101: layout.seats с fieldGrid не блокирует cloudRowSeat для ряда 11', () => {
  const ticketsPayload = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
  const cloud = extractPbiletCoordinatesSeatDots(
    JSON.parse(fs.readFileSync(path.join(repoRoot, 'luzhniki.txt'), 'utf8')),
    W,
    H,
  );
  const poisonedLayoutSeats = [
    {
      sector: 'Сектор A 101',
      row: '11',
      seat: '7',
      xPct: 99,
      yPct: 99,
      geodesySource: 'fieldGrid',
    },
    {
      sector: 'Сектор A 101',
      row: '11',
      seat: '8',
      xPct: 99,
      yPct: 99,
      geodesySource: 'fieldGrid',
    },
  ];
  const layoutIndex = buildLabeledSeatIndex(poisonedLayoutSeats);
  assert.ok(lookupPoison(layoutIndex, 'сектор a101', '11', '7'));

  const offers = [{ Sector: 'сектор a101', Row: '11', SeatList: ['7', '8'] }];
  const { seats, cloudRowSeatMatched, radialGridMatched, pbiletLabeledMatched } =
    buildSellableSeatGeodesyPbiletAccurate(
      ticketsPayload,
      offers,
      {
        geodesy: { hallWidth: W, hallHeight: H },
        allSeatCoordinates: cloud,
        seats: poisonedLayoutSeats,
      },
      { svgMarkup: '' },
    );

  assert.equal(seats.length, 2);
  assert.ok(cloudRowSeatMatched + radialGridMatched >= 2, 'cloud or radial, not poisoned layout');
  assert.equal(pbiletLabeledMatched, 0);
  assert.ok(seats.every((s) => s.yPct < 90 && s.xPct < 50));
});

function lookupPoison(index, sector, row, seat) {
  for (const s of index.values()) {
    if (s.row === row && s.seat === seat) return s;
  }
  return null;
}
