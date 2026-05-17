/**
 * Нативная геометрия сектора для sellable:
 * — ряд 1 у зелёного поля (ближайшая полоса точек), далее 2, 3… от поля;
 * — места слева→направо, взгляд с поля (центр арены).
 */

import { pathBBox, clusterDotsByRow } from './hallSeatGeodesyFromDots.js';
import {
  buildSectorSvgRowAisles,
  parseSvgHallRowLabels,
} from './hallSeatGeodesyFromSvgRows.js';

export function computeFieldCenterPct(allSeatCoordinates) {
  const dots = allSeatCoordinates || [];
  if (dots.length < 10) return { xPct: 50, yPct: 50 };
  let sx = 0;
  let sy = 0;
  for (const d of dots) {
    sx += Number(d.xPct);
    sy += Number(d.yPct);
  }
  return { xPct: sx / dots.length, yPct: sy / dots.length };
}

/** Ось «слева→направо» в ряду при взгляде с поля на сектор (координаты pbilet: Y вниз). */
export function seatLeftAxisFromSector(sectorPath, fieldCenterPct, hallWidth, hallHeight) {
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;
  const b = pathBBox(sectorPath);
  if (!b) return { x: 1, y: 0 };
  const scx = ((b.minX + b.maxX) / 2 / w) * 100;
  const scy = ((b.minY + b.maxY) / 2 / h) * 100;
  let vx = scx - fieldCenterPct.xPct;
  let vy = scy - fieldCenterPct.yPct;
  const len = Math.hypot(vx, vy) || 1;
  vx /= len;
  vy /= len;
  return { x: vy, y: -vx };
}

function seatSortKey(dot, axis) {
  return dot.xPct * axis.x + dot.yPct * axis.y;
}

function sectorCenterPct(sectorPath, hallWidth, hallHeight) {
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;
  const b = pathBBox(sectorPath);
  if (!b) return { scx: 50, scy: 50 };
  return {
    scx: ((b.minX + b.maxX) / 2 / w) * 100,
    scy: ((b.minY + b.maxY) / 2 / h) * 100,
  };
}

/** Полосы точек сектора, отсортированные от поля (ряд 1) к дальнему краю. */
export function sortSectorRowBandsFromField(sectorDots, sectorPath, fieldCenterPct, hallWidth, hallHeight) {
  const bands = clusterDotsByRow(sectorDots);
  if (bands.length < 1) return { bands: [], maxRow: 1 };

  const { scx, scy } = sectorCenterPct(sectorPath, hallWidth, hallHeight);
  const fx = fieldCenterPct.xPct - scx;
  const fy = fieldCenterPct.yPct - scy;

  const scored = bands.map((band) => {
    let sum = 0;
    for (const d of band.dots) {
      sum += (d.xPct - scx) * fx + (d.yPct - scy) * fy;
    }
    return {
      yPct: band.yPct,
      dots: band.dots,
      fieldScore: sum / Math.max(1, band.dots.length),
    };
  });
  scored.sort((a, b) => b.fieldScore - a.fieldScore);
  return { bands: scored, maxRow: scored.length };
}

export function maxRowInSectorFromSvg(sectorPath, svgRowLabels, hallWidth, hallHeight) {
  const aisles = buildSectorSvgRowAisles(sectorPath, svgRowLabels, hallWidth, hallHeight);
  let maxRow = 1;
  for (const aisle of aisles) {
    for (const r of aisle.rowY.keys()) maxRow = Math.max(maxRow, r);
  }
  return maxRow;
}

export function rowNumToBandIndex(rowNum, maxRow, bandCount) {
  if (bandCount < 1) return 0;
  const maxR = Math.max(maxRow, bandCount, 1);
  return Math.round(((rowNum - 1) / Math.max(1, maxR - 1)) * (bandCount - 1));
}

/** Единый maxRow сектора: SVG-подписи, офферы, число полос — не номер текущего ряда. */
export function resolveSectorNativeMaxRow(
  sectorPath,
  svgRowLabels,
  bandCount,
  sectorRowMax,
  hallWidth,
  hallHeight,
) {
  let maxRow = Math.max(bandCount, 1);
  if (Array.isArray(svgRowLabels) && svgRowLabels.length > 0 && sectorPath) {
    maxRow = Math.max(
      maxRow,
      maxRowInSectorFromSvg(sectorPath, svgRowLabels, hallWidth, hallHeight),
    );
  }
  if (sectorRowMax != null && sectorRowMax > 0) {
    maxRow = Math.max(maxRow, sectorRowMax);
  }
  return maxRow;
}

/** Y% целевого ряда (для cloudSnap). */
export function resolveRowYPctSectorNative(
  rowNum,
  sectorDots,
  sectorPath,
  svgRowLabels,
  hallWidth,
  hallHeight,
  fieldCenterPct,
  sectorRowMax = null,
) {
  const { bands } = sortSectorRowBandsFromField(
    sectorDots,
    sectorPath,
    fieldCenterPct,
    hallWidth,
    hallHeight,
  );
  if (bands.length < 1) return null;
  const maxRow = resolveSectorNativeMaxRow(
    sectorPath,
    svgRowLabels,
    bands.length,
    sectorRowMax,
    hallWidth,
    hallHeight,
  );
  const idx = rowNumToBandIndex(rowNum, maxRow, bands.length);
  return bands[Math.min(Math.max(idx, 0), bands.length - 1)]?.yPct ?? null;
}

/**
 * @param {{ xPct: number, yPct: number }[]} sectorDots
 * @returns {{ xPct: number, yPct: number } | null}
 */
export function resolveOfferSeatSectorNativeLayout(
  rowNum,
  seatNum,
  sectorDots,
  sectorPath,
  svgRowLabels,
  hallWidth,
  hallHeight,
  fieldCenterPct,
  sectorRowMax = null,
) {
  if (!sectorDots?.length || !sectorPath || seatNum == null || seatNum < 1) return null;

  const { bands } = sortSectorRowBandsFromField(
    sectorDots,
    sectorPath,
    fieldCenterPct,
    hallWidth,
    hallHeight,
  );
  if (bands.length < 1) return null;

  const maxRow = resolveSectorNativeMaxRow(
    sectorPath,
    svgRowLabels,
    bands.length,
    sectorRowMax,
    hallWidth,
    hallHeight,
  );

  const rowIdx = rowNumToBandIndex(rowNum, maxRow, bands.length);
  const band = bands[Math.min(Math.max(rowIdx, 0), bands.length - 1)];
  if (!band?.dots?.length) return null;

  const axis = seatLeftAxisFromSector(sectorPath, fieldCenterPct, hallWidth, hallHeight);
  const rowDots = [...band.dots].sort((a, b) => seatSortKey(a, axis) - seatSortKey(b, axis));
  const pick = rowDots[Math.min(Math.max(seatNum - 1, 0), rowDots.length - 1)];
  return pick ? { xPct: pick.xPct, yPct: pick.yPct } : null;
}

export { parseSvgHallRowLabels, buildSectorSvgRowAisles };
