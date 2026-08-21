import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adaptLukoilArenaStageMapForLiveOffers,
  clipHallCoordinateCloud,
  lukoilArenaHallSize,
  slimLukoilArenaStageMapForClient,
  stripNumericSvgSeatLabels,
} from '../services/lukoilArenaFootballStageMap.js';
import { LUKOIL_ARENA_STAGE_MAP_KEY } from '../utils/footballStadiumRepertoires.js';

test('clipHallCoordinateCloud drops pbilet overflow >102%', () => {
  const clipped = clipHallCoordinateCloud([
    { xPct: 40, yPct: 80 },
    { xPct: 216, yPct: 50 },
    { xPct: 10, yPct: 213 },
    { xPct: -1, yPct: 10 },
  ]);
  assert.equal(clipped.length, 1);
  assert.equal(clipped[0].xPct, 40);
});

test('lukoilArenaHallSize falls back to svg viewBox', () => {
  const size = lukoilArenaHallSize({}, '<svg viewBox="0 0 9951 8766"></svg>');
  assert.equal(size.hallW, 9951);
  assert.equal(size.hallH, 8766);
});

test('adaptLukoilArenaStageMapForLiveOffers places unmatched GetBilet seats on sector cloud', () => {
  const row = {
    svg_markup: '<svg viewBox="0 0 1000 1000" width="1000" height="1000"></svg>',
    layout_json: {
      seats: [
        { sector: 'Сектор C115', row: '9', seat: '2', xPct: 40, yPct: 86 },
        { sector: 'Сектор C115', row: '9', seat: '3', xPct: 41, yPct: 86 },
      ],
      allSeatCoordinates: Array.from({ length: 40 }, (_, i) => ({
        xPct: 38 + (i % 10) * 0.4,
        yPct: 82 + Math.floor(i / 10) * 1.2,
      })),
      sectorMode: {
        enabled: true,
        sectors: [
          {
            id: 'c115',
            label: 'Сектор C115',
            path: 'M380 820 L460 820 L460 900 L380 900 Z',
          },
        ],
      },
    },
  };
  const offers = [
    { Id: 'o1', Sector: 'сектор c115', Row: '9', SeatList: ['2'] },
    { Id: 'o2', Sector: 'сектор c115', Row: '2', SeatList: ['11', '12'] },
  ];
  const adapted = adaptLukoilArenaStageMapForLiveOffers(row, offers);
  const layout = adapted.layout_json;
  assert.equal(layout.stadiumMapKey, LUKOIL_ARENA_STAGE_MAP_KEY);
  assert.equal(layout.luzhnikiStadiumCheckout, true);
  assert.equal(layout.sellableSeatsFromLiveOffers, true);
  assert.ok(layout.sellableSeats.length >= 2, `sellable=${layout.sellableSeats.length}`);
  const keys = new Set(layout.sellableSeats.map((s) => `${s.row}|${s.seat}`));
  assert.ok(keys.has('9|2'));
});

test('slimLukoilArenaStageMapForClient drops 47k cloud and unlocks stadium zoom', () => {
  const slim = slimLukoilArenaStageMapForClient({
    svg_markup: '<svg viewBox="0 0 9951 8766"></svg>',
    layout_json: {
      seats: [{ sector: 'Сектор C115', row: '9', seat: '2', xPct: 40, yPct: 86 }],
      sellableSeats: [{ sector: 'сектор c115', row: '2', seat: '11', xPct: 39, yPct: 84 }],
      allSeatCoordinates: [{ xPct: 40, yPct: 80 }, { xPct: 210, yPct: 10 }],
      maxZoomMultiplier: 2,
      luzhnikiStadiumCheckout: true,
    },
  });
  assert.equal(slim.layout_json.allSeatCoordinates, undefined);
  assert.equal(slim.layout_json.omitClientSeatCoordinateCloud, true);
  assert.equal(slim.layout_json.hallBackgroundRasterUrl, '/hall-maps/lukoil-arena-gray-bowl.png');
  assert.equal(slim.layout_json.maxZoomMultiplier, 12);
  assert.equal(slim.layout_json.sellableSeats.length, 1);
  assert.equal(slim.layout_json.seats.length, 1);
  assert.equal(slim.layout_json.pbilet.hallWidth, 9951);
});

test('stripNumericSvgSeatLabels drops seat digits, keeps sector titles', () => {
  const svg = `
    <svg viewBox="0 0 100 100">
      <g id="1" font-size="8"><text><tspan x="0" y="7">23</tspan></text></g>
      <g id="Сектор-D121"><text id="Сектор-D121"><tspan x="0" y="12">Сектор D121</tspan></text></g>
    </svg>`;
  const out = stripNumericSvgSeatLabels(svg);
  assert.equal(out.includes('>23<'), false);
  assert.equal(out.includes('Сектор D121'), true);
  const slim = slimLukoilArenaStageMapForClient({
    svg_markup: svg,
    layout_json: { sellableSeats: [], allSeatCoordinates: [] },
  });
  assert.equal(String(slim.svg_markup).includes('Сектор D121'), true);
  assert.equal(String(slim.svg_markup).includes('>23<'), false);
});
