/**
 * Полярная нормализация: эллиптический R, strict row buffer, uniform R в ряду, равномерный φ.
 */

import { pathBBox } from './hallSeatGeodesyFromDots.js';
import { computeFieldCenterPct } from './hallSeatGeodesySectorNative.js';
import { normalizeSectorLabel } from './ticketHallSectorNormalize.js';

function median(values) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function medianGap(sorted, coordOf) {
  if (sorted.length < 2) return 0.12;
  const gaps = [];
  for (let i = 1; i < sorted.length; i += 1) {
    gaps.push(Math.abs(coordOf(sorted[i]) - coordOf(sorted[i - 1])));
  }
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)] || 0.12;
}

function adaptiveEps(sorted, coordOf, floor = 0.04) {
  return Math.max(floor, medianGap(sorted, coordOf) * 1.35);
}

function sectorCenterPct(path, w, h) {
  const b = pathBBox(path);
  if (!b) return null;
  return {
    xPct: ((b.minX + b.maxX) / 2 / w) * 100,
    yPct: ((b.minY + b.maxY) / 2 / h) * 100,
  };
}

/** Эллиптические масштабы вдоль/поперёк оси сектор→поле. */
export function ellipticRadialScales(path, w, h, cx, cy, phiRef) {
  const b = pathBBox(path);
  if (!b) return { rx: 1, ry: 1 };
  const ux = Math.cos(phiRef);
  const uy = Math.sin(phiRef);
  const vx = -uy;
  const vy = ux;
  const corners = [
    [b.minX, b.minY],
    [b.maxX, b.minY],
    [b.maxX, b.maxY],
    [b.minX, b.maxY],
  ];
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const [px, py] of corners) {
    const xPct = (px / w) * 100;
    const yPct = (py / h) * 100;
    const dx = xPct - cx;
    const dy = yPct - cy;
    const u = dx * ux + dy * uy;
    const v = dx * vx + dy * vy;
    minU = Math.min(minU, u);
    maxU = Math.max(maxU, u);
    minV = Math.min(minV, v);
    maxV = Math.max(maxV, v);
  }
  const spanU = Math.max(0.5, maxU - minU);
  const spanV = Math.max(0.5, maxV - minV);
  const spanMax = Math.max(spanU, spanV);
  return {
    rx: Math.max(0.75, spanMax / spanU),
    ry: Math.max(0.75, spanMax / spanV),
  };
}

export function dotToPolarElliptic(dot, cx, cy, phiRef, scales) {
  const dx = dot.xPct - cx;
  const dy = dot.yPct - cy;
  const ux = Math.cos(phiRef);
  const uy = Math.sin(phiRef);
  const vx = -uy;
  const vy = ux;
  const u = dx * ux + dy * uy;
  const v = dx * vx + dy * vy;
  const rx = Number(scales?.rx) > 0 ? Number(scales.rx) : 1;
  const ry = Number(scales?.ry) > 0 ? Number(scales.ry) : 1;
  const r = Math.hypot(u / rx, v / ry);
  let phi = Math.atan2(dy, dx);
  let dphi = phi - phiRef;
  while (dphi > Math.PI) dphi -= 2 * Math.PI;
  while (dphi < -Math.PI) dphi += 2 * Math.PI;
  phi = phiRef + dphi;
  return { ...dot, r, phi, u, v };
}

export function polarEllipticToXY(r, phi, cx, cy, phiRef, scales) {
  const rx = Number(scales?.rx) > 0 ? Number(scales.rx) : 1;
  const ry = Number(scales?.ry) > 0 ? Number(scales.ry) : 1;
  const ux = Math.cos(phiRef);
  const uy = Math.sin(phiRef);
  const vx = -uy;
  const vy = ux;
  const dx0 = Math.cos(phi);
  const dy0 = Math.sin(phi);
  const u0 = dx0 * ux + dy0 * uy;
  const v0 = dx0 * vx + dy0 * vy;
  const denom = Math.hypot(u0 / rx, v0 / ry) || 1;
  const k = r / denom;
  const u = k * u0;
  const v = k * v0;
  const dx = u * ux + v * vx;
  const dy = u * uy + v * vy;
  return { xPct: cx + dx, yPct: cy + dy };
}

