import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { pathBBox } from '../utils/hallSeatGeodesyFromDots.js';
import { parseSvgHallRowLabels } from '../utils/hallSeatGeodesyFromSvgRows.js';
import { extractPbiletCoordinatesSeatDots } from '../utils/luzhnikiPbiletGeodesyExtract.js';
import { buildSellableSeatGeodesyPbiletAccurate } from '../utils/luzhnikiPbiletSellableGeodesy.js';
import {
  buildSectorCloudRowSeatIndex,
  resolveSectorCloudRowSeat,
  trySectorCloudRowSeatForRadial,
} from '../utils/luzhnikiSectorCloudRowSeat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const ticketsPath = path.join(repoRoot, 'tickets.json');
const W = 11413;
const H = 9676;

test('a101 cloudRowSeat: ряд 11 seat 7 ближе к SVG row11, чем radial-only', async () => {
  const ticketsPayload = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
  const sec = ticketsPayload.sectors.find((s) => s.i === 'Сектор A 101');
  assert.ok(sec?.o);
  const coords = JSON.parse(fs.readFileSync(path.join(repoRoot, 'luzhniki.txt'), 'utf8'));
  const cloud = extractPbiletCoordinatesSeatDots(coords, W, H);
  const labels = parseSvgHallRowLabels(
    fs.readFileSync(path.join(repoRoot, 'backend/data/luzhniki-geodesy/hand/sector-luzhniki-stadium-pilot.svg'), 'utf8'),
    W,
    H,
  );

  const index = buildSectorCloudRowSeatIndex({
    cloudDots: cloud,
    sectorPaths: [{ label: 'Сектор A 101', path: sec.o }],
    hallWidth: W,
    hallHeight: H,
    svgRowLabels: labels,
    sectorRowMaxByNorm: new Map([['a101', 40]]),
  });
  const entry = index.byNorm.get('a101');
  assert.ok(entry, 'a101 index built');

  const hit = resolveSectorCloudRowSeat(entry, '11', '7', { min: 1, max: 39 });
  assert.ok(hit, 'cloud row/seat resolved');
  assert.match(String(hit.geodesySource), /cloudRowSeat/);

  const b = pathBBox(sec.o);
  const sectorDots = cloud.filter((d) => {
    const x = (d.xPct / 100) * W;
    const y = (d.yPct / 100) * H;
    return x >= b.minX - 50 && x <= b.maxX + 50 && y >= b.minY - 50 && y <= b.maxY + 50;
  });
  assert.ok(sectorDots.length > 100);

  const { resolveRowYPctFromSvgLabels } = await import('../utils/hallSeatGeodesyFromSvgRows.js');
  const { computeFieldCenterPct } = await import('../utils/hallSeatGeodesySectorNative.js');
  const field = computeFieldCenterPct(cloud);
  const y11 = resolveRowYPctFromSvgLabels(11, sec.o, labels, W, H, 18, field, sectorDots);
  const y33 = resolveRowYPctFromSvgLabels(33, sec.o, labels, W, H, 18, field, sectorDots);
  assert.ok(y11 != null && y33 != null);
  assert.ok(
    Math.abs(hit.yPct - y11) < Math.abs(hit.yPct - y33),
    `row11 cloud y=${hit.yPct} nearer svg y11=${y11} than y33=${y33}`,
  );
});

test('a101 sellable: cloudRowSeat для ряда 11 при allSeatCoordinates', async () => {
  const ticketsPayload = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
  const coords = JSON.parse(fs.readFileSync(path.join(repoRoot, 'luzhniki.txt'), 'utf8'));
  const cloud = extractPbiletCoordinatesSeatDots(coords, W, H);
  const offers = [
    { Sector: 'сектор a101', Row: '11', SeatList: ['7', '8'] },
    { Sector: 'сектор a101', Row: '35', SeatList: ['3'] },
  ];
  const { seats, grayCloudMatched, pbiletLabeledMatched } =
    buildSellableSeatGeodesyPbiletAccurate(
    ticketsPayload,
    offers,
    { geodesy: { hallWidth: W, hallHeight: H }, allSeatCoordinates: cloud },
    {
      svgMarkup: fs.readFileSync(
        path.join(repoRoot, 'backend/data/luzhniki-geodesy/hand/sector-luzhniki-stadium-pilot.svg'),
        'utf8',
      ),
    },
  );
  assert.equal(seats.length, 3);
  assert.equal(grayCloudMatched, 3);
  assert.equal(pbiletLabeledMatched, 0);
  assert.ok(seats.every((s) => String(s.geodesySource).includes('grayCloud')));
  const r11 = seats.filter((s) => s.row === '11');
  const uniq11 = new Set(r11.map((s) => `${s.xPct},${s.yPct}`));
  assert.equal(uniq11.size, r11.length, 'row11 seats on distinct gray dots');
});

test('trySectorCloudRowSeatForRadial: не nearest-dot в чужом ряду', () => {
  const ticketsPayload = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
  const sec = ticketsPayload.sectors.find((s) => s.i === 'Сектор A 101');
  const coords = JSON.parse(fs.readFileSync(path.join(repoRoot, 'luzhniki.txt'), 'utf8'));
  const cloud = extractPbiletCoordinatesSeatDots(coords, W, H);
  const index = buildSectorCloudRowSeatIndex({
    cloudDots: cloud,
    sectorPaths: [{ label: 'Сектор A 101', path: sec.o }],
    hallWidth: W,
    hallHeight: H,
    sectorRowMaxByNorm: new Map([['a101', 40]]),
  });
  const h7 = trySectorCloudRowSeatForRadial(index, 'сектор a101', '11', '7', { min: 1, max: 39 });
  const h33 = trySectorCloudRowSeatForRadial(index, 'сектор a101', '33', '7', { min: 1, max: 39 });
  assert.ok(h7 && h33);
  assert.ok(Math.abs(h7.yPct - h33.yPct) > 0.15, 'rows 11 and 33 separated on Y');
});
