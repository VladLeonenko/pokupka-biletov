import { describe, expect, it } from 'vitest';
import { normalizeSectorLabel, strictSeatKey } from './ticketHallSectorNormalize';

describe('normalizeSectorLabel', () => {
  it('matches GetBilet and layout spellings for sector codes', () => {
    expect(normalizeSectorLabel('сектор d227')).toBe('d227');
    expect(normalizeSectorLabel('Сектор D 227')).toBe('d227');
    expect(normalizeSectorLabel('сектор D230')).toBe('d230');
    expect(normalizeSectorLabel('секторD230')).toBe('d230');
    expect(normalizeSectorLabel('d 230')).toBe('d230');
    expect(normalizeSectorLabel('Сектор D-218')).toBe('d218');
    expect(normalizeSectorLabel('vip c138')).toBe('vipc138');
  });

  it('matches cyrillic and latin sector letters (А101 vs a101)', () => {
    expect(normalizeSectorLabel('Сектор А 101')).toBe('a101');
    expect(normalizeSectorLabel('сектор a101')).toBe('a101');
  });
});

describe('strictSeatKey', () => {
  it('matches offer and layout seat in sector D 227', () => {
    const offer = strictSeatKey('сектор d227', '30', '14');
    const layout = strictSeatKey('Сектор D 227', '30', '14');
    expect(offer).toBe(layout);
  });
});
