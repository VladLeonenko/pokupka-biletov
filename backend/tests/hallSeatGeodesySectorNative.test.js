import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractPbiletCoordinatesSeatDots } from '../utils/luzhnikiPbiletGeodesyExtract.js';
import { buildSellableSeatGeodesyWithDots } from '../utils/hallSeatGeodesyFromDots.js';
import {
  computeFieldCenterPct,
  resolveOfferSeatSectorNativeLayout,
} from '../utils/hallSeatGeodesySectorNative.js';
import { parseSvgHallRowLabels } from '../utils/hallSeatGeodesyFromSvgRows.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

function sectorDotsForPath(cloud, pathD) {
  const norm = pathD.slice(0, 40);
  return cloud.filter((d) => d.sectorPath && d.sectorPath.startsWith(norm.slice(0, 20)));
}

test('seat index is left-to-right from field (A101 row 11)', async () => {
  const t = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tickets.json'), 'utf8'));
  const l = JSON.parse(fs.readFileSync(path.join(repoRoot, 'luzhniki.txt'), 'utf8'));
  const sec = t.sectors.find((s) => s.i === 'Сектор A 101');
  const coordsPath = path.join(repoRoot, 'luzhniki-pbilet-coordinates-fetched.json');
  if (!sec?.o || !fs.existsSync(coordsPath)) return;

  const coords = JSON.parse(fs.readFileSync(coordsPath, 'utf8'));
  const svg = await (await fetch(coords.bg)).text();
  const labels = parseSvgHallRowLabels(svg, 11413, 9676);
  const cloud = extractPbiletCoordinatesSeatDots(l, 11413, 9676);
  const field = computeFieldCenterPct(cloud);
  const sectorDots = cloud.filter((d) => d.sectorLabel === sec.i || d.sector === sec.i);
  const dots = sectorDots.length >= 24 ? sectorDots : cloud;

  const s6 = resolveOfferSeatSectorNativeLayout(11, 6, dots, sec.o, labels, 11413, 9676, field);
  const s7 = resolveOfferSeatSectorNativeLayout(11, 7, dots, sec.o, labels, 11413, 9676, field);
  assert.ok(s6 && s7);
  assert.ok(s7.xPct > s6.xPct || s7.yPct !== s6.yPct);
});

test('row 11 farther from field than row 1 for A101', async () => {
  const t = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tickets.json'), 'utf8'));
  const l = JSON.parse(fs.readFileSync(path.join(repoRoot, 'luzhniki.txt'), 'utf8'));
  const sec = t.sectors.find((s) => s.i === 'Сектор A 101');
  const coordsPath = path.join(repoRoot, 'luzhniki-pbilet-coordinates-fetched.json');
  if (!sec?.o || !fs.existsSync(coordsPath)) return;

  const coords = JSON.parse(fs.readFileSync(coordsPath, 'utf8'));
  const svg = await (await fetch(coords.bg)).text();
  const cloud = extractPbiletCoordinatesSeatDots(l, 11413, 9676);
  const offers = [
    { Sector: 'сектор a101', Row: '11', SeatList: ['6'] },
    { Sector: 'сектор a101', Row: '1', SeatList: ['1'] },
  ];
  const g = buildSellableSeatGeodesyWithDots(
    [],
    cloud,
    [{ label: sec.i, path: sec.o }],
    11413,
    9676,
    offers,
    svg,
  );
  const r11 = g.seats.find((s) => s.row === '11' && s.seat === '6');
  const r1 = g.seats.find((s) => s.row === '1' && s.seat === '1');
  assert.ok(r11 && r1);
  assert.ok(r11.yPct > r1.yPct && r11.yPct < 84, `row1 y=${r1.yPct} row11 y=${r11.yPct}`);
  assert.ok(r11.yPct < 82, 'row 11 not in bottom bands');
});
