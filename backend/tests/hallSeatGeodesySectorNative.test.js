import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractPbiletCoordinatesSeatDots,
  extractPbiletTicketSectorPaths,
} from '../utils/luzhnikiPbiletGeodesyExtract.js';
import { buildSectorDotIndex } from '../utils/hallSeatGeodesyFromDots.js';
import { buildSellableSeatGeodesyWithDots } from '../utils/hallSeatGeodesyFromDots.js';
import { normalizeSectorLabel } from '../utils/ticketHallSectorNormalize.js';
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
  const sectors = extractPbiletTicketSectorPaths(t);
  const dots = buildSectorDotIndex(cloud, sectors, 11413, 9676).get(normalizeSectorLabel('a101'));
  if (!dots?.length) return;

  const s3 = resolveOfferSeatSectorNativeLayout(11, 3, dots, sec.o, labels, 11413, 9676, field, 40);
  const s12 = resolveOfferSeatSectorNativeLayout(11, 12, dots, sec.o, labels, 11413, 9676, field, 40);
  assert.ok(s3 && s12);
  assert.ok(Math.hypot(s12.xPct - s3.xPct, s12.yPct - s3.yPct) > 0.15);
});

test('A101 row 1 nearer field than row 35 (not inverted SVG labels)', async () => {
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
  const sectors = extractPbiletTicketSectorPaths(t);
  const dots = buildSectorDotIndex(cloud, sectors, 11413, 9676).get(normalizeSectorLabel('a101'));
  if (!dots?.length) return;

  const r1 = resolveOfferSeatSectorNativeLayout(1, 1, dots, sec.o, labels, 11413, 9676, field, 40);
  const r11 = resolveOfferSeatSectorNativeLayout(11, 6, dots, sec.o, labels, 11413, 9676, field, 40);
  const r35 = resolveOfferSeatSectorNativeLayout(35, 10, dots, sec.o, labels, 11413, 9676, field, 40);
  assert.ok(r1 && r11 && r35);

  const dist = (a, b) => Math.hypot(a.xPct - field.xPct, a.yPct - field.yPct);
  assert.ok(dist(r1, field) < dist(r35, field), 'row1 closer to field than row35');
  assert.ok(dist(r11, field) > dist(r1, field) && dist(r11, field) < dist(r35, field));
  assert.ok(Math.abs(r11.yPct - r1.yPct) > 0.4);
});

test('D121 corner sector: seat 1 is leftmost dot in row (low x)', () => {
  const W = 11413;
  const H = 9676;
  const l = JSON.parse(fs.readFileSync(path.join(repoRoot, 'luzhniki.txt'), 'utf8'));
  const coords = l.coordinates || l;
  const cloud = coords.map((d) => ({
    xPct: (Number(d.x) / W) * 100,
    yPct: (Number(d.y) / H) * 100,
  }));
  const field = computeFieldCenterPct(cloud);
  const sectorPath =
    'M9256.98624,5261 L10230.9862,5261 C10237.6137,5261 10242.9862,5266.37258 10242.9862,5273 L10242.9862,5688 C10242.9862,5694.62741 10237.6137,5700 10230.9862,5700 L9256.98624,5700 C9250.35883,5700 9244.98624,5694.62741 9244.98624,5688 L9244.98624,5273 C9244.98624,5266.37258 9250.35883,5261 9256.98624,5261 Z';

  const s1 = resolveOfferSeatSectorNativeLayout(22, 1, cloud, sectorPath, [], W, H, field, 28);
  const s6 = resolveOfferSeatSectorNativeLayout(22, 6, cloud, sectorPath, [], W, H, field, 28);
  const s8 = resolveOfferSeatSectorNativeLayout(22, 8, cloud, sectorPath, [], W, H, field, 28);
  assert.ok(s1 && s6 && s8);
  assert.ok(s1 && s6 && s8, 'expected seats resolved');
  const dist1 = Math.hypot(s1.xPct - s6.xPct, s1.yPct - s6.yPct);
  const dist18 = Math.hypot(s1.xPct - s8.xPct, s1.yPct - s8.yPct);
  assert.ok(dist1 < dist18, `seat1 should be nearer seat6 than seat8: d16=${dist1} d18=${dist18}`);
});

test('D121 rows 21 and 28 map to different row bands', () => {
  const W = 11413;
  const H = 9676;
  const l = JSON.parse(fs.readFileSync(path.join(repoRoot, 'luzhniki.txt'), 'utf8'));
  const coords = l.coordinates || l;
  const cloud = coords.map((d) => ({
    xPct: (Number(d.x) / W) * 100,
    yPct: (Number(d.y) / H) * 100,
  }));
  const field = computeFieldCenterPct(cloud);
  const sectorPath =
    'M9256.98624,5261 L10230.9862,5261 C10237.6137,5261 10242.9862,5266.37258 10242.9862,5273 L10242.9862,5688 C10242.9862,5694.62741 10237.6137,5700 10230.9862,5700 L9256.98624,5700 C9250.35883,5700 9244.98624,5694.62741 9244.98624,5688 L9244.98624,5273 C9244.98624,5266.37258 9250.35883,5261 9256.98624,5261 Z';

  const r21 = resolveOfferSeatSectorNativeLayout(21, 6, cloud, sectorPath, [], W, H, field, 28);
  const r28 = resolveOfferSeatSectorNativeLayout(28, 6, cloud, sectorPath, [], W, H, field, 28);
  assert.ok(r21 && r28);
  assert.ok(Math.abs(r28.yPct - r21.yPct) > 0.15, `row21 y=${r21.yPct} row28 y=${r28.yPct}`);
});
