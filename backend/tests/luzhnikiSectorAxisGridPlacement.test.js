import assert from 'node:assert/strict';
import test from 'node:test';
import { loadLuzhnikiFootballStageMapRow } from '../services/luzhnikiFootballStageMap.js';
import { buildLabeledSeatIndex } from '../utils/hallSeatGeodesyMatch.js';
import { loadSeatsArrayFromLayout } from '../utils/luzhnikiSeatIndexCache.js';
import { collectLayoutSectorPbiletSeats } from '../utils/luzhnikiPbiletGeodesyExtract.js';
import {
  buildSectorAxisGridModel,
  prefersSectorAxisGrid,
  resolveSeatOnSectorAxisGrid,
  resolveSellableOnSectorAxisGrid,
} from '../utils/luzhnikiSectorAxisGridPlacement.js';
import { buildSellableSeatGeodesyPbiletAccurate } from '../utils/luzhnikiPbiletSellableGeodesy.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ticketsPath = path.resolve(__dirname, '../../tickets.json');

test('a101: не prefersSectorAxisGrid (угловой — radialGrid)', () => {
  const tickets = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
  assert.ok(!prefersSectorAxisGrid('a101', tickets));
});

test('b154 row 17: axisGrid от ряда 16 (+1 шаг), не пусто без layout ряда', async () => {
  const row = await loadLuzhnikiFootballStageMapRow();
  const layout =
    typeof row.layout_json === 'string' ? JSON.parse(row.layout_json) : row.layout_json;
  const anchors = collectLayoutSectorPbiletSeats(
    buildLabeledSeatIndex(loadSeatsArrayFromLayout(layout)),
    ['b154'],
  );
  const model = buildSectorAxisGridModel(anchors, 'b154');
  assert.ok(model);
  assert.ok(!model.rowNums.includes(17));

  const row17 = [4, 5, 6, 12].map((seat) =>
    resolveSeatOnSectorAxisGrid(model, 17, seat, { min: 4, max: 12 }),
  );
  assert.ok(row17.every(Boolean));
  const ys = row17.map((p) => p.yPct);
  assert.ok(Math.max(...ys) - Math.min(...ys) < 0.05, 'ряд 17 — одна линия по Y');
  const xs = row17.map((p) => p.xPct);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 0.1, 'места разведены по X');

  const tickets = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
  const offers = [{ Sector: 'Сектор B 154', Row: '17', SeatList: ['4', '5', '6', '12'] }];
  const { seats } = buildSellableSeatGeodesyPbiletAccurate(tickets, offers, layout, {
    svgMarkup: row.svg_markup,
  });
  assert.equal(seats.length, 4);
  assert.ok(seats.every((s) => Number.isFinite(s.xPct) && Number.isFinite(s.yPct)));
});

test('resolveSellableOnSectorAxisGrid с пустым layout — manual anchors', () => {
  const hit = resolveSellableOnSectorAxisGrid({
    anchors: [
      { row: '1', seat: '1', xPct: 18.47, yPct: 63.82 },
      { row: '26', seat: '1', xPct: 10.95, yPct: 67.95 },
      { row: '6', seat: '44', xPct: 18.66, yPct: 68.16 },
      { row: '19', seat: '44', xPct: 13.65, yPct: 68.16 },
    ],
    sectorLabel: 'b154',
    row: '17',
    seat: '8',
    seatRangeInRow: { min: 4, max: 12 },
  });
  assert.ok(hit);
  assert.equal(hit.geodesySource, 'axisGrid');
});
