import { describe, expect, it } from 'vitest';
import { buildLabeledSeatIndex, lookupLabeledSeat } from './hallSeatSeatLookup';

describe('hallSeatSeatLookup', () => {
  it('matches cyrillic sector letter in offer with latin on layout', () => {
    const index = buildLabeledSeatIndex([
      { sector: 'Сектор A 101', row: '11', seat: '6', xPct: 20, yPct: 79 },
    ]);
    const hit = lookupLabeledSeat(index, 'сектор а101', '11', '6');
    expect(hit?.xPct).toBe(20);
  });
});
