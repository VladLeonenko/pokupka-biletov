import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resetSectorRowAnchorsCache } from '../utils/hallSeatGeodesySectorRowAnchors.js';
import {
  applyTribuneAffine,
  interpolateSeatFromCornerAnchors,
  resolveCalibratedSeatPosition,
} from '../utils/luzhnikiSeatWarp.js';
import { pctToScreenPx, pctToViewBoxUnits } from '../utils/luzhnikiViewport.js';

describe('luzhnikiSeatWarp', () => {
  it('bilinear corners interpolate middle seat', () => {
    const anchors = [
      { row: '1', seat: '1', xPct: 10, yPct: 10 },
      { row: '10', seat: '1', xPct: 10, yPct: 90 },
      { row: '1', seat: '20', xPct: 90, yPct: 10 },
      { row: '10', seat: '20', xPct: 90, yPct: 90 },
    ];
    const hit = interpolateSeatFromCornerAnchors(anchors, '5', '10', 0);
    assert.ok(hit);
    assert.ok(hit.xPct > 10 && hit.xPct < 90);
    assert.ok(hit.yPct > 10 && hit.yPct < 90);
  });

  it('vipc138 polarGrid resolves offer row', () => {
    resetSectorRowAnchorsCache();
    const hit = resolveCalibratedSeatPosition('vip c138', '20', '3');
    assert.ok(hit, 'vip c138 → polarGrid');
    assert.ok(Number.isFinite(hit.xPct));
  });

  it('tribune affine scales around pivot', () => {
    const p = applyTribuneAffine(
      { xPct: 20, yPct: 50 },
      { scaleX: 1.1, scaleY: 1, pivotPct: { x: 10, y: 50 } },
    );
    assert.ok(p.xPct > 20);
  });

  it('viewport pctToScreenPx matches canvas formula', () => {
    const base = { x: 10, y: 20, width: 800, height: 600 };
    const { sx, sy } = pctToScreenPx(50, 50, base, 2, { x: 5, y: 0 });
    assert.equal(sx, 10 + 5 + 0.5 * 800 * 2);
    assert.equal(sy, 20 + 0 + 0.5 * 600 * 2);
  });

  it('pctToViewBoxUnits uses 11413×9676', () => {
    const { x, y } = pctToViewBoxUnits(50, 50, 11413, 9676);
    assert.equal(x, 5706.5);
    assert.equal(y, 4838);
  });
});
