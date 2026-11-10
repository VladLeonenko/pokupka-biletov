import { describe, expect, it } from 'vitest';
import {
  hallBackgroundSeatRadiusPx,
  stadiumSeatCanvasRadiusPx,
} from './hallSeatRadiusPx';

describe('hall seat zoom/select UX', () => {
  it('selected seat is larger than idle (Yandex-like)', () => {
    const idle = stadiumSeatCanvasRadiusPx(1, 960, 1400, false, false);
    const active = stadiumSeatCanvasRadiusPx(1, 960, 1400, true, false);
    expect(active).toBeGreaterThan(idle);
    expect(active / idle).toBeCloseTo(1.22, 5);
  });

  it('no radius cliff across fitZoom boundary at same scale', () => {
    const justFit = stadiumSeatCanvasRadiusPx(1.0, 800, 1400, false, false);
    const justOver = stadiumSeatCanvasRadiusPx(1.01, 800, 1400, false, true);
    expect(justOver / justFit).toBeLessThan(1.05);
    expect(justOver / justFit).toBeGreaterThan(0.95);
  });

  it('pinch-in grows seats smoothly with zoom', () => {
    const z1 = stadiumSeatCanvasRadiusPx(1, 800, 1400, false, true);
    const z2 = stadiumSeatCanvasRadiusPx(2, 800, 1400, false, true);
    expect(z2).toBeGreaterThan(z1);
    // до cap (5.5) растёт с zoom; после — плато, без скачка флага mapZoomed
    expect(z2 / z1).toBeGreaterThan(1.5);
  });

  it('background dots stable for same scalePx regardless of mapZoomed flag', () => {
    const a = hallBackgroundSeatRadiusPx(0.5, true, false);
    const b = hallBackgroundSeatRadiusPx(0.5, true, true);
    expect(a).toBe(b);
  });
});
