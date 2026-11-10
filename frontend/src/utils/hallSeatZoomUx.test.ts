import { describe, expect, it } from 'vitest';
import {
  hallBackgroundSeatRadiusPx,
  stadiumSeatCanvasRadiusPx,
  theaterSeatRadiusPx,
} from './hallSeatRadiusPx';
import { stripSvgSeatCirclesForBackdrop } from './svgNativeSeatLayout';

describe('hall seat uniform theater dots', () => {
  it('grey and saleable idle share the same radius', () => {
    const scalePx = 2.0;
    const grey = theaterSeatRadiusPx(scalePx, false);
    const sell = stadiumSeatCanvasRadiusPx(1, 1000, 500, false, true, { theater: true });
    // scalePx for sell = 1000*1/500 = 2
    expect(sell).toBeCloseTo(grey, 5);
  });

  it('selected is larger than idle', () => {
    const idle = theaterSeatRadiusPx(1.5, false);
    const active = theaterSeatRadiusPx(1.5, true);
    expect(active / idle).toBeCloseTo(1.22, 5);
  });

  it('target size ~half of old SVG seat (r=2.86 * scale)', () => {
    const scalePx = 2;
    const oldSvgScreenR = 2.86 * scalePx;
    const next = theaterSeatRadiusPx(scalePx, false);
    expect(next).toBeLessThan(oldSvgScreenR * 0.6);
    expect(next).toBeGreaterThan(oldSvgScreenR * 0.35);
  });

  it('pinch zoom does not cap theater dots to 3px crumbs', () => {
    const scalePx = 4;
    const oldSvgScreenR = 2.86 * scalePx;
    const next = theaterSeatRadiusPx(scalePx, false);
    expect(next).toBeGreaterThan(3);
    expect(next).toBeLessThan(oldSvgScreenR * 0.6);
    expect(next).toBeGreaterThan(oldSvgScreenR * 0.35);
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

  it('stadium background stable vs mapZoomed flag', () => {
    expect(hallBackgroundSeatRadiusPx(0.5, true, false)).toBe(
      hallBackgroundSeatRadiusPx(0.5, true, true),
    );
  });
});
