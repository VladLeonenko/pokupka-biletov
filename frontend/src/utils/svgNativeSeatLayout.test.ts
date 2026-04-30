import { describe, expect, it } from 'vitest';
import { buildSvgNativePlacements, parseLayoutSeatPositions } from './svgNativeSeatLayout';

describe('svgNativeSeatLayout', () => {
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
});
