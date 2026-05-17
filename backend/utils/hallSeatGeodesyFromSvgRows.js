/**
 * Номера рядов с подложки pbilet SVG (<tspan>1..N</tspan>).
 * Для секторов без r[] в tickets.json — target Y ряда с подписи на схеме.
 */

import { pathBBox } from './hallSeatGeodesyFromDots.js';
import {
  resolveOfferSeatSectorNativeLayout,
  resolveRowYPctSectorNative,
} from './hallSeatGeodesySectorNative.js';

const TSPAN_RE =
  /<tspan\s+[^>]*\bx=["']([\d.]+)["'][^>]*\by=["']([\d.]+)["'][^>]*>([^<]*)<\/tspan>/gi;
const TSPAN_RE_ALT =
  /<tspan\s+[^>]*\by=["']([\d.]+)["'][^>]*\bx=["']([\d.]+)["'][^>]*>([^<]*)<\/tspan>/gi;

function pointInSectorBBox(x, y, bbox, margin = 120) {
  return (
    x >= bbox.minX - margin &&
    x <= bbox.maxX + margin &&
    y >= bbox.minY - margin &&
    y <= bbox.maxY + margin
  );
}

/** @returns {{ row: number, x: number, y: number, xPct: number, yPct: number }[]} */
export function parseSvgHallRowLabels(svgMarkup, hallWidth, hallHeight) {
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;
  const out = [];
  const seen = new Set();

  const ingest = (re) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(svgMarkup))) {
      const x = Number(m[1]);
      const y = Number(m[2]);
      const text = String(m[3] ?? '').trim();
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (!/^\d{1,2}$/.test(text)) continue;
      const row = Number.parseInt(text, 10);
      if (row < 1 || row > 99) continue;
      const key = `${row}|${x.toFixed(1)}|${y.toFixed(1)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ row, x, y, xPct: (x / w) * 100, yPct: (y / h) * 100 });
    }
  };

  if (typeof svgMarkup !== 'string' || !svgMarkup.includes('<svg')) return out;
  ingest(TSPAN_RE);
  ingest(TSPAN_RE_ALT);
  return out;
}

function clusterLabelsByAisle(labels, minGap = 120) {
  if (!labels?.length) return [];
  const sorted = [...labels].sort((a, b) => a.x - b.x);
  const groups = [];
  let cur = [sorted[0]];
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].x - sorted[i - 1].x > minGap) {
      groups.push(cur);
      cur = [sorted[i]];
    } else cur.push(sorted[i]);
  }
  groups.push(cur);

  return groups.map((group) => {
    const rowY = new Map();
    const byRow = new Map();
    for (const l of group) {
      const arr = byRow.get(l.row) ?? [];
      arr.push(l.yPct);
      byRow.set(l.row, arr);
    }
    for (const [row, ys] of byRow) {
      ys.sort((a, b) => a - b);
      rowY.set(row, ys[Math.floor(ys.length / 2)]);
    }
    const xs = group.map((g) => g.x);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      centerX: xs.reduce((s, v) => s + v, 0) / xs.length,
      rowY,
    };
  });
}

export function buildSectorSvgRowAisles(sectorPath, allLabels, hallWidth, hallHeight) {
  const b = pathBBox(sectorPath);
  if (!b || !allLabels?.length) return [];
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;
  const inside = allLabels.filter((l) =>
    pointInSectorBBox(l.x, l.y, { minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY }),
  );
  return clusterLabelsByAisle(inside);
}

function pickAisle(aisles, rowNum, hintXAbs) {
  const withRow = aisles.filter((a) => a.rowY.has(rowNum));
  if (withRow.length === 0) return null;
  if (withRow.length === 1) return withRow[0];
  let best = withRow[0];
  let bestD = Infinity;
  for (const a of withRow) {
    const d = Math.abs(a.centerX - hintXAbs);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best;
}

/** Калибровка «номер ряда → Y%» по <tspan> на подложке pbilet внутри сектора. */
export function buildSectorRowYPctCalibration(
  sectorPath,
  allLabels,
  hintXAbs,
  hallWidth,
  hallHeight,
) {
  const aisles = buildSectorSvgRowAisles(sectorPath, allLabels, hallWidth, hallHeight);
  if (!aisles.length) return [];
  let aisle =
    hintXAbs != null && Number.isFinite(hintXAbs)
      ? pickAisle(aisles, 1, hintXAbs)
      : null;
  if (!aisle) {
    aisle = aisles.reduce(
      (best, a) => ((a.rowY?.size ?? 0) > (best?.rowY?.size ?? 0) ? a : best),
      aisles[0],
    );
  }
  if (!aisle?.rowY?.size) return [];
  const rows = [...aisle.rowY.entries()].map(([row, yPct]) => ({
    row: Number(row),
    yPct: Number(yPct),
  }));
  rows.sort((a, b) => a.row - b.row);
  return rows.filter((r) => r.row >= 1 && Number.isFinite(r.yPct));
}

/** Линейная интерполяция Y% ряда между подписями на схеме. */
export function interpolateSvgRowYPct(rowNum, calibration) {
  if (!calibration?.length || rowNum == null) return null;
  const exact = calibration.find((c) => c.row === rowNum);
  if (exact) return exact.yPct;
  if (calibration.length === 1) return calibration[0].yPct;
  if (rowNum <= calibration[0].row) return calibration[0].yPct;
  const last = calibration[calibration.length - 1];
  if (rowNum >= last.row) return last.yPct;
  for (let i = 0; i < calibration.length - 1; i += 1) {
    const lo = calibration[i];
    const hi = calibration[i + 1];
    if (rowNum >= lo.row && rowNum <= hi.row) {
      const t = (rowNum - lo.row) / Math.max(1, hi.row - lo.row);
      return lo.yPct + t * (hi.yPct - lo.yPct);
    }
  }
  return null;
}

/** Индекс полосы точек с Y, ближайшим к подписи ряда на SVG. */
export function findBandIndexNearestY(bands, targetYPct) {
  if (!bands?.length || targetYPct == null) return 0;
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < bands.length; i += 1) {
    const d = Math.abs(bands[i].yPct - targetYPct);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export function resolveRowYPctFromSvgLabels(
  rowNum,
  sectorPath,
  allLabels,
  hallWidth,
  hallHeight,
  hintXPct = 50,
  fieldCenterPct = { xPct: 50, yPct: 50 },
  sectorDots = [],
) {
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const hintXAbs = (Number(hintXPct) / 100) * w;
  const calibration = buildSectorRowYPctCalibration(
    sectorPath,
    allLabels,
    hintXAbs,
    hallWidth,
    hallHeight,
  );
  if (calibration.length >= 2) {
    const y = interpolateSvgRowYPct(rowNum, calibration);
    if (y != null) return y;
  }
  if (!sectorDots?.length) return null;
  return resolveRowYPctSectorNative(
    rowNum,
    sectorDots,
    sectorPath,
    allLabels,
    hallWidth,
    hallHeight,
    fieldCenterPct,
  );
}

/**
 * @param {{ xPct: number, yPct: number }[]} sectorDots
 * @param {{ xPct: number, yPct: number }} [fieldCenterPct]
 */
export function resolveOfferSeatFromSvgRowLabels(
  rowNum,
  seatNum,
  sectorDots,
  sectorPath,
  allLabels,
  hallWidth,
  hallHeight,
  _seatRangeInRow,
  fieldCenterPct = { xPct: 50, yPct: 50 },
) {
  if (!sectorDots?.length || !allLabels?.length || !sectorPath) return null;
  return resolveOfferSeatSectorNativeLayout(
    rowNum,
    seatNum,
    sectorDots,
    sectorPath,
    allLabels,
    hallWidth,
    hallHeight,
    fieldCenterPct,
  );
}
