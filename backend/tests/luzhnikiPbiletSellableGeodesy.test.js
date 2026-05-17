import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildSellableSeatGeodesyPbiletAccurate } from '../utils/luzhnikiPbiletSellableGeodesy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ticketsPath = path.resolve(__dirname, '../../tickets.json');

const W = 11413;
const H = 9676;

test('a216 row 29: fieldGrid по оффер-ряду, не polar с уездом', () => {
  const ticketsPayload = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
  const { seats: layoutSeats } = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, '../data/luzhniki-geodesy/hand/bundle-luzhniki-stadium-pilot-seats.json'),
      'utf8',
    ),
  );
  const offers = [{ Sector: 'сектор a216', Row: '29', SeatList: ['21'] }];
  const { seats } = buildSellableSeatGeodesyPbiletAccurate(ticketsPayload, offers, {
    geodesy: { hallWidth: W, hallHeight: H },
    seats: Array.isArray(layoutSeats) ? layoutSeats : [],
  });
  assert.equal(seats.length, 1);
  assert.match(String(seats[0].geodesySource), /fieldGrid/);
  assert.ok(seats[0].yPct > 88 && seats[0].yPct < 92);
});

test('d232 row 31 seat 17: в bbox сектора', () => {
  const ticketsPayload = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
  const layoutSeats = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, '../data/luzhniki-geodesy/hand/bundle-luzhniki-stadium-pilot-seats.json'),
      'utf8',
    ),
  );
  const offers = [{ Sector: 'сектор d232', Row: '31', SeatList: ['17'] }];
  const { seats } = buildSellableSeatGeodesyPbiletAccurate(ticketsPayload, offers, {
    geodesy: { hallWidth: W, hallHeight: H },
    seats: layoutSeats,
  });
  assert.equal(seats.length, 1);
  assert.ok(seats[0].yPct >= 9 && seats[0].yPct <= 19, `yPct=${seats[0].yPct}`);
  assert.ok(seats[0].xPct >= 86 && seats[0].xPct <= 95, `xPct=${seats[0].xPct}`);
});

test('c243 row 35 seats 8–9: pbilet extrapolation, not fieldGrid on grass', () => {
  const ticketsPayload = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
  const offers = [{ Sector: 'сектор c243', Row: '35', SeatList: ['8', '9'] }];
  const layout = { geodesy: { hallWidth: W, hallHeight: H } };

  const { seats } = buildSellableSeatGeodesyPbiletAccurate(ticketsPayload, offers, layout);
  assert.equal(seats.length, 2);

  for (const s of seats) {
    assert.notEqual(s.geodesySource, 'fieldGridSnap', `${s.seat}: must not snap to bad fieldGrid`);
    const cy = (s.yPct / 100) * H;
    assert.ok(cy > 80, `${s.seat}: y=${cy.toFixed(0)} too close to field (fieldGrid ~61)`);
    assert.ok(cy < 250, `${s.seat}: y=${cy.toFixed(0)} should stay in upper stand band`);
  }

  const s8 = seats.find((s) => s.seat === '8');
  assert.ok(Math.abs(s8.xPct - 47.88) < 0.05, `seat 8 xPct≈47.88, got ${s8.xPct}`);
});
