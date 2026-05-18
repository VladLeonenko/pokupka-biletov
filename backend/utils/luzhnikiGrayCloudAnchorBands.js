/**
 * Кластеризация серых точек углового сектора по якорям (depth + chord).
 */

import { pickCornerAnchors } from './luzhnikiPbiletGridSpacing.js';
import { labelSectorBandsWithSvgRowNumbers } from './hallSeatGeodesySectorNative.js';

function parseNum(value) {
  const n = Number.parseInt(String(value ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function normalizeVec(v) {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

function projectOnAxis(pt, origin, axis) {
  return (pt.x - origin.x) * axis.x + (pt.y - origin.y) * axis.y;
}

function toXY(pt) {
  const x = Number(pt.xPct ?? pt.x);
  const y = Number(pt.yPct ?? pt.y);
  return { x, y, xPct: x, yPct: y };
}

/**
 * @param {{ nearLeft, nearRight, farLeft, farRight }} anchors
 * @param {Array<{xPct,yPct}>} dots
 * @param {number} expectedRows
 * @returns {Array<{xPct,yPct}[]>}
 */
export function clusterDotsIntoRowBands(dots, anchors, expectedRows = 38) {
  if (!dots?.length || !anchors?.nearLeft) return [];
  const nearL = toXY(anchors.nearLeft);
  const farL = toXY(anchors.farLeft);
  const depthAxis = normalizeVec({ x: farL.x - nearL.x, y: farL.y - nearL.y });

  const projected = dots.map((pt) => {
    const p = toXY(pt);
    return { pt: p, depthT: projectOnAxis(p, nearL, depthAxis) };
  });
  projected.sort((a, b) => a.depthT - b.depthT);

  const targetRows = Math.max(2, Math.min(48, Math.round(expectedRows) || 38));
  if (projected.length <= targetRows) {
    return projected.map((p) => [p.pt]);
  }

  const gaps = [];
  for (let i = 1; i < projected.length; i += 1) {
    gaps.push({ i, gap: projected[i].depthT - projected[i - 1].depthT });
  }
  gaps.sort((a, b) => b.gap - a.gap);
  const splitPoints = gaps
    .slice(0, targetRows - 1)
    .map((g) => g.i)
    .sort((a, b) => a - b);

  const bands = [];
  let start = 0;
  for (const sp of splitPoints) {
    bands.push(projected.slice(start, sp).map((p) => p.pt));
    start = sp;
  }
  bands.push(projected.slice(start).map((p) => p.pt));
  return bands;
}

export function sortDotsAlongChord(band, anchors) {
  const nearL = toXY(anchors.nearLeft);
  const nearR = toXY(anchors.nearRight);
  const chordAxis = normalizeVec({ x: nearR.x - nearL.x, y: nearR.y - nearL.y });
  return [...(band || [])].sort(
    (a, b) => projectOnAxis(toXY(a), nearL, chordAxis) - projectOnAxis(toXY(b), nearL, chordAxis),
  );
}

export function resolveSellableGrayCloudSeatFromDots(dots, cornerAnchors, rowN, seatN, params = {}) {
  const row = parseNum(rowN);
  const seat = parseNum(seatN);
  if (row == null || seat == null || !dots?.length) return null;

  const { seatCountFromLeft = false, expectedRows = 38 } = params;
  const bands = clusterDotsIntoRowBands(dots, cornerAnchors, expectedRows);
  if (!bands.length) return null;

  let band = bands[row - 1];
  if (!band?.length) {
    let bestI = 0;
    let bestD = Infinity;
    for (let i = 0; i < bands.length; i += 1) {
      const d = Math.abs(i + 1 - row);
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    }
    band = bands[bestI];
  }
  if (!band?.length) return null;

  const sorted = sortDotsAlongChord(band, cornerAnchors);
  let idx = seatCountFromLeft ? sorted.length - seat : seat - 1;
  idx = Math.max(0, Math.min(sorted.length - 1, idx));
  const pt = sorted[idx];
  if (!pt) return null;
  return { xPct: pt.xPct, yPct: pt.yPct, geodesySource: 'grayCloud' };
}

/**
 * @param {{ anchors?: object[] }} block — sector-row-anchors.json entry
 */
export function labelCornerDotsWithAnchors(
  dots,
  block,
  meta,
  sectorPath,
  svgRowLabels,
  fieldCenter,
  w,
  h,
) {
  const roles = pickCornerAnchors(block?.anchors ?? []);
  if (!roles.nearLeft) return [];

  const expectedRows = meta.expectedRows ?? 38;
  const rawBands = clusterDotsIntoRowBands(dots, roles, expectedRows);
  const bandObjs = rawBands.map((bandDots, i) => ({
    dots: bandDots,
    yPct: bandDots.reduce((s, d) => s + d.yPct, 0) / Math.max(1, bandDots.length),
    rowNum: i + 1,
  }));

  const labeledBands =
    svgRowLabels?.length >= 2 && sectorPath
      ? labelSectorBandsWithSvgRowNumbers(bandObjs, sectorPath, svgRowLabels, fieldCenter, w, h)
      : bandObjs;

  const seatCountFromLeft = Boolean(meta.seatCountFromLeft);
  const out = [];
  for (const band of labeledBands) {
    const rowNum = Number(band.rowNum) >= 1 ? Number(band.rowNum) : 1;
    const sorted = sortDotsAlongChord(band.dots, roles);
    const ordered = seatCountFromLeft ? [...sorted].reverse() : sorted;
    let seat = 1;
    for (const d of ordered) {
      out.push({ x: d.xPct, y: d.yPct, row: rowNum, seat });
      seat += 1;
    }
  }
  return out;
}

export function getCornerAnchorsFromBlock(block) {
  return pickCornerAnchors(block?.anchors ?? []);
}
