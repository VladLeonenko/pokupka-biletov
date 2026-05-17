import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractPbiletCoordinatesSeatDots } from '../utils/luzhnikiPbiletGeodesyExtract.js';
import { extractPbiletTicketSectorPaths } from '../utils/luzhnikiPbiletGeodesyExtract.js';
import {
  buildSellableSeatGeodesyLuzhniki,
  buildStadiumLayoutSeatsFromDotGrid,
  mergeLayoutSeatsPreferPbiletStrict,
} from '../utils/hallSeatGeodesyLuzhnikiGrid.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

test('buildStadiumLayoutSeatsFromDotGrid labels B147 row 11 seat 17', async () => {
  const W = 11413;
  const H = 9676;
  const t = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tickets.json'), 'utf8'));
  const l = JSON.parse(fs.readFileSync(path.join(repoRoot, 'luzhniki.txt'), 'utf8'));
  const coordsPath = path.join(repoRoot, 'luzhniki-pbilet-coordinates-fetched.json');
  if (!fs.existsSync(coordsPath)) return;
  const coords = JSON.parse(fs.readFileSync(coordsPath, 'utf8'));
  const svg = await (await fetch(coords.bg)).text();
  const cloud = extractPbiletCoordinatesSeatDots(l, W, H);
  const sectors = extractPbiletTicketSectorPaths(t);
  const grid = buildStadiumLayoutSeatsFromDotGrid({
    sectorPaths: sectors,
    allSeatCoordinates: cloud,
    svgMarkup: svg,
    hallWidth: W,
    hallHeight: H,
  });
  const hit = grid.find((s) => /b\s*147/i.test(s.sector) && s.row === '11' && s.seat === '17');
  assert.ok(hit, 'grid must contain B147 r11 s17');
  assert.equal(hit.geodesySource, 'grid');
});

test('B147 row 11 seat 17 sellable lookup from layout grid', async () => {
  const W = 11413;
  const H = 9676;
  const t = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tickets.json'), 'utf8'));
  const l = JSON.parse(fs.readFileSync(path.join(repoRoot, 'luzhniki.txt'), 'utf8'));
  const sec = t.sectors.find((s) => s.i === 'Сектор B 147');
  assert.ok(sec?.o);

  const coordsPath = path.join(repoRoot, 'luzhniki-pbilet-coordinates-fetched.json');
  if (!fs.existsSync(coordsPath)) return;
  const coords = JSON.parse(fs.readFileSync(coordsPath, 'utf8'));
  const svg = await (await fetch(coords.bg)).text();
  const cloud = extractPbiletCoordinatesSeatDots(l, W, H);
  const sectors = extractPbiletTicketSectorPaths(t);

  const grid = buildStadiumLayoutSeatsFromDotGrid({
    sectorPaths: sectors,
    allSeatCoordinates: cloud,
    svgMarkup: svg,
    hallWidth: W,
    hallHeight: H,
  });
  const layout = mergeLayoutSeatsPreferPbiletStrict([], grid);
  const offers = [{ Sector: 'сектор b147', Row: '11', SeatList: ['17'] }];
  const g = buildSellableSeatGeodesyLuzhniki({
    layoutSeats: layout,
    allSeatCoordinates: cloud,
    sectorPaths: sectors,
    hallWidth: W,
    hallHeight: H,
    offers,
    svgMarkup: svg,
  });

  const hit = g.seats.find((s) => s.row === '11' && s.seat === '17');
  assert.ok(hit, 'expected grid lookup hit');
  assert.equal(hit.geodesySource, 'grid');
  assert.equal(g.cloudMatched, 0);
});
