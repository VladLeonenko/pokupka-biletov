import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

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
  const { parseSvgHallRowLabels, resolveRowYPctFromSvgLabels } = await import(
    '../utils/hallSeatGeodesyFromSvgRows.js'
  );
  const { pathBBox } = await import('../utils/hallSeatGeodesyFromDots.js');
  const { computeFieldCenterPct } = await import('../utils/hallSeatGeodesySectorNative.js');
  const { extractPbiletCoordinatesSeatDots } = await import('../utils/luzhnikiPbiletGeodesyExtract.js');
  const row = await loadLuzhnikiFootballStageMapRow();
  const layout =
    typeof row.layout_json === 'string' ? JSON.parse(row.layout_json) : row.layout_json;
  const sec = ticketsPayload.sectors.find((s) => s.i === 'Сектор A 101');
  const offers = [
    { Sector: 'сектор a101', Row: '11', SeatList: ['7', '8', '9'] },
    { Sector: 'сектор a101', Row: '35', SeatList: ['26', '27'] },
  ];
  const { seats, radialGridMatched } = buildSellableSeatGeodesyPbiletAccurate(
    ticketsPayload,
    offers,
    layout,
    { svgMarkup: row.svg_markup },
  );
  assert.equal(seats.length, 5);
  assert.equal(radialGridMatched, 5);
  assert.ok(seats.every((s) => String(s.geodesySource).includes('radialGrid')));
  assert.ok(!seats.some((s) => String(s.geodesySource).includes('fieldGrid')));

  const labels = parseSvgHallRowLabels(row.svg_markup, W, H);
  const cloud = extractPbiletCoordinatesSeatDots(
    JSON.parse(fs.readFileSync(path.join(repoRoot, 'luzhniki.txt'), 'utf8')),
    W,
    H,
  );
  const b = pathBBox(sec.o);
  const sectorDots = cloud.filter((d) => {
    const x = (d.xPct / 100) * W;
    const y = (d.yPct / 100) * H;
    return x >= b.minX - 50 && x <= b.maxX + 50 && y >= b.minY - 50 && y <= b.maxY + 50;
  });
  const field = computeFieldCenterPct(cloud);
  const y11 = resolveRowYPctFromSvgLabels(11, sec.o, labels, W, H, 18, field, sectorDots);
  const y33 = resolveRowYPctFromSvgLabels(33, sec.o, labels, W, H, 18, field, sectorDots);
  const r11 = seats.find((s) => s.row === '11' && s.seat === '7');
  assert.ok(r11 && y11 != null && y33 != null);
  assert.ok(
    Math.abs(r11.yPct - y11) < Math.abs(r11.yPct - y33),
    `row11 y=${r11.yPct} should be nearer svg row11 y=${y11} than row33 y=${y33}`,
  );
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
