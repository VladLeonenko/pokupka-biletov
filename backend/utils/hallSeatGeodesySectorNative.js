/**
 * Нативная геометрия сектора для sellable (взгляд с поля на сектор):
 * — API ряд N = N-я полоса от поля (index 0 у газона), не цифра на SVG;
 * — место 1…N вдоль seatLeftAxisFromSector (не жёстко «слева» на экране);
 * — полосы кластеризуются вдоль оси «поле → сектор»; точки в центральном проходе отбрасываются.
 */

import { pathBBox, clusterDotsByRowAlongAxis } from './hallSeatGeodesyFromDots.js';
import {
  buildSectorRowYPctCalibration,
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

/** Ось рядов: от центра поля к центру сектора (каждый сектор — своя «гребёнка»). */
export function rowAxisFromSector(sectorPath, fieldCenterPct, hallWidth, hallHeight) {
  const { scx, scy } = sectorCenterPct(sectorPath, hallWidth, hallHeight);
  let vx = scx - fieldCenterPct.xPct;
  let vy = scy - fieldCenterPct.yPct;
  const len = Math.hypot(vx, vy) || 1;
  return { x: vx / len, y: vy / len };
}

function seatSortKey(dot, axis) {
  return dot.xPct * axis.x + dot.yPct * axis.y;
}

function pointInSectorBBox(x, y, bbox, margin = 120) {
  return (
    x >= bbox.minX - margin &&
    x <= bbox.maxX + margin &&
    y >= bbox.minY - margin &&
    y <= bbox.maxY + margin
  );
}

/** Убрать точки в вертикальном проходе между блоками (ложный «ряд» на одной Y). */
function filterCentralAisleDots(sectorDots, sectorPath, hallWidth) {
  const b = pathBBox(sectorPath);
  if (!b || !sectorDots?.length) return sectorDots;
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const midPct = ((b.minX + b.maxX) / 2 / w) * 100;
  const widthPct = ((b.maxX - b.minX) / w) * 100;
  const gap = Math.max(0.35, widthPct * 0.055);
  const filtered = sectorDots.filter((d) => Math.abs(d.xPct - midPct) > gap);
  return filtered.length >= 12 ? filtered : sectorDots;
}

function rowLabelsInsideSector(sectorPath, svgRowLabels, margin = 120) {
  const b = pathBBox(sectorPath);
  if (!b || !svgRowLabels?.length) return [];
  return svgRowLabels.filter((l) => pointInSectorBBox(l.x, l.y, b, margin));
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
export function sortSectorRowBandsFromField(
  sectorDots,
  sectorPath,
  fieldCenterPct,
  hallWidth,
  hallHeight,
  rowHint = 24,
) {
  const rowAxis = rowAxisFromSector(sectorPath, fieldCenterPct, hallWidth, hallHeight);
  const coreDots = filterCentralAisleDots(sectorDots, sectorPath, hallWidth);
  const targetBands = Math.min(Math.max(10, Math.round(rowHint * 0.65)), 48);
  let eps = 0.18;
  let bands = [];
  for (let pass = 0; pass < 7; pass += 1) {
    bands = clusterDotsByRowAlongAxis(coreDots, rowAxis, eps);
    if (bands.length >= targetBands || eps <= 0.085) break;
    eps *= 0.84;
  }
  if (bands.length < 2) {
    bands = clusterDotsByRowAlongAxis(sectorDots, rowAxis, 0.12);
  }
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

/**
 * Номер ряда каждой полосе: по ближайшей подписи на схеме сектора (цифра «1» = ряд 1).
 * @returns {({ dots: object[], rowNum: number, yPct?: number, rowCoord?: number })[]}
 */
export function labelSectorBandsWithSvgRowNumbers(
  bands,
  sectorPath,
  svgRowLabels,
  fieldCenterPct,
  hallWidth,
  hallHeight,
) {
  if (!bands?.length) return [];
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;
  const rowAxis = rowAxisFromSector(sectorPath, fieldCenterPct, w, h);
  const labels = rowLabelsInsideSector(sectorPath, svgRowLabels);

  const centroids = bands.map((band) => {
    let sx = 0;
    let sy = 0;
    for (const d of band.dots) {
      sx += d.xPct;
      sy += d.yPct;
    }
    const n = Math.max(1, band.dots.length);
    const cx = sx / n;
    const cy = sy / n;
    const rowCoord = band.rowCoord ?? cx * rowAxis.x + cy * rowAxis.y;
    return { band, cx, cy, rowCoord };
  });

  if (labels.length >= 2) {
    const usedRows = new Set();
    const horizontal = sectorPrefersSvgRowLabels(rowAxis);
    const sorted = [...centroids].sort((a, b) =>
      horizontal ? a.cy - b.cy : a.rowCoord - b.rowCoord,
    );
    const labelsSorted = [...labels].sort((a, b) =>
      horizontal
        ? a.yPct - b.yPct
        : a.xPct * rowAxis.x + a.yPct * rowAxis.y - (b.xPct * rowAxis.x + b.yPct * rowAxis.y),
    );

    return sorted.map(({ band, cx, cy, rowCoord }) => {
      let bestRow = null;
      let bestD = Infinity;
      for (const lab of labelsSorted) {
        if (usedRows.has(lab.row)) continue;
        const d = horizontal
          ? Math.abs(cy - lab.yPct)
          : Math.abs(rowCoord - (lab.xPct * rowAxis.x + lab.yPct * rowAxis.y));
        if (d < bestD) {
          bestD = d;
          bestRow = lab.row;
        }
      }
      if (bestRow == null) {
        let nearest = labels[0];
        let nd = Infinity;
        for (const lab of labels) {
          const d = Math.hypot(cx - lab.xPct, cy - lab.yPct);
          if (d < nd) {
            nd = d;
            nearest = lab;
          }
        }
        bestRow = nearest.row;
      } else {
        usedRows.add(bestRow);
      }
      return { ...band, rowNum: bestRow };
    });
  }

  const { scx, scy } = sectorCenterPct(sectorPath, w, h);
  const fx = fieldCenterPct.xPct - scx;
  const fy = fieldCenterPct.yPct - scy;
  const scored = centroids.map(({ band, rowCoord }) => {
    let fs = 0;
    for (const d of band.dots) {
      fs += (d.xPct - scx) * fx + (d.yPct - scy) * fy;
    }
    return { band, rowCoord, fieldScore: fs / Math.max(1, band.dots.length) };
  });
  scored.sort((a, b) => b.fieldScore - a.fieldScore);
  return scored.map((s, i) => ({ ...s.band, rowNum: i + 1 }));
}

function findBandIndexForRowNum(rowNum, labeledBands) {
  const exact = [];
  for (let i = 0; i < labeledBands.length; i += 1) {
    if (labeledBands[i].rowNum === rowNum) exact.push(i);
  }
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) {
    let best = exact[0];
    let bestDots = labeledBands[0].dots?.length ?? 0;
    for (const i of exact) {
      const n = labeledBands[i].dots?.length ?? 0;
      if (n > bestDots) {
        bestDots = n;
        best = i;
      }
    }
    return best;
  }
  let bestIdx = 0;
  let bestD = Infinity;
  for (let i = 0; i < labeledBands.length; i += 1) {
    const d = Math.abs(labeledBands[i].rowNum - rowNum);
    if (d < bestD) {
      bestD = d;
      bestIdx = i;
    }
  }
  return bestIdx;
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

/** Обратное к rowNumToBandIndex: полоса bi (0 = у поля) → номер ряда на схеме. */
export function bandIndexToRowNum(bandIndex, maxRow, bandCount) {
  if (bandCount < 1) return 1;
  const maxR = Math.max(maxRow, bandCount, 1);
  if (maxR <= 1) return 1;
  return Math.round(1 + (bandIndex / Math.max(1, bandCount - 1)) * (maxR - 1));
}

export function calibrationHasDistinctY(calibration, minSpanPct = 0.15) {
  if (!calibration?.length || calibration.length < 2) return false;
  const ys = calibration.map((c) => c.yPct);
  return Math.max(...ys) - Math.min(...ys) >= minSpanPct;
}

function sectorRowCalibration(sectorPath, svgRowLabels, hallWidth, hallHeight) {
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const b = pathBBox(sectorPath);
  const hintXAbs = b ? (b.minX + b.maxX) / 2 : w / 2;
  if (!Array.isArray(svgRowLabels) || !sectorPath) return [];
  return buildSectorRowYPctCalibration(sectorPath, svgRowLabels, hintXAbs, hallWidth, hallHeight);
}

/** Нижние/верхние трибуны: ряды ≈ горизонтальны на SVG. Боковые — своя ось. */
export function sectorPrefersSvgRowLabels(rowAxis) {
  return Math.abs(rowAxis.y) >= 0.72;
}

export { rowLabelsInsideSector };

/** Единый maxRow сектора: SVG-подписи, офферы, число полос — не номер текущего ряда. */
export function resolveSectorNativeMaxRow(
  sectorPath,
  svgRowLabels,
  bandCount,
  sectorRowMax,
  hallWidth,
  hallHeight,
  fieldCenterPct = { xPct: 50, yPct: 50 },
) {
  const cal = sectorRowCalibration(sectorPath, svgRowLabels, hallWidth, hallHeight);
  const rowAxis = rowAxisFromSector(sectorPath, fieldCenterPct, hallWidth, hallHeight);
  if (calibrationHasDistinctY(cal) && sectorPrefersSvgRowLabels(rowAxis)) {
    let maxRow = Math.max(maxRowInSectorFromSvg(sectorPath, svgRowLabels, hallWidth, hallHeight), bandCount, 1);
    if (sectorRowMax != null && sectorRowMax > 0) maxRow = Math.max(maxRow, sectorRowMax);
    return maxRow;
  }
  if (sectorRowMax != null && sectorRowMax > 0) {
    return Math.max(sectorRowMax, bandCount, 1);
  }
  return Math.max(bandCount, 1);
}

function resolveRowBandIndex(rowNum, bands, maxRow) {
  return rowNumToBandIndex(rowNum, maxRow, bands.length);
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
  const rowHint = Math.max(
    maxRowInSectorFromSvg(sectorPath, svgRowLabels, hallWidth, hallHeight),
    sectorRowMax ?? 0,
    12,
  );
  const { bands } = sortSectorRowBandsFromField(
    sectorDots,
    sectorPath,
    fieldCenterPct,
    hallWidth,
    hallHeight,
    rowHint,
  );
  if (bands.length < 1) return null;
  const maxRow = resolveSectorNativeMaxRow(
    sectorPath,
    svgRowLabels,
    bands.length,
    sectorRowMax,
    hallWidth,
    hallHeight,
    fieldCenterPct,
  );
  const idx = resolveRowBandIndex(rowNum, bands, maxRow);
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

  const rowHint = Math.max(
    maxRowInSectorFromSvg(sectorPath, svgRowLabels, hallWidth, hallHeight),
    sectorRowMax ?? 0,
    12,
  );
  const { bands } = sortSectorRowBandsFromField(
    sectorDots,
    sectorPath,
    fieldCenterPct,
    hallWidth,
    hallHeight,
    rowHint,
  );
  if (bands.length < 1) return null;

  const maxRow = resolveSectorNativeMaxRow(
    sectorPath,
    svgRowLabels,
    bands.length,
    sectorRowMax,
    hallWidth,
    hallHeight,
    fieldCenterPct,
  );
  const rowIdx = resolveRowBandIndex(rowNum, bands, maxRow);
  const band = bands[Math.min(Math.max(rowIdx, 0), bands.length - 1)];
  if (!band?.dots?.length) return null;

  const axis = seatLeftAxisFromSector(sectorPath, fieldCenterPct, hallWidth, hallHeight);
  const rowDots = [...band.dots].sort((a, b) => seatSortKey(a, axis) - seatSortKey(b, axis));
  const pick = rowDots[Math.min(Math.max(seatNum - 1, 0), rowDots.length - 1)];
  return pick ? { xPct: pick.xPct, yPct: pick.yPct } : null;
}

export { parseSvgHallRowLabels, buildSectorSvgRowAisles };
