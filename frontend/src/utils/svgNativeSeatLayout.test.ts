import { describe, expect, it } from 'vitest';
import {
  buildSvgNativePlacements,
  extractSectorCode,
  matchSvgSeatToOffer,
  parseLayoutSeatPositions,
  parsePreferLayoutSeatPositions,
  sectorMatchScore,
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

  it('reads sellableSeats alone when no full seats snapshot', () => {
    const seats = parseLayoutSeatPositions({
      sellableSeats: [{ sector: 'B', row: '2', seat: '3', xPct: 10, yPct: 20 }],
    });
    expect(seats).toEqual([{ sector: 'B', row: '2', seat: '3', xPct: 10, yPct: 20 }]);
  });

  it('merges seats snapshot with sellableSeats overlay for luzhniki', () => {
    const seats = parseLayoutSeatPositions({
      preferLayoutSeatPositions: true,
      seats: [
        { sector: 'Сектор B 145', row: '26', seat: '1', xPct: 10, yPct: 21.4 },
        { sector: 'Сектор B 145', row: '26', seat: '2', xPct: 12, yPct: 21.4 },
      ],
      sellableSeats: [
        { sector: 'сектор b145', row: '26', seat: '2', xPct: 99, yPct: 88 },
      ],
    });
    expect(seats).toHaveLength(2);
    const s1 = seats.find((s) => s.seat === '1');
    const s2 = seats.find((s) => s.seat === '2');
    expect(s1?.xPct).toBe(10);
    expect(s2?.xPct).toBe(99);
  });

  it('seatMapKey aligns сектор b145 with Сектор B 145 for exact match', () => {
    const seats = parseLayoutSeatPositions({
      sellableSeats: [
        { sector: 'Сектор B 145', row: '26', seat: '1', xPct: 10, yPct: 21.4 },
        { sector: 'Сектор B 145', row: '26', seat: '2', xPct: 12, yPct: 21.4 },
      ],
    });
    const result = buildSvgNativePlacements(
      seats,
      [{ Id: 'o1', Sector: 'сектор b145', Row: '26', SeatList: ['1', '2'], AgentPrice: '1000' }],
      (o) => String(o.AgentPrice ?? ''),
      { disablePositionalSeatZip: true },
    );
    expect(result.placements).toHaveLength(2);
    expect(result.placements.every((p) => Math.abs(p.yPct - 21.4) < 0.01)).toBe(true);
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
});
