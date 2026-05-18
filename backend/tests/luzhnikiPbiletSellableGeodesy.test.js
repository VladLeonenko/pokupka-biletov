import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { extractPbiletCoordinatesSeatDots } from '../utils/luzhnikiPbiletGeodesyExtract.js';
import { buildSellableSeatGeodesyPbiletAccurate } from '../utils/luzhnikiPbiletSellableGeodesy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const ticketsPath = path.resolve(repoRoot, 'tickets.json');

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

test('a101: radialGrid по 4 углам, ряд 11 ближе к подписи SVG чем к ряду 33', async () => {
  const ticketsPayload = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
  const { loadLuzhnikiFootballStageMapRow } = await import('../services/luzhnikiFootballStageMap.js');
  const { extractPbiletCoordinatesSeatDots } = await import('../utils/luzhnikiPbiletGeodesyExtract.js');
  const row = await loadLuzhnikiFootballStageMapRow();
  const layout =
    typeof row.layout_json === 'string' ? JSON.parse(row.layout_json) : row.layout_json;
  const offers = [
    { Sector: 'сектор a101', Row: '11', SeatList: ['7', '8', '9'] },
    { Sector: 'сектор a101', Row: '35', SeatList: ['26', '27'] },
  ];
  const coords = extractPbiletCoordinatesSeatDots(
    JSON.parse(fs.readFileSync(path.join(repoRoot, 'luzhniki.txt'), 'utf8')),
    W,
    H,
  );
  const layoutWithCloud = { ...layout, allSeatCoordinates: coords };
  const { seats, radialGridMatched, grayCloudMatched, pbiletLabeledMatched } =
    buildSellableSeatGeodesyPbiletAccurate(ticketsPayload, offers, layoutWithCloud, {
      svgMarkup: row.svg_markup,
    });
  assert.equal(seats.length, 5);
  assert.equal(grayCloudMatched, 5);
  assert.equal(pbiletLabeledMatched, 0);
  assert.ok(seats.every((s) => String(s.geodesySource).includes('grayCloud')));
  assert.ok(!seats.some((s) => String(s.geodesySource).includes('fieldGrid')));

  const r11seats = seats.filter((s) => s.row === '11');
  const r35seats = seats.filter((s) => s.row === '35');
  const r11 = r11seats.find((s) => s.seat === '7');
  assert.ok(r11);
  assert.ok(String(r11.geodesySource).includes('grayCloud'));
  const uniq = new Set(r11seats.map((s) => `${s.xPct.toFixed(4)},${s.yPct.toFixed(4)}`));
  assert.equal(uniq.size, r11seats.length, 'row11 seats on distinct gray dots');
  const y11avg = r11seats.reduce((a, s) => a + s.yPct, 0) / r11seats.length;
  const y35avg = r35seats.reduce((a, s) => a + s.yPct, 0) / r35seats.length;
  assert.ok(
    y11avg < y35avg,
    `row11 avg y=${y11avg} should be closer to field than row35 avg y=${y35avg}`,
  );
});

test('b156 row 20: radialGrid+d124step, ряд 20 дальше от поля чем 19', async () => {
  const ticketsPayload = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
  const { loadLuzhnikiFootballStageMapRow } = await import('../services/luzhnikiFootballStageMap.js');
  const row = await loadLuzhnikiFootballStageMapRow();
  const layout =
    typeof row.layout_json === 'string' ? JSON.parse(row.layout_json) : row.layout_json;
  const offers = [
    { Sector: 'сектор b156', Row: '19', SeatList: ['8', '9', '10'] },
    { Sector: 'сектор b156', Row: '20', SeatList: ['8', '9', '10', '11', '12'] },
  ];
  const { seats, radialGridMatched, pbiletLabeledMatched } = buildSellableSeatGeodesyPbiletAccurate(
    ticketsPayload,
    offers,
    layout,
    { svgMarkup: row.svg_markup },
  );
  assert.equal(seats.length, 8);
  assert.equal(radialGridMatched + pbiletLabeledMatched, 8);
  assert.ok(
    seats.every((s) => /radialGrid|pbiletLabeled/.test(String(s.geodesySource))),
  );
  assert.ok(!seats.some((s) => String(s.geodesySource) === 'axisGrid'));

  const r19 = seats.filter((s) => s.row === '19');
  const r20 = seats.filter((s) => s.row === '20');
  const y19 = r19.reduce((a, s) => a + s.yPct, 0) / r19.length;
  const y20 = r20.reduce((a, s) => a + s.yPct, 0) / r20.length;
  assert.ok(y20 > y19, `row20 y=${y20} should exceed row19 y=${y19}`);

  const row20 = [...r20].sort((a, b) => Number(a.seat) - Number(b.seat));
  const xs = row20.map((s) => s.xPct);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 0.05, 'дуга ряда 20 — места разведены по X');
});