function initialRowBands(sortedByR, epsR) {
  const bands = [];
  let cur = [sortedByR[0]];
  for (let i = 1; i < sortedByR.length; i += 1) {
    const d = sortedByR[i];
    const meanR = cur.reduce((s, p) => s + p.r, 0) / cur.length;
    if (d.r - meanR <= epsR) cur.push(d);
    else {
      bands.push(cur);
      cur = [d];
    }
  }
  bands.push(cur);
  return bands.filter((b) => b.length >= 1);
}

/** Strict radius buffer: точка только в ряду с ближайшим median R. */
export function assignStrictRowBands(polar, epsR) {
  if (!polar.length) return [];
  const sorted = [...polar].sort((a, b) => a.r - b.r || a.phi - b.phi);
  const eps = epsR > 0 ? epsR : adaptiveEps(sorted, (p) => p.r, 0.04);
  let bands = initialRowBands(sorted, eps).filter((b) => b.length >= 2);
  if (!bands.length) return polar.length ? [polar] : [];

  const reassign = () => {
    const medians = bands.map((b) => median(b.map((p) => p.r)));
    const buckets = medians.map(() => []);
    for (const p of polar) {
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < medians.length; i += 1) {
        const d = Math.abs(p.r - medians[i]);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best > 0) {
        const midLo = (medians[best - 1] + medians[best]) / 2;
        if (p.r < midLo && Math.abs(p.r - medians[best - 1]) < bestD) best -= 1;
      }
      if (best < medians.length - 1) {
        const midHi = (medians[best] + medians[best + 1]) / 2;
        if (p.r > midHi && Math.abs(p.r - medians[best + 1]) < bestD) best += 1;
      }
      buckets[best].push(p);
    }
    return buckets.filter((b) => b.length >= 2);
  };

  bands = reassign();
  if (bands.length >= 2) bands = reassign();
  return bands.map((band) => [...band].sort((a, b) => a.phi - b.phi));
}

/** Uniform R + равномерный φ в ряду. */
export function normalizeRowBandEquidistant(band) {
  if (!band.length) return [];
  const rSnap = median(band.map((p) => p.r));
  const phis = band.map((p) => p.phi);
  const phiMin = Math.min(...phis);
  const phiMax = Math.max(...phis);
  const n = band.length;
  if (n === 1) {
    return [{ ...band[0], r: rSnap, phi: phis[0], rSnap, phiSnap: phis[0] }];
  }
  const step = (phiMax - phiMin) / (n - 1);
  return band.map((p, i) => {
    const phiSnap = phiMin + i * step;
    return { ...p, r: rSnap, phi: phiSnap, rSnap, phiSnap };
  });
}

/**
 * Нормализация сырой чаши сектора → snapped dots + row bands.
 */
export function normalizeSectorPolarDots(dots, path, w, h, fieldCenter) {
  const cx = fieldCenter.xPct;
  const cy = fieldCenter.yPct;
  const sc = sectorCenterPct(path, w, h);
  const phiRef = sc
    ? Math.atan2(sc.yPct - cy, sc.xPct - cx)
    : Math.atan2(
        dots.reduce((s, d) => s + d.yPct, 0) / dots.length - cy,
        dots.reduce((s, d) => s + d.xPct, 0) / dots.length - cx,
      );
  const scales = ellipticRadialScales(path, w, h, cx, cy, phiRef);
  const polar = dots.map((d) => dotToPolarElliptic(d, cx, cy, phiRef, scales));
  const epsR = adaptiveEps(
    [...polar].sort((a, b) => a.r - b.r),
    (p) => p.r,
    0.04,
  );
  const rowBands = assignStrictRowBands(polar, epsR);
  const normalizedBands = rowBands.map((band) => normalizeRowBandEquidistant(band));
  const snapped = normalizedBands.flat().map((p) => {
    const xy = polarEllipticToXY(p.rSnap ?? p.r, p.phiSnap ?? p.phi, cx, cy, phiRef, scales);
    return {
      xPct: xy.xPct,
      yPct: xy.yPct,
      r: p.rSnap ?? p.r,
      phi: p.phiSnap ?? p.phi,
    };
  });
  return {
    snapped,
    rowBands: normalizedBands,
    phiRef,
    scales,
    fieldCenter,
    rMin: rowBands.length ? median(rowBands[0].map((p) => p.r)) : 0,
    rMax: rowBands.length ? median(rowBands[rowBands.length - 1].map((p) => p.r)) : 0,
  };
}

function parseSeatNum(seat) {
  const n = parseInt(String(seat ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function parseRowNum(row) {
  const n = parseInt(String(row ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

