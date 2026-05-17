import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractPbiletCoordinatesSeatDots,
  extractPbiletTicketSectorPaths,
} from '../utils/luzhnikiPbiletGeodesyExtract.js';
import { pathBBox } from '../utils/hallSeatGeodesyFromDots.js';
import { computeFieldCenterPct } from '../utils/hallSeatGeodesySectorNative.js';
import { buildSellableSeatGeodesyWithDots } from '../utils/hallSeatGeodesyFromDots.js';
import { parseSvgHallRowLabels, resolveRowYPctFromSvgLabels } from '../utils/hallSeatGeodesyFromSvgRows.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

test('parseSvgHallRowLabels finds numeric row tspans', async () => {
  const coordsPath = path.join(repoRoot, 'luzhniki-pbilet-coordinates-fetched.json');
  if (!fs.existsSync(coordsPath)) return;
  const coords = JSON.parse(fs.readFileSync(coordsPath, 'utf8'));
  const bg = String(coords.bg ?? '');
  if (!bg) return;
  const svg = await (await fetch(bg)).text();
  const labels = parseSvgHallRowLabels(svg, coords.width, coords.height);
  assert.ok(labels.length >= 4000);
  assert.ok(labels.some((l) => l.row === 11));
});

test('A101 row 11 Y from SVG differs from row 1', async () => {
  const t = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tickets.json'), 'utf8'));
  const sec = t.sectors.find((s) => s.i === 'Сектор A 101');
  assert.ok(sec?.o);
  const coordsPath = path.join(repoRoot, 'luzhniki-pbilet-coordinates-fetched.json');
  if (!fs.existsSync(coordsPath)) return;
  const coords = JSON.parse(fs.readFileSync(coordsPath, 'utf8'));
  const svg = await (await fetch(coords.bg)).text();
  const labels = parseSvgHallRowLabels(svg, 11413, 9676);
  const l = JSON.parse(fs.readFileSync(path.join(repoRoot, 'luzhniki.txt'), 'utf8'));
  const cloud = extractPbiletCoordinatesSeatDots(l, 11413, 9676);
  const b = pathBBox(sec.o);
  const sectorDots = cloud.filter((d) => {
    const x = (d.xPct / 100) * 11413;
    const y = (d.yPct / 100) * 9676;
    return x >= b.minX - 50 && x <= b.maxX + 50 && y >= b.minY - 50 && y <= b.maxY + 50;
  });
  const field = computeFieldCenterPct(cloud);
  const y11 = resolveRowYPctFromSvgLabels(11, sec.o, labels, 11413, 9676, 18, field, sectorDots);
  const y1 = resolveRowYPctFromSvgLabels(1, sec.o, labels, 11413, 9676, 18, field, sectorDots);
  assert.ok(y11 != null && y1 != null);
  assert.ok(Math.abs(y11 - y1) > 1.5);
});

test('buildSellableSeatGeodesyWithDots uses svgRow for A101', async () => {
  const t = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tickets.json'), 'utf8'));
  const l = JSON.parse(fs.readFileSync(path.join(repoRoot, 'luzhniki.txt'), 'utf8'));
  const sec = t.sectors.find((s) => s.i === 'Сектор A 101');
  const coordsPath = path.join(repoRoot, 'luzhniki-pbilet-coordinates-fetched.json');
  if (!fs.existsSync(coordsPath)) return;
  const coords = JSON.parse(fs.readFileSync(coordsPath, 'utf8'));
  const svg = await (await fetch(coords.bg)).text();
  const cloud = extractPbiletCoordinatesSeatDots(l, 11413, 9676);
  const sectorPaths = extractPbiletTicketSectorPaths(t);
  const offers = [
    { Sector: 'сектор a101', Row: '11', SeatList: ['6'] },
    { Sector: 'сектор a101', Row: '1', SeatList: ['1'] },
  ];
  const g = buildSellableSeatGeodesyWithDots(
    [],
    cloud,
    sectorPaths,
    11413,
    9676,
    offers,
    svg,
  );
  const r11 = g.seats.find((s) => s.row === '11' && s.seat === '6');
  const r1 = g.seats.find((s) => s.row === '1' && s.seat === '1');
  assert.equal(r11?.geodesySource, 'svgRow');
  assert.ok(r11 && r1);
  assert.ok(r11.yPct > r1.yPct + 0.8, `row11 y=${r11.yPct} row1 y=${r1.yPct}`);
});
