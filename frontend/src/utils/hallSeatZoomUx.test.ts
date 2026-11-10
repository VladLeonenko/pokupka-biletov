import { describe, expect, it } from 'vitest';
import {
  hallBackgroundSeatRadiusPx,
  stadiumSeatCanvasRadiusPx,
  theaterBackgroundSeatRadiusPx,
} from './hallSeatRadiusPx';

describe('hall seat zoom/select UX', () => {
  it('selected seat is larger than idle (Yandex-like)', () => {
    const idle = stadiumSeatCanvasRadiusPx(1, 960, 1400, false, false, { theater: true });
    const active = stadiumSeatCanvasRadiusPx(1, 960, 1400, true, false, { theater: true });
    expect(active).toBeGreaterThan(idle);
    expect(active / idle).toBeCloseTo(1.22, 5);
  });

  it('no radius cliff across fitZoom boundary', () => {
    const justFit = stadiumSeatCanvasRadiusPx(1.0, 800, 1400, false, false, { theater: true });
    const justOver = stadiumSeatCanvasRadiusPx(1.01, 800, 1400, false, true, { theater: true });
    expect(justOver / justFit).toBeLessThan(1.05);
  });

  it('theater sellable stays near grey size (not stadium blobs at 100%)', () => {
    const zoom = 1;
    const layer = 360;
    const viewBox = 1400;
    const scalePx = (layer * zoom) / viewBox;
    const grey = theaterBackgroundSeatRadiusPx(scalePx, 1200);
    const sell = stadiumSeatCanvasRadiusPx(zoom, layer, viewBox, false, false, { theater: true });
    expect(sell).toBeGreaterThan(grey);
    expect(sell / grey).toBeLessThan(2.2);
    expect(sell).toBeLessThan(2.5);
  });

  it('background dots stable for same scalePx regardless of mapZoomed flag', () => {
    const a = hallBackgroundSeatRadiusPx(0.5, true, false);
    const b = hallBackgroundSeatRadiusPx(0.5, true, true);
    expect(a).toBe(b);
  });
});
