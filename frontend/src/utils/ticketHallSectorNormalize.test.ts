import { describe, expect, it } from 'vitest';
import { normalizeSectorLabel, sectorNormsMatch, strictSeatKey } from './ticketHallSectorNormalize';

describe('normalizeSectorLabel', () => {
  it('matches GetBilet and layout spellings for sector codes', () => {
    expect(normalizeSectorLabel('сектор d227')).toBe('d227');
    expect(normalizeSectorLabel('Сектор D 227')).toBe('d227');
    expect(normalizeSectorLabel('vip c138')).toBe('vipc138');
    expect(normalizeSectorLabel('сектор а101')).toBe('a101');
    expect(normalizeSectorLabel('Сектор A 101')).toBe('a101');
    expect(normalizeSectorLabel('сектор б147')).toBe('b147');
  });

  it('VIP tribune offer without vip word', () => {
    expect(sectorNormsMatch('сектор a107', 'Сектор A 107 VIP')).toBe(true);
  });

  it('does not merge lodge with tribune', () => {
    expect(sectorNormsMatch('Ложа 101', 'Сектор A 101')).toBe(false);
  });
});

describe('strictSeatKey', () => {
  it('matches offer and layout seat in sector D 227', () => {
    const offer = strictSeatKey('сектор d227', '30', '14');
    const layout = strictSeatKey('Сектор D 227', '30', '14');
    expect(offer).toBe(layout);
  });
});
