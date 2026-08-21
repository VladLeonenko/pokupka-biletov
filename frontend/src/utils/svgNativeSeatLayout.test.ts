import { describe, expect, it } from 'vitest';
import {
  buildSvgNativePlacements,
  capSvgIntrinsicRasterSize,
  extractSectorCode,
  matchSvgSeatToOffer,
  parseLayoutSeatPositions,
  parsePreferLayoutSeatPositions,
  sectorMatchScore,
  stripNumericSvgSeatLabels,
  stripSvgSeatCirclesForBackdrop,
} from './svgNativeSeatLayout';

describe('svgNativeSeatLayout', () => {
  it('sectorMatchScore ranks refinement over unrelated sectors', () => {
    expect(sectorMatchScore('Партер', 'Партер центральный')).toBeGreaterThan(0);
    expect(sectorMatchScore('Балкон левый', 'Партер центральный')).toBe(0);
    expect(sectorMatchScore('Партер центральный', 'Партер центральный')).toBe(100);
  });

  it('extractSectorCode and sector c140 vs svg c140', () => {
    expect(extractSectorCode('сектор c140')).toBe('c140');
    expect(extractSectorCode('C140')).toBe('c140');
    expect(sectorMatchScore('сектор c140', 'c140')).toBe(88);
  });

  it('matchSvgSeatToOffer picks best sector among row+seat collisions', () => {
    const svg = { sector: 'Партер центральный фланг', row: '5', seat: '10', xPct: 50, yPct: 50 };
    const offers = [
      { Id: 'gen', Sector: 'Партер', Row: '5', SeatList: ['10'], AgentPrice: '1000' },
      { Id: 'mid', Sector: 'Партер центральный', Row: '5', SeatList: ['10'], AgentPrice: '2000' },
    ];
    expect(matchSvgSeatToOffer(svg, offers)?.offer.Id).toBe('mid');
  });

  it('preferLayoutSeatPositions opt-in', () => {
    expect(parsePreferLayoutSeatPositions({ preferLayoutSeatPositions: true })).toBe(true);
    expect(parsePreferLayoutSeatPositions({ preferLayoutSeatPositions: false })).toBe(false);
    expect(
      parsePreferLayoutSeatPositions({
        seatPositions: [{ sector: 'A', row: '1', seat: '1', xPct: 1, yPct: 2 }],
      }),
    ).toBe(false);
  });

  it('reads explicit seat coordinates from layout_json', () => {
    const seats = parseLayoutSeatPositions({
      layoutMode: 'svgNative',
      seatPositions: [
        { sector: 'Партер', row: '1', seat: '1', xPct: 12.5, yPct: 30 },
        { sector: 'Партер', row: '1', seat: '2', x: 0.2, y: 0.4 },
        { sector: '', row: '1', seat: '3', xPct: 50, yPct: 50 },
      ],
    });

    expect(seats).toEqual([
      { sector: 'Партер', row: '1', seat: '1', xPct: 12.5, yPct: 30 },
      { sector: 'Партер', row: '1', seat: '2', xPct: 20, yPct: 40 },
    ]);
  });

  it('matches layout seats with GetBilet offers and reports gaps', () => {
    const seats = parseLayoutSeatPositions({
      seats: [
        { sector: 'Партер', row: '1', seat: '1', xPct: 10, yPct: 10 },
        { sector: 'Партер', row: '1', seat: '2', xPct: 20, yPct: 10 },
        { sector: 'Партер', row: '1', seat: '3', xPct: 30, yPct: 10 },
      ],
    });

    const result = buildSvgNativePlacements(
      seats,
      [{ Id: 'offer-1', Sector: 'Партер', Row: '1', SeatList: ['1', '2'], AgentPrice: '1000' }],
      (offer) => String(offer.AgentPrice ?? ''),
    );

    expect(result.placements.map((p) => p.seat)).toEqual(['1', '2']);
    expect(result.unmatchedSvgCount).toBe(1);
    expect(result.diagnostics).toMatchObject({
      totalSvgSeats: 3,
      matchedSeats: 2,
      unmatchedSvgCount: 1,
      unmatchedOfferSeats: 0,
    });
  });

  it('caps huge SVG width/height and keeps viewBox', () => {
    const src =
      '<svg xmlns="http://www.w3.org/2000/svg" width="11413" height="9676" viewBox="0 0 11413 9676"><rect width="10" height="10"/></svg>';
    const out = capSvgIntrinsicRasterSize(src, 2048);
    expect(out).toContain('width="2048"');
    expect(out).toContain('height="1736"');
    expect(out).toContain('viewBox="0 0 11413 9676"');
    expect(capSvgIntrinsicRasterSize(src, 2048)).toBe(out);
    const small =
      '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="820" viewBox="0 0 1000 820"></svg>';
    expect(capSvgIntrinsicRasterSize(small, 2048)).toBe(small);
  });

  it('strips GetBilet row-number glyph paths from theater backdrop', () => {
    const src =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<circle cx="10" cy="10" r="2" fill="#d0d0d0" place-name="Партер" row="1" place="1"/>' +
      '<path d="M50,80v-8h2v8z" fill="#636466"/>' +
      '<path d="M0,0h100v100h-100z" fill="#FFFFFF"/>' +
      '</svg>';
    const out = stripSvgSeatCirclesForBackdrop(src);
    expect(out).not.toMatch(/#636466/i);
    expect(out).not.toMatch(/place-name/);
    expect(out).toMatch(/#FFFFFF/i);
  });

  it('strips numeric seat labels and keeps sector names', () => {
    const src =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<g id="1" font-size="8"><text><tspan x="0" y="7">12</tspan></text></g>' +
      '<g id="Сектор-D121"><text><tspan x="0" y="12">Сектор D121</tspan></text></g>' +
      '</svg>';
    const out = stripNumericSvgSeatLabels(src);
    expect(out).not.toMatch(/>12</);
    expect(out).toContain('Сектор D121');
    expect(out).not.toMatch(/id="1"/);
  });
});
