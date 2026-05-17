import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractPbiletTicketsSeatGeodesy } from '../utils/luzhnikiPbiletGeodesyExtract.js';
import {
  buildSellableSeatGeodesyFromSvgCircles,
  countSvgNativeSeatCircles,
  injectPbiletSeatsIntoSvg,
  parseSvgNativeSeatCircles,
} from '../utils/hallSeatGeodesyFromSvgCircles.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

test('pbilet Luzhniki bg SVG has no native seat circles', async () => {
  const coordsPath = path.join(repoRoot, 'luzhniki-pbilet-coordinates-fetched.json');
  if (!fs.existsSync(coordsPath)) return;
  const coords = JSON.parse(fs.readFileSync(coordsPath, 'utf8'));
  const svg = await (await fetch(coords.bg)).text();
  assert.equal(countSvgNativeSeatCircles(svg), 0);
});

test('inject tickets seats then parse circles', async () => {
  const W = 11413;
  const H = 9676;
  const t = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tickets.json'), 'utf8'));
  const seats = extractPbiletTicketsSeatGeodesy(t, W, H).slice(0, 5);
  const bg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 11413 9676"><rect width="100%" height="100%" fill="#eee"/></svg>';
  const { svgMarkup, embedded, count } = injectPbiletSeatsIntoSvg(bg, seats, W, H);
  assert.equal(embedded, true);
  assert.equal(count, 5);
  const parsed = parseSvgNativeSeatCircles(svgMarkup, W, H);
  assert.equal(parsed.length, 5);
  assert.equal(parsed[0].sector, seats[0].sector);
});

test('sellable A101 row 11 uses svgCircle coords from injected SVG', async () => {
  const W = 11413;
  const H = 9676;
  const t = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tickets.json'), 'utf8'));
  const sec = t.sectors.find((s) => s.i === 'Сектор A 101');
  if (!sec?.r?.length) return;

  const allSeats = extractPbiletTicketsSeatGeodesy(t, W, H);
  const coordsPath = path.join(repoRoot, 'luzhniki-pbilet-coordinates-fetched.json');
  if (!fs.existsSync(coordsPath)) return;
  const coords = JSON.parse(fs.readFileSync(coordsPath, 'utf8'));
  const bg = await (await fetch(coords.bg)).text();
  const { svgMarkup } = injectPbiletSeatsIntoSvg(bg, allSeats, W, H);

  const offers = [{ Sector: 'сектор a101', Row: '11', SeatList: ['6'] }];
  const g = buildSellableSeatGeodesyFromSvgCircles(svgMarkup, allSeats, offers, W, H);
  const hit = g.seats.find((s) => s.row === '11' && s.seat === '6');
  const labeled = allSeats.find(
    (s) => s.sector === 'Сектор A 101' && String(s.row) === '11' && String(s.seat) === '6',
  );
  assert.ok(hit && labeled);
  assert.equal(hit.geodesySource, 'svgCircle');
  assert.ok(Math.abs(hit.xPct - labeled.xPct) < 0.05);
  assert.ok(Math.abs(hit.yPct - labeled.yPct) < 0.05);
});
