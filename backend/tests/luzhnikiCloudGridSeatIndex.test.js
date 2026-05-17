import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'url';

import {
  buildLuzhnikiCloudGridIndex,
  buildSellableSeatGeodesyCloudGridSnap,
  resolveCloudGridSeat,
} from '../utils/luzhnikiCloudGridSeatIndex.js';
import { normalizeSectorLabel } from '../utils/ticketHallSectorNormalize.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('cloud grid: D230 row 24 seats 8-11 — разные координаты и стабильный порядок', () => {
  const coords = JSON.parse(fs.readFileSync(path.join(repoRoot, 'luzhniki.txt'), 'utf8'));
  const tickets = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tickets.json'), 'utf8'));
  const index = buildLuzhnikiCloudGridIndex({
    ticketsPayload: tickets,
    coordinatesPayload: coords,
  });

  const norm = 'd230';
  const grid = index.gridsByNorm.get(norm);
  const cal = index.calibrationsByNorm.get(norm);
  assert.ok(grid, 'D230 grid');
  assert.ok(cal?.rowPairs?.length >= 2, 'row calibration from strict rows 26/28/30/32');

  const hits = ['8', '9', '10', '11'].map((seat) =>
    resolveCloudGridSeat(grid, cal, '24', seat),
  );
  assert.ok(hits.every(Boolean), 'row 24 resolved');
  const xs = hits.map((h) => h.xPct);
  assert.ok(new Set(xs).size >= 3, 'seats spread along row');
  assert.ok(hits[0].xPct !== hits[3].xPct || hits[0].yPct !== hits[3].yPct);

  const r26 = resolveCloudGridSeat(grid, cal, '26', '8');
  const r28 = resolveCloudGridSeat(grid, cal, '28', '8');
  assert.ok(r26 && r28);
  assert.notDeepEqual(r26, r28, 'row 24 between 26 and 28 in grid space');
});

test('cloud grid sellable: VIP C138 polar fallback', () => {
  const coords = JSON.parse(fs.readFileSync(path.join(repoRoot, 'luzhniki.txt'), 'utf8'));
  const tickets = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tickets.json'), 'utf8'));
  const offers = [
    {
      Sector: 'VIP C 138',
      Row: '6',
      SeatList: ['1', '2'],
    },
  ];
  const g = buildSellableSeatGeodesyCloudGridSnap(tickets, offers, {
    _coordinatesPayload: coords,
  });
  assert.equal(g.matched, 2);
  assert.ok(g.polarMatched >= 1 || g.cloudGridMatched >= 1);
});
