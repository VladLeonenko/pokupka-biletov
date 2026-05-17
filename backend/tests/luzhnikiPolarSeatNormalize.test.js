import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assignStrictRowBands,
  dotToPolarElliptic,
  normalizeRowBandEquidistant,
  normalizeSectorPolarDots,
  polarEllipticToXY,
} from '../utils/luzhnikiPolarSeatNormalize.js';

test('normalizeRowBandEquidistant: uniform R и равный шаг φ', () => {
  const band = [
    { xPct: 50, yPct: 40, r: 10.1, phi: 0.1 },
    { xPct: 52, yPct: 41, r: 9.8, phi: 0.25 },
    { xPct: 54, yPct: 42, r: 10.3, phi: 0.42 },
  ];
  const out = normalizeRowBandEquidistant(band);
  const rs = out.map((p) => p.rSnap);
  assert.ok(Math.abs(rs[0] - rs[1]) < 1e-9);
  assert.ok(Math.abs(rs[1] - rs[2]) < 1e-9);
  assert.ok(Math.abs(out[1].phiSnap - out[0].phiSnap - (out[2].phiSnap - out[1].phiSnap)) < 1e-9);
});

test('assignStrictRowBands: точка не попадает в соседний ряд', () => {
  const polar = [];
  for (let ring = 0; ring < 4; ring += 1) {
    const r = 10 + ring * 2;
    for (let i = 0; i < 8; i += 1) {
      polar.push({ xPct: 50 + r, yPct: 50, r: r + (i % 2 === 0 ? 0.05 : -0.05), phi: i * 0.1 });
    }
  }
  const bands = assignStrictRowBands(polar, 0.5);
  assert.ok(bands.length >= 3);
  for (const band of bands) {
    const med = band.reduce((s, p) => s + p.r, 0) / band.length;
    for (const p of band) {
      assert.ok(Math.abs(p.r - med) < 1.2, `outlier r=${p.r} med=${med}`);
    }
  }
});

test('polar elliptic round-trip', () => {
  const cx = 50;
  const cy = 50;
  const phiRef = 0.5;
  const scales = { rx: 1.2, ry: 0.9 };
  const dot = { xPct: 58, yPct: 54 };
  const p = dotToPolarElliptic(dot, cx, cy, phiRef, scales);
  const xy = polarEllipticToXY(p.r, p.phi, cx, cy, phiRef, scales);
  assert.ok(Math.abs(xy.xPct - dot.xPct) < 0.15);
  assert.ok(Math.abs(xy.yPct - dot.yPct) < 0.15);
});

test('normalizeSectorPolarDots: концентрические ряды', () => {
  const cx = 50;
  const cy = 50;
  const path = 'M 2000 2000 L 9000 2000 L 9000 8000 L 2000 8000 Z';
  const dots = [];
  for (let ring = 0; ring < 4; ring += 1) {
    const rPct = 8 + ring * 2.5;
    for (let i = 0; i < 12; i += 1) {
      const phi = (i / 12) * Math.PI * 0.85 + 0.15;
      dots.push({
        xPct: cx + rPct * Math.cos(phi),
        yPct: cy + rPct * Math.sin(phi),
      });
    }
  }
  const { rowBands } = normalizeSectorPolarDots(dots, path, 11413, 9676, { xPct: cx, yPct: cy });
  assert.ok(rowBands.length >= 3);
  for (const band of rowBands) {
    const rs = band.map((p) => p.rSnap);
    assert.ok(rs.every((r) => Math.abs(r - rs[0]) < 1e-9));
  }
});
