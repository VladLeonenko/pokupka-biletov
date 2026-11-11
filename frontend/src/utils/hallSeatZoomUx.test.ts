import { describe, expect, it } from 'vitest';
import {
  estimateMinSeatSpacingSvg,
  hallBackgroundSeatRadiusPx,
  stadiumSeatCanvasRadiusPx,
  theaterSeatRadiusPx,
} from './hallSeatRadiusPx';
import { stripSvgSeatCirclesForBackdrop } from './svgNativeSeatLayout';
import { isMhtChekhovMainStageId } from '../constants/getbiletStages';

describe('hall seat radii by venue', () => {
  it('MHT grey and saleable idle share the same radius', () => {
    const scalePx = 2.0;
    const spacingSvg = 10;
    const grey = theaterSeatRadiusPx(scalePx, false, { mhtChekhov: true, spacingSvg });
    const sell = stadiumSeatCanvasRadiusPx(1, 1000, 500, false, true, {
      theater: true,
      mhtChekhov: true,
      spacingSvg,
    });
    expect(sell).toBeCloseTo(grey, 5);
  });

  it('selected is larger than idle (MHT)', () => {
    const idle = theaterSeatRadiusPx(1.5, false, { mhtChekhov: true, spacingSvg: 12 });
    const active = theaterSeatRadiusPx(1.5, true, { mhtChekhov: true, spacingSvg: 12 });
    expect(active / idle).toBeCloseTo(1.22, 5);
  });

  it('density cap prevents merge on overview', () => {
    const scalePx = 0.45;
    const spacingSvg = 9;
    const next = theaterSeatRadiusPx(scalePx, false, { mhtChekhov: true, spacingSvg });
    expect(next).toBeLessThanOrEqual(spacingSvg * scalePx * 0.34 + 1e-6);
    expect(next * 2).toBeLessThan(spacingSvg * scalePx);
  });

  it('Bolshoi/default matches SVG r≈2.86*scale (no densCap crush)', () => {
    const scalePx = 2;
    const spacingSvg = 6;
    const next = theaterSeatRadiusPx(scalePx, false, { spacingSvg });
    expect(next).toBeCloseTo(2.86 * scalePx, 5);
    expect(next).toBeGreaterThan(spacingSvg * scalePx * 0.34);
  });

  it('estimateMinSeatSpacingSvg finds grid step', () => {
    const seats = [
      { xPct: 10, yPct: 10 },
      { xPct: 20, yPct: 10 },
      { xPct: 10, yPct: 20 },
    ];
    // vb 100×100 → 10pct = 10 units
    expect(estimateMinSeatSpacingSvg(seats, 100, 100)).toBeCloseTo(10, 5);
  });

  it('detects MHT stage ids', () => {
    expect(isMhtChekhovMainStageId('603ad33813cd03003015d811')).toBe(true);
    expect(isMhtChekhovMainStageId('639c4a4cd6cfc5004d20dcfb')).toBe(true);
    expect(isMhtChekhovMainStageId('bolshoi-historical-stage')).toBe(false);
  });

  it('strips Bolshoi-like seat circles from backdrop SVG', () => {
    const src =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<circle cx="10" cy="10" r="2.86" place-name="Партер" row="1" place="1" fill="#c8ccd4"/>' +
      '<circle cx="20" cy="20" r="2.86" fill="#c8ccd4"/>' +
      '<rect x="0" y="90" width="100" height="10" fill="#2563eb"/>' +
      '</svg>';
    const out = stripSvgSeatCirclesForBackdrop(src);
    expect(out).not.toMatch(/<circle/i);
    expect(out).toMatch(/<rect/i);
  });

  it('strips MHT data-replaced circles (elem=true r=4)', () => {
    const src =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">' +
      '<circle elem="true" cx="214.495" cy="414.557" r="4" fill="#ccc" data-replaced="Партер откидное А , ряд 18, место A"/>' +
      '<path d="M0 0 L10 10" fill="#000"/>' +
      '</svg>';
    const out = stripSvgSeatCirclesForBackdrop(src);
    expect(out).not.toMatch(/<circle/i);
    expect(out).toMatch(/<path/i);
  });

  it('pinch zoom keeps proportional theater radius (no hard 3.2 cliff)', () => {
    const spacingSvg = 10;
    const a = theaterSeatRadiusPx(1, false, { mhtChekhov: true, spacingSvg });
    const b = theaterSeatRadiusPx(3, false, { mhtChekhov: true, spacingSvg });
    expect(b / a).toBeCloseTo(3, 5);
    expect(b).toBeCloseTo(3 * 1.05, 5);
  });

  it('stadium background stable vs mapZoomed flag', () => {
    expect(hallBackgroundSeatRadiusPx(0.5, true, false)).toBe(
      hallBackgroundSeatRadiusPx(0.5, true, true),
    );
  });
});