test('b155 row 20: radialGrid+d124step, не axisGrid', async () => {
  const ticketsPayload = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
  const { loadLuzhnikiFootballStageMapRow } = await import('../services/luzhnikiFootballStageMap.js');
  const row = await loadLuzhnikiFootballStageMapRow();
  const layout =
    typeof row.layout_json === 'string' ? JSON.parse(row.layout_json) : row.layout_json;
  const offers = [
    { Sector: 'сектор b155', Row: '20', SeatList: ['8', '9', '10', '11', '12'] },
  ];
  const { seats, radialGridMatched, pbiletLabeledMatched } = buildSellableSeatGeodesyPbiletAccurate(
    ticketsPayload,
    offers,
    layout,
    { svgMarkup: row.svg_markup },
  );
  assert.equal(seats.length, 5);
  assert.equal(radialGridMatched + pbiletLabeledMatched, 5);
  assert.ok(
    seats.every((s) => /radialGrid|pbiletLabeled/.test(String(s.geodesySource))),
  );
  const bySeat = [...seats].sort((a, b) => Number(a.seat) - Number(b.seat));
  const ys = bySeat.map((s) => s.yPct);
  assert.ok(Math.max(...ys) - Math.min(...ys) > 0.05, 'дуга ряда — Y не константа как axisGrid');
});

test('a101 row 35 seat 3: cloudRowSeat или radial (prod fieldGrid не pbiletLabeled)', async () => {
  const ticketsPayload = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
  const cloud = extractPbiletCoordinatesSeatDots(
    JSON.parse(fs.readFileSync(path.join(repoRoot, 'luzhniki.txt'), 'utf8')),
    W,
    H,
  );
  const offers = [{ Sector: 'сектор a101', Row: '35', SeatList: ['3'] }];
  const { seats, grayCloudMatched, pbiletLabeledMatched } =
    buildSellableSeatGeodesyPbiletAccurate(ticketsPayload, offers, {
      geodesy: { hallWidth: W, hallHeight: H },
      allSeatCoordinates: cloud,
    });
  assert.equal(seats.length, 1);
  assert.equal(pbiletLabeledMatched, 0);
  assert.equal(grayCloudMatched, 1);
  assert.ok(String(seats[0].geodesySource).includes('grayCloud'));
});

test('b154 row 17: axisGrid (прорезь 16–27), линия ряда как d124', async () => {
  const ticketsPayload = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
  const { loadLuzhnikiFootballStageMapRow } = await import('../services/luzhnikiFootballStageMap.js');
  const row = await loadLuzhnikiFootballStageMapRow();
  const layout =
    typeof row.layout_json === 'string' ? JSON.parse(row.layout_json) : row.layout_json;
  const offers = [
  { Sector: 'сектор b154', Row: '17', SeatList: ['4', '5', '6', '7', '8', '9', '10', '12'] },
  ];
  const { seats } = buildSellableSeatGeodesyPbiletAccurate(ticketsPayload, offers, layout, {
    svgMarkup: row.svg_markup,
  });
  assert.equal(seats.length, 8);
  assert.match(String(seats[0].geodesySource), /axisGrid/);
  const bySeat = [...seats].sort((a, b) => Number(a.seat) - Number(b.seat));
  const ys = bySeat.map((s) => s.yPct);
  assert.ok(Math.max(...ys) - Math.min(...ys) < 1.2, 'one row (Y stable), not diagonal');
  for (let i = 1; i < bySeat.length; i += 1) {
    const step = Math.hypot(
      bySeat[i].xPct - bySeat[i - 1].xPct,
      bySeat[i].yPct - bySeat[i - 1].yPct,
    );
    assert.ok(step > 0.01, `seat ${bySeat[i].seat} spaced from prev`);
  }
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
