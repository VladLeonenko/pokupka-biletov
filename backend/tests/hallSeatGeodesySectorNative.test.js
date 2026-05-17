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

test('A101 row 11 Y follows pbilet SVG labels not row 32 band', async () => {
  const t = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tickets.json'), 'utf8'));
  const l = JSON.parse(fs.readFileSync(path.join(repoRoot, 'luzhniki.txt'), 'utf8'));
  const sec = t.sectors.find((s) => s.i === 'Сектор A 101');
  const coordsPath = path.join(repoRoot, 'luzhniki-pbilet-coordinates-fetched.json');
  if (!sec?.o || !fs.existsSync(coordsPath)) return;

  const coords = JSON.parse(fs.readFileSync(coordsPath, 'utf8'));
  const svg = await (await fetch(coords.bg)).text();
  const labels = parseSvgHallRowLabels(svg, 11413, 9676);
  const { buildSectorRowYPctCalibration, interpolateSvgRowYPct } = await import(
    '../utils/hallSeatGeodesyFromSvgRows.js'
  );
  const cal = buildSectorRowYPctCalibration(sec.o, labels, null, 11413, 9676);
  const y11 = interpolateSvgRowYPct(11, cal);
  const y32 = interpolateSvgRowYPct(32, cal);

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
  assert.ok(r11 && r1 && y11 != null && y32 != null);
  assert.ok(Math.abs(r11.yPct - y11) < 1.2, `row11 y=${r11.yPct} svg11=${y11}`);
  assert.ok(
    Math.abs(r11.yPct - y32) > Math.abs(r11.yPct - y11),
    `row11 must be nearer label 11 than 32`,
  );
  assert.ok(Math.abs(r11.yPct - r1.yPct) > 1.5);
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
  assert.ok(s1.xPct < s6.xPct && s6.xPct < s8.xPct, `seat1 x=${s1.xPct} seat6=${s6.xPct} seat8=${s8.xPct}`);
  assert.ok(s1.xPct < 84, 'seat 1 not on the right edge of sector');
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
