/**
 * Номера рядов с подложки pbilet SVG (<tspan>1..N</tspan>).
 * Для секторов без r[] в tickets.json — target Y ряда с подписи на схеме.
 */

import { clusterDotsByRow, pathBBox } from './hallSeatGeodesyFromDots.js';
import {
  findBandIndexForRowNum,
  labelSectorBandsWithSvgRowNumbers,
  resolveOfferSeatSectorNativeLayout,
  resolveRowYPctSectorNative,
  seatLeftAxisFromSector,
  sortSectorRowBandsFromField,
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

function labelsInsideSectorBBox(sectorPath, allLabels, margin = 80) {
  const b = pathBBox(sectorPath);
  if (!b || !allLabels?.length) return [];
  return allLabels.filter((l) => pointInSectorBBox(l.x, l.y, b, margin));
}

/**
 * В секторе несколько колонок подписей рядов (x). Берём ту, где номера рядов
 * монотонно растут по Y — это «настоящая» шкала рядов на схеме.
 * @returns {{ centerX: number, rowY: Map<number, number> } | null}
 */
export function pickSectorRowLabelAisle(sectorPath, allLabels, hallWidth, hallHeight) {
  const inside = labelsInsideSectorBBox(sectorPath, allLabels);
  if (inside.length < 5) return null;

  const groups = [];
  for (const l of inside) {
    let g = groups.find((gr) => Math.abs(gr.centerX - l.x) < 220);
    if (!g) {
      g = { centerX: l.x, items: [] };
      groups.push(g);
    }
    g.items.push(l);
    g.centerX = g.items.reduce((s, it) => s + it.x, 0) / g.items.length;
  }

  let best = null;
  let bestScore = -1;
  for (const g of groups) {
    const byRow = new Map();
    for (const l of g.items) {
      const arr = byRow.get(l.row) ?? [];
      arr.push(l.yPct);
      byRow.set(l.row, arr);
    }
    const rows = [...byRow.entries()]
      .map(([row, ys]) => {
        ys.sort((a, b) => a - b);
        return { row, yPct: ys[Math.floor(ys.length / 2)] };
      })
      .sort((a, b) => a.row - b.row);
    if (rows.length < 5) continue;
    let mono = 0;
    for (let i = 1; i < rows.length; i += 1) {
      if (rows[i].yPct > rows[i - 1].yPct) mono += 1;
    }
    const score = mono / Math.max(1, rows.length - 1);
    if (score > bestScore) {
      bestScore = score;
      best = {
        centerX: g.centerX,
        rowY: new Map(rows.map((r) => [r.row, r.yPct])),
      };
    }
  }
  return best;
}

/** Y% подписи ряда N в правильной колонке цифр сектора. */
export function getRowLabelYPctInSector(rowNum, sectorPath, allLabels, hallWidth, hallHeight) {
  const aisle = pickSectorRowLabelAisle(sectorPath, allLabels, hallWidth, hallHeight);
  if (!aisle?.rowY?.size) return null;
  const exact = aisle.rowY.get(rowNum);
  if (exact != null) return exact;
  const cal = [...aisle.rowY.entries()].map(([row, yPct]) => ({ row, yPct }));
  cal.sort((a, b) => a.row - b.row);
  return interpolateSvgRowYPct(rowNum, cal);
}

function pickRowLabelAtAisle(rowNum, labelsInSector, aisleCenterX, maxDx = 280) {
  const candidates = labelsInSector.filter(
    (l) => l.row === rowNum && Math.abs(l.x - aisleCenterX) < maxDx,
  );
  if (!candidates.length) return null;
  if (candidates.length === 1) return candidates[0];
  return candidates.reduce((best, l) =>
    Math.abs(l.x - aisleCenterX) < Math.abs(best.x - aisleCenterX) ? l : best,
  );
}

/**
 * Места в ряду: направление от подписи ряда R к R+1 (или R−1), место 1 у подписи ряда.
 * @param {{ xPct: number, yPct: number }[]} dots
 */
export function sortDotsInSectorRow(rowNum, dots, sectorPath, allLabels, hallWidth, hallHeight) {
  if (!dots?.length) return [];
  const inside = labelsInsideSectorBBox(sectorPath, allLabels);
  const aisle = pickSectorRowLabelAisle(sectorPath, allLabels, hallWidth, hallHeight);
  const labR =
    aisle != null
      ? pickRowLabelAtAisle(rowNum, inside, aisle.centerX)
      : inside.find((l) => l.row === rowNum) ?? null;

  if (!labR) return [...dots];

  const labR2 =
    pickRowLabelAtAisle(rowNum + 1, inside, aisle?.centerX ?? labR.x) ??
    pickRowLabelAtAisle(rowNum - 1, inside, aisle?.centerX ?? labR.x);

  let seatDirX = 1;
  let seatDirY = 0;
  if (labR2) {
    let rdx = labR2.xPct - labR.xPct;
    let rdy = labR2.yPct - labR.yPct;
    const rlen = Math.hypot(rdx, rdy) || 1;
    rdx /= rlen;
    rdy /= rlen;
    seatDirX = -rdy;
    seatDirY = rdx;
    let sum = 0;
    for (const d of dots) {
      sum += (d.xPct - labR.xPct) * seatDirX + (d.yPct - labR.yPct) * seatDirY;
    }
    if (sum / dots.length < 0) {
      seatDirX = -seatDirX;
      seatDirY = -seatDirY;
    }
  }

  return [...dots].sort((a, b) => {
    const pa = (a.xPct - labR.xPct) * seatDirX + (a.yPct - labR.yPct) * seatDirY;
    const pb = (b.xPct - labR.xPct) * seatDirX + (b.yPct - labR.yPct) * seatDirY;
    if (Math.abs(pa - pb) > 1e-6) return pa - pb;
    return Math.hypot(a.xPct - labR.xPct, a.yPct - labR.yPct) - Math.hypot(b.xPct - labR.xPct, b.yPct - labR.yPct);
  });
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

function resolveRowLabelAnchorPct(rowNum, sectorPath, allLabels, hallWidth, hallHeight) {
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;
  const inside = labelsInsideSectorBBox(sectorPath, allLabels);
  const aisle = pickSectorRowLabelAisle(sectorPath, allLabels, hallWidth, hallHeight);
  const labR =
    aisle != null
      ? pickRowLabelAtAisle(rowNum, inside, aisle.centerX)
      : inside.find((l) => l.row === rowNum) ?? null;
  if (labR) return { xPct: labR.xPct, yPct: labR.yPct };
  const yPct = getRowLabelYPctInSector(rowNum, sectorPath, allLabels, hallWidth, hallHeight);
  if (yPct == null) return null;
  const b = pathBBox(sectorPath);
  const xPct = b ? ((b.minX + b.maxX) / 2 / w) * 100 : 50;
  return { xPct, yPct };
}

function seatAxisForSectorRow(
  rowNum,
  sectorPath,
  allLabels,
  hallWidth,
  hallHeight,
  fieldCenterPct,
  rowDots = [],
) {
  const lab = resolveRowLabelAnchorPct(rowNum, sectorPath, allLabels, hallWidth, hallHeight);
  if (!lab) return null;
  const seatA = seatLeftAxisFromSector(sectorPath, fieldCenterPct, hallWidth, hallHeight);
  let sx = seatA.x;
  let sy = seatA.y;
  if (rowDots.length >= 2) {
    let sum = 0;
    for (const d of rowDots) {
      sum += (d.xPct - lab.xPct) * sx + (d.yPct - lab.yPct) * sy;
    }
    if (sum / rowDots.length < 0) {
      sx = -sx;
      sy = -sy;
    }
  }
  return { lab, sx, sy };
}

/**
 * Места в одном ряду: прямая через подпись ряда; ось «место» — вдоль длинной стороны полосы точек
 * (на B154 ряд ≈ горизонталь → фиксируем Y, шаг по X; на D124 наоборот, как pbiletLerp).
 */
function interpolateSeatAlongRowAxis(axis, rowDots, seatNum, seatRangeInRow) {
  if (!axis || !rowDots?.length) return null;
  if (rowDots.length === 1) return { xPct: rowDots[0].xPct, yPct: rowDots[0].yPct };

  const xs = rowDots.map((d) => d.xPct);
  const ys = rowDots.map((d) => d.yPct);
  const xSpan = Math.max(...xs) - Math.min(...xs);
  const ySpan = Math.max(...ys) - Math.min(...ys);
  const rowIsHorizontal = xSpan >= ySpan;

  const seatMin = seatRangeInRow?.min ?? 1;
  const seatMax = seatRangeInRow?.max ?? seatNum;
  const t = (seatNum - seatMin) / Math.max(1, seatMax - seatMin);

  if (rowIsHorizontal) {
    const yRow = axis.lab.yPct;
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    return { xPct: x0 + t * (x1 - x0), yPct: yRow };
  }

  const xRow = axis.lab.xPct;
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  return { xPct: xRow, yPct: y0 + t * (y1 - y0) };
}

/**
 * Sellable на дуге ряда: полоса точек с подписью rowNum на SVG, места — вдоль отсортированной дуги.
 *
 * @param {{ min: number, max: number } | null} [seatRangeInRow]
 */
export function resolveOfferSeatFromSvgRowLabels(
  rowNum,
  seatNum,
  sectorDots,
  sectorPath,
  allLabels,
  hallWidth,
  hallHeight,
  seatRangeInRow = null,
  fieldCenterPct = { xPct: 50, yPct: 50 },
) {
  if (!sectorDots?.length || !sectorPath || seatNum == null || seatNum < 1) return null;

  const rowHint = Math.max(rowNum, 12);
  const { bands } = sortSectorRowBandsFromField(
    sectorDots,
    sectorPath,
    fieldCenterPct,
    hallWidth,
    hallHeight,
    rowHint,
  );

  let rowDots = [];
  if (bands.length >= 1 && allLabels?.length) {
    const labeled = labelSectorBandsWithSvgRowNumbers(
      bands,
      sectorPath,
      allLabels,
      fieldCenterPct,
      hallWidth,
      hallHeight,
    );
    const bi = findBandIndexForRowNum(rowNum, labeled);
    rowDots = labeled[bi]?.dots?.length ? [...labeled[bi].dots] : [];
  }

  if (rowDots.length < 4) {
    const targetY = getRowLabelYPctInSector(rowNum, sectorPath, allLabels, hallWidth, hallHeight);
    if (targetY != null) {
      const flatBands = clusterDotsByRow(sectorDots);
      const idx = findBandIndexNearestY(flatBands, targetY);
      rowDots =
        flatBands[idx]?.dots?.length >= 4 ? [...flatBands[idx].dots] : rowDots;
    }
  }

  if (rowDots.length < 2) {
    return resolveOfferSeatSectorNativeLayout(
      rowNum,
      seatNum,
      sectorDots,
      sectorPath,
      allLabels,
      hallWidth,
      hallHeight,
      fieldCenterPct,
      null,
      seatRangeInRow,
    );
  }

  rowDots = sortDotsInSectorRow(rowNum, rowDots, sectorPath, allLabels, hallWidth, hallHeight);
  const axis = seatAxisForSectorRow(
    rowNum,
    sectorPath,
    allLabels,
    hallWidth,
    hallHeight,
    fieldCenterPct,
    rowDots,
  );
  const onAxis = interpolateSeatAlongRowAxis(axis, rowDots, seatNum, seatRangeInRow);
  if (onAxis) return onAxis;

  return resolveOfferSeatSectorNativeLayout(
    rowNum,
    seatNum,
    sectorDots,
    sectorPath,
    allLabels,
    hallWidth,
    hallHeight,
    fieldCenterPct,
    null,
    seatRangeInRow,
  );
}
