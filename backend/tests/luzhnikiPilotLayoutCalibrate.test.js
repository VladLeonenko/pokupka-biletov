import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyLeftTribuneScale,
  isLeftTribuneSector,
  layoutAnchorLookupRow,
  layoutAnchorRowShift,
} from '../utils/luzhnikiPilotLayoutCalibrate.js';

test('left tribune sectors', () => {
  assert.equal(isLeftTribuneSector('b145'), true);
  assert.equal(isLeftTribuneSector('a101'), true);
  assert.equal(isLeftTribuneSector('a216'), false);
  assert.equal(isLeftTribuneSector('a201'), false);
  assert.equal(isLeftTribuneSector('d230'), false);
});

test('layout row shift +4 for B145', () => {
  assert.equal(layoutAnchorRowShift('b145'), 4);
  assert.equal(layoutAnchorLookupRow('b145', '26'), '30');
});

test('scale around pivot', () => {
  const prevX = process.env.LUZHNIKI_LEFT_SCALE_X;
  process.env.LUZHNIKI_LEFT_SCALE_X = '1.1';
  const scaled = applyLeftTribuneScale('b145', 20, 18, { x: 16, y: 17 }, 'layout-anchors');
  assert.equal(scaled.xPct, 16 + (20 - 16) * 1.1);
  if (prevX == null) delete process.env.LUZHNIKI_LEFT_SCALE_X;
  else process.env.LUZHNIKI_LEFT_SCALE_X = prevX;
});
