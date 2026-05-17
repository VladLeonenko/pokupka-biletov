/**
 * Sellable-геодезия: strict → якоря layout.seats → сетка точек в bbox сектора.
 * Облако 77k только внутри полигона сектора (не глобальная интерполяция по овалу).
 */

import { buildSellableSeatGeodesy } from './hallSeatGeodesyMatch.js';
import { parseSvgHallRowLabels, resolveRowYPctFromSvgLabels } from './hallSeatGeodesyFromSvgRows.js';
import {
  computeFieldCenterPct,
  resolveOfferSeatSectorNativeLayout,
  seatLeftAxisFromSector,
} from './hallSeatGeodesySectorNative.js';
import {
  buildSectorRowYPctCalibration,
  findBandIndexNearestY,
  interpolateSvgRowYPct,
} from './hallSeatGeodesyFromSvgRows.js';
import {
  normalizeRowLabel,
  normalizeSectorLabel,
  strictSeatKey,
} from './ticketHallSectorNormalize.js';

function parseNum(value) {
  const n = Number.parseInt(String(value ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

export function pathBBox(path) {
  const nums = String(path ?? '').match(/-?[\d.]+(?:e[-+]?\d+)?/gi);
  if (!nums?.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = Number(nums[i]);
    const y = Number(nums[i + 1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

function bboxArea(b) {
  return (b.maxX - b.minX) * (b.maxY - b.minY);
}

function pointInBBox(xPct, yPct, b, marginPct = 0.15) {
  return (
    xPct >= b.minX - marginPct &&
    xPct <= b.maxX + marginPct &&
    yPct >= b.minY - marginPct &&
    yPct <= b.maxY + marginPct
  );
}

/** Кусочно-линейная интерполяция по номеру ряда по якорям сектора. */
function interpolateByRowNumber(rowNum, anchors, pick) {
  const pts = [];
  for (const a of anchors) {
    const r = parseNum(a.row);
    if (r == null) continue;
    const v = pick(a);
    if (!Number.isFinite(v)) continue;
    pts.push({ r, v });
  }
  if (pts.length < 2) return null;
  pts.sort((a, b) => a.r - b.r);
  if (rowNum <= pts[0].r) {
    const lo = pts[0];
    const hi = pts[1];
    const t = (rowNum - lo.r) / (hi.r - lo.r);
    return lo.v + t * (hi.v - lo.v);
  }
  if (rowNum >= pts[pts.length - 1].r) {
    const hi = pts[pts.length - 1];
    const lo = pts[pts.length - 2];
    const t = (rowNum - hi.r) / (hi.r - lo.r);
    return hi.v + t * (hi.v - lo.v);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const lo = pts[i];
    const hi = pts[i + 1];
    if (rowNum >= lo.r && rowNum <= hi.r) {
      const t = (rowNum - lo.r) / (hi.r - lo.r);
      return lo.v + t * (hi.v - lo.v);
    }
  }
  return null;
}

function fitSeatXCalibration(anchors) {
  const pts = anchors
    .map((a) => ({ seatNum: parseNum(a.seat), xPct: a.xPct }))
    .filter((p) => p.seatNum != null && Number.isFinite(p.xPct));
  if (pts.length < 2) return null;
  const n = pts.length;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;
  for (const { seatNum, xPct } of pts) {
    sumX += seatNum;
    sumY += xPct;
    sumXX += seatNum * seatNum;
    sumXY += seatNum * xPct;
  }
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-9) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { predict: (seatNum) => slope * seatNum + intercept };
}

function predictSeatXPct(rowNum, seatNum, anchors) {
  const rowLabel = normalizeRowLabel(String(rowNum));
  const sameRow = anchors.filter((a) => normalizeRowLabel(a.row) === rowLabel);
  const cal = fitSeatXCalibration(sameRow);
  if (cal && seatNum != null) return cal.predict(seatNum);

  const byRow = new Map();
  for (const a of anchors) {
    const r = parseNum(a.row);
    if (r == null) continue;
    const arr = byRow.get(r) ?? [];
    arr.push(a);
    byRow.set(r, arr);
  }
  let bestRow = null;
  let bestDist = Infinity;
  for (const [r, arr] of byRow) {
    if (arr.length < 2) continue;
    const d = Math.abs(r - rowNum);
    if (d < bestDist) {
      bestDist = d;
      bestRow = arr;
    }
  }
  if (bestRow) {
    const cal2 = fitSeatXCalibration(bestRow);
    if (cal2 && seatNum != null) return cal2.predict(seatNum);
  }
  return interpolateByRowNumber(rowNum, anchors, (a) => a.xPct);
}

function clusterSortedDotsIntoBands(sorted, coordOf, eps = 0.2) {
  if (!sorted.length) return [];
  const bands = [];
  let cur = [sorted[0]];
  for (let i = 1; i < sorted.length; i += 1) {
    const d = sorted[i];
    const meanC = cur.reduce((s, p) => s + coordOf(p), 0) / cur.length;
    if (coordOf(d) - meanC <= eps) cur.push(d);
    else {
      bands.push(cur);
      cur = [d];
    }
  }
  bands.push(cur);
  return bands
    .filter((pts) => pts.length >= 2)
    .map((pts) => {
      const rowCoord = pts.reduce((s, p) => s + coordOf(p), 0) / pts.length;
      return {
        rowCoord,
        yPct: pts.reduce((s, p) => s + p.yPct, 0) / pts.length,
        dots: pts,
      };
    });
}

/** Горизонтальные полосы рядов по глобальной Y (театры / горизонтальные сектора). */
export function clusterDotsByRow(dots, eps = 0.2) {
  if (!dots?.length) return [];
  const sorted = [...dots].sort((a, b) => a.yPct - b.yPct || a.xPct - b.xPct);
  return clusterSortedDotsIntoBands(sorted, (d) => d.yPct, eps);
}

/**
 * Полосы рядов вдоль оси сектора (от поля к дальнему краю) — для овала Лужников.
 * @param {{ x: number, y: number }} rowAxis единичный вектор «поле → сектор» в % координатах
 */
export function clusterDotsByRowAlongAxis(dots, rowAxis, eps = 0.18) {
  if (!dots?.length || !rowAxis) return [];
  const ax = Number(rowAxis.x);
  const ay = Number(rowAxis.y);
  const len = Math.hypot(ax, ay) || 1;
  const nx = ax / len;
  const ny = ay / len;
  const proj = (d) => d.xPct * nx + d.yPct * ny;
  const sorted = [...dots].sort((a, b) => proj(a) - proj(b) || a.xPct - b.xPct);
  return clusterSortedDotsIntoBands(sorted, proj, eps);
}

/** Калибровка номера ряда → Y по якорям, привязанным к полосам точек чаши. */
export function resolveRowYPctFromDotGrid(rowNum, layoutAnchors, rowBands) {
  const rowCal = [];
  for (const a of layoutAnchors) {
    const r = parseNum(a.row);
    if (r == null || !Number.isFinite(a.yPct)) continue;
    let bestBand = null;
    let bestD = Infinity;
    for (const band of rowBands) {
      const d = Math.abs(band.yPct - a.yPct);
      if (d < bestD) {
        bestD = d;
        bestBand = band;
      }
    }
    if (!bestBand || bestD > 0.45) continue;
    rowCal.push({ row: String(r), yPct: bestBand.yPct });
  }
  if (rowCal.length < 2) return null;
  return interpolateByRowNumber(rowNum, rowCal, (a) => a.yPct);
}


function rowAnchorGroups(layoutAnchors) {
  const byRow = new Map();
  for (const a of layoutAnchors) {
    const r = parseNum(a.row);
    if (r == null || !Number.isFinite(a.yPct)) continue;
    const arr = byRow.get(r) ?? [];
    arr.push(a);
    byRow.set(r, arr);
  }
  return [...byRow.entries()]
    .map(([row, seats]) => ({
      row,
      yPct: seats.reduce((s, a) => s + a.yPct, 0) / seats.length,
      seats,
    }))
    .sort((a, b) => a.row - b.row);
}

/**
 * Координаты оффера по якорям layout.seats: точное совпадение ряд+место, иначе калибровка внутри ряда
 * или интерполяция Y между известными рядами (без сетки 77k точек).
 * @returns {{ xPct: number, yPct: number } | null}
 */
export function resolveOfferSeatFromAnchors(rowNum, seatNum, layoutAnchors) {
  if (!Array.isArray(layoutAnchors) || layoutAnchors.length < 1) return null;
  const rowNorm = normalizeRowLabel(String(rowNum));

  const sameRow = layoutAnchors.filter((a) => normalizeRowLabel(a.row) === rowNorm);
  if (sameRow.length > 0) {
    const exact = sameRow.find((a) => parseNum(a.seat) === seatNum);
    if (exact && Number.isFinite(exact.xPct) && Number.isFinite(exact.yPct)) {
      return { xPct: exact.xPct, yPct: exact.yPct };
    }
    const yPct = sameRow.reduce((s, a) => s + a.yPct, 0) / sameRow.length;
    const cal = fitSeatXCalibration(sameRow);
    if (cal && seatNum != null) {
      const xPct = cal.predict(seatNum);
      if (Number.isFinite(xPct)) return { xPct, yPct };
    }
    return null;
  }

  const rowPts = rowAnchorGroups(layoutAnchors);
  if (rowPts.length < 2) return null;
  const minR = rowPts[0].row;
  const maxR = rowPts[rowPts.length - 1].row;
  if (rowNum < minR || rowNum > maxR) {
    return null;
  }

  const yPct = interpolateByRowNumber(
    rowNum,
    rowPts.map((p) => ({ row: String(p.row), yPct: p.yPct })),
    (a) => a.yPct,
  );
  if (yPct == null) return null;

  let nearest = rowPts[0];
  let bestGap = Math.abs(rowPts[0].row - rowNum);
  for (const p of rowPts) {
    const g = Math.abs(p.row - rowNum);
    if (g < bestGap) {
      bestGap = g;
      nearest = p;
    }
  }
  const cal = fitSeatXCalibration(nearest.seats);
  if (!cal || seatNum == null) return null;
  const xPct = cal.predict(seatNum);
  if (!Number.isFinite(xPct)) return null;
  return { xPct, yPct };
}

export function pickDotNearRowSeat(rowDots, targetY, targetX, maxDist = 0.42) {
  let best = null;
  let bestD = Infinity;
  for (const d of rowDots) {
    const dist = Math.hypot(d.xPct - targetX, d.yPct - targetY);
    if (dist < bestD) {
      bestD = dist;
      best = d;
    }
  }
  if (!best || bestD > maxDist) return null;
  return best;
}

/**
 * @returns {{ xPct: number, yPct: number } | null}
 */
export function resolveOfferSeatOnDotGrid({ rowNum, seatNum, layoutAnchors, sectorDots }) {
  const rowBands = clusterDotsByRow(sectorDots);
  if (rowBands.length < 2) return null;

  const targetY = resolveRowYPctFromDotGrid(rowNum, layoutAnchors, rowBands);
  if (targetY == null) return null;

  const rowDots = sectorDots.filter((d) => Math.abs(d.yPct - targetY) <= 0.22);
  if (rowDots.length < 2) return null;

  let targetX = predictSeatXPct(rowNum, seatNum, layoutAnchors);
  if (targetX == null) {
    const sorted = [...rowDots].sort((a, b) => a.xPct - b.xPct);
    const idx =
      seatNum != null
        ? Math.min(Math.max(seatNum - 1, 0), sorted.length - 1)
        : Math.floor(sorted.length / 2);
    targetX = sorted[idx].xPct;
  }

  return pickDotNearRowSeat(rowDots, targetY, targetX);
}

/**
 * Ориентация ряд/место по подписанным секторам (для секторов с r:[] в tickets.json).
 * rowYPctIncreases: +1 — с ростом номера ряда Y растёт; -1 — Y падает.
 */
export function buildLabeledSectorOrientationIndex(layoutSeats, sectorPaths, hallWidth, hallHeight) {
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;
  const centroids = new Map();
  for (const sp of sectorPaths || []) {
    const norm = normalizeSectorLabel(sp.label);
    const b = pathBBox(sp.path);
    if (!norm || !b) continue;
    centroids.set(norm, {
      x: ((b.minX + b.maxX) / 2 / w) * 100,
      y: ((b.minY + b.maxY) / 2 / h) * 100,
    });
  }

  const anchorsBySector = new Map();
  for (const s of layoutSeats || []) {
    const norm = normalizeSectorLabel(s.sector);
    const arr = anchorsBySector.get(norm) ?? [];
    arr.push(s);
    anchorsBySector.set(norm, arr);
  }

  const orientations = [];
  for (const [norm, anchors] of anchorsBySector) {
    const rowPts = rowAnchorGroups(anchors);
    if (rowPts.length < 2) continue;
    const c = centroids.get(norm);
    if (!c) continue;
    const dY = rowPts[rowPts.length - 1].yPct - rowPts[0].yPct;
    const dR = rowPts[rowPts.length - 1].row - rowPts[0].row;
    const rowYPctIncreases = dR === 0 ? 1 : Math.sign(dY / dR) || 1;

    const mid = rowPts[Math.floor(rowPts.length / 2)];
    const cal = fitSeatXCalibration(mid.seats);
    let seatXPctIncreases = 1;
    if (cal) {
      const s0 = parseNum(mid.seats[0]?.seat);
      const s1 = parseNum(mid.seats[mid.seats.length - 1]?.seat);
      if (s0 != null && s1 != null && s1 > s0) {
        const x0 = cal.predict(s0);
        const x1 = cal.predict(s1);
        if (Number.isFinite(x0) && Number.isFinite(x1)) {
          seatXPctIncreases = x1 >= x0 ? 1 : -1;
        }
      }
    }

    const tribune = norm.match(/^([a-z]+)/)?.[1] ?? '';
    orientations.push({ norm, tribune, ...c, rowYPctIncreases, seatXPctIncreases });
  }

  return { centroids, orientations };
}

export function pickNearestSectorOrientation(targetNorm, orientationIndex) {
  const c = orientationIndex?.centroids?.get(targetNorm);
  const list = orientationIndex?.orientations ?? [];
  if (!c || list.length < 1) return null;

  const tribune = targetNorm.match(/^([a-z]+)/)?.[1] ?? '';
  let best = null;
  let bestScore = Infinity;
  for (const o of list) {
    const dist = Math.hypot(o.x - c.x, o.y - c.y);
    const score = dist - (o.tribune === tribune ? 8 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = o;
    }
  }
  return best;
}

export function buildSectorOfferSeatRangesByRow(offers) {
  /** norm → rowNum → { min, max } */
  const bySector = new Map();
  for (const offer of offers) {
    const norm = normalizeSectorLabel(offer.Sector);
    const rowNum = parseNum(offer.Row);
    if (rowNum == null) continue;
    const list = Array.isArray(offer.SeatList) ? offer.SeatList.map(String) : [];
    const byRow = bySector.get(norm) ?? new Map();
    for (const seat of list) {
      const sn = parseNum(seat);
      if (sn == null) continue;
      const prev = byRow.get(rowNum) ?? { min: sn, max: sn };
      byRow.set(rowNum, {
        min: Math.min(prev.min, sn),
        max: Math.max(prev.max, sn),
      });
    }
    if (byRow.size > 0) bySector.set(norm, byRow);
  }
  return bySector;
}

/**
 * Сектор без r[] в tickets (B 147 и др.): ряд/место на реальной точке облака luzhniki.txt,
 * ориентация рядов — от ближайшего подписанного сектора той же трибуны.
 */
export function resolveOfferSeatFromCalibratedCloud(
  rowNum,
  seatNum,
  sectorDots,
  rowRange,
  seatRangeInRow,
  orientation,
  layoutAnchors = [],
  seatAlongAxis = null,
  svgRowPick = null,
) {
  const bands = clusterDotsByRow(sectorDots);
  if (bands.length < 2 || !rowRange) return null;

  let idx;
  if (svgRowPick?.targetYPct != null) {
    idx = findBandIndexNearestY(bands, svgRowPick.targetYPct);
  } else {
    const fullRowRange = inferCloudSectorRowRange(rowRange, bands.length, layoutAnchors);
    const span = Math.max(1, fullRowRange.max - fullRowRange.min);
    const t = (rowNum - fullRowRange.min) / span;
    idx = Math.round(t * (bands.length - 1));
    if (orientation?.rowYPctIncreases === -1) {
      idx = bands.length - 1 - idx;
    }
  }
  const band = bands[Math.min(Math.max(idx, 0), bands.length - 1)];

  let rowDots;
  if (seatAlongAxis) {
    rowDots = [...band.dots].sort(
      (a, b) =>
        a.xPct * seatAlongAxis.x +
        a.yPct * seatAlongAxis.y -
        (b.xPct * seatAlongAxis.x + b.yPct * seatAlongAxis.y),
    );
  } else {
    rowDots = [...band.dots].sort((a, b) => a.xPct - b.xPct);
    if (orientation?.seatXPctIncreases === -1) rowDots = rowDots.reverse();
  }
  const cloudSeatRange = inferCloudSeatRangeInRow(seatRangeInRow, seatNum, rowDots);

  let targetX;
  if (seatNum != null && rowDots.length >= 1) {
    const seatSpan = Math.max(1, cloudSeatRange.max - cloudSeatRange.min);
    const st = (seatNum - cloudSeatRange.min) / seatSpan;
    const seatIdx = Math.round(st * (rowDots.length - 1));
    targetX = rowDots[Math.min(Math.max(seatIdx, 0), rowDots.length - 1)].xPct;
  } else {
    targetX = rowDots[Math.floor(rowDots.length / 2)]?.xPct ?? 50;
  }

  if (rowDots.length >= 2) {
    const hit = pickDotNearRowSeat(rowDots, band.yPct, targetX, 0.65);
    if (hit) return { xPct: hit.xPct, yPct: hit.yPct };
  }

  const yFromBand = band?.yPct ?? null;
  return resolveOfferSeatSnapInSector(sectorDots, yFromBand, seatNum, seatRangeInRow);
}

/**
 * Последний fallback: ближайшая точка чаши в секторе к (y ряда с SVG или cloud, x по месту).
 */
export function resolveOfferSeatSnapInSector(
  sectorDots,
  targetYPct,
  seatNum,
  _seatRangeInRow,
  maxYDist = 0.85,
  seatLeftAxis = null,
) {
  if (!sectorDots?.length || targetYPct == null) return null;
  let pool = sectorDots.filter((d) => Math.abs(d.yPct - targetYPct) <= maxYDist);
  if (pool.length < 2) pool = [...sectorDots];
  if (seatLeftAxis) {
    pool.sort(
      (a, b) =>
        a.xPct * seatLeftAxis.x +
        a.yPct * seatLeftAxis.y -
        (b.xPct * seatLeftAxis.x + b.yPct * seatLeftAxis.y),
    );
  } else {
    pool.sort((a, b) => a.xPct - b.xPct);
  }
  const seatIdx =
    seatNum != null ? Math.min(Math.max(seatNum - 1, 0), pool.length - 1) : Math.floor(pool.length / 2);
  const pick = pool[seatIdx];
  return pick ? { xPct: pick.xPct, yPct: pick.yPct } : null;
}

/** @deprecated Старая линейная привязка без ориентации — давала один Y для разных рядов. */
function resolveOfferSeatFromSectorDotsOnly(rowNum, seatNum, sectorDots, rowRange) {
  return resolveOfferSeatFromCalibratedCloud(rowNum, seatNum, sectorDots, rowRange, null, {
    rowYPctIncreases: 1,
    seatXPctIncreases: 1,
  });
}

export function buildSectorOfferRowRanges(offers) {
  const bySector = new Map();
  for (const offer of offers) {
    const norm = normalizeSectorLabel(offer.Sector);
    const rowNum = parseNum(offer.Row);
    if (rowNum == null) continue;
    const prev = bySector.get(norm) ?? { min: rowNum, max: rowNum };
    bySector.set(norm, {
      min: Math.min(prev.min, rowNum),
      max: Math.max(prev.max, rowNum),
    });
  }
  return bySector;
}

/**
 * Диапазон номеров рядов для cloud: не только min/max из офферов.
 * Иначе при офферах с ряда 11 первая полоса чаши = «ряд 1» на подписанной схеме.
 */
export function inferCloudSectorRowRange(offerRowRange, bandCount, layoutAnchors = []) {
  const anchorRows = [];
  for (const a of layoutAnchors || []) {
    const r = parseNum(a.row);
    if (r != null) anchorRows.push(r);
  }
  if (anchorRows.length >= 2) {
    return {
      min: Math.min(...anchorRows, offerRowRange?.min ?? 1),
      max: Math.max(...anchorRows, offerRowRange?.max ?? bandCount),
    };
  }
  const offerMax = offerRowRange?.max ?? bandCount;
  const max = Math.max(offerMax, bandCount, 1);
  return { min: 1, max };
}

/** Места в ряду: нумерация с 1, max — по офферу и числу точек в полосе. */
export function inferCloudSeatRangeInRow(seatRangeInRow, seatNum, dotsInRow) {
  const dotN = dotsInRow?.length ?? 0;
  const offerMax = seatRangeInRow?.max ?? seatNum ?? 1;
  const max = Math.max(offerMax, dotN, seatNum ?? 1);
  return { min: 1, max };
}

export function buildSectorDotIndex(allSeatCoordinates, sectorPaths, hallWidth, hallHeight) {
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;
  const sectorBoxes = (sectorPaths || [])
    .map((s) => {
      const label = String(s.label ?? '').trim();
      const path = String(s.path ?? '').trim();
      const b = pathBBox(path);
      if (!label || !b) return null;
      return {
        norm: normalizeSectorLabel(label),
        bbox: {
          minX: (b.minX / w) * 100,
          minY: (b.minY / h) * 100,
          maxX: (b.maxX / w) * 100,
          maxY: (b.maxY / h) * 100,
        },
        area: bboxArea(b),
      };
    })
    .filter(Boolean);

  const dotsBySector = new Map();
  for (const dot of allSeatCoordinates || []) {
    const xPct = Number(dot.xPct);
    const yPct = Number(dot.yPct);
    if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) continue;
    let best = null;
    for (const sb of sectorBoxes) {
      if (!pointInBBox(xPct, yPct, sb.bbox, 0.24)) continue;
      if (!best || sb.area < best.area) best = sb;
    }
    if (!best) continue;
    const arr = dotsBySector.get(best.norm) ?? [];
    arr.push({ xPct, yPct });
    dotsBySector.set(best.norm, arr);
  }
  return dotsBySector;
}

/** Сектора без точек после «самый мелкий bbox» — добираем точки из чаши по расширенному bbox. */
export function fillMissingSectorDotsFromCloud(
  dotsBySector,
  sectorPaths,
  allSeatCoordinates,
  hallWidth,
  hallHeight,
) {
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;
  for (const sp of sectorPaths || []) {
    const norm = normalizeSectorLabel(sp.label);
    if ((dotsBySector.get(norm)?.length ?? 0) >= 4) continue;
    const b = pathBBox(sp.path);
    if (!b) continue;
    const bbox = {
      minX: (b.minX / w) * 100,
      minY: (b.minY / h) * 100,
      maxX: (b.maxX / w) * 100,
      maxY: (b.maxY / h) * 100,
    };
    const arr = [];
    for (const dot of allSeatCoordinates || []) {
      const xPct = Number(dot.xPct);
      const yPct = Number(dot.yPct);
      if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) continue;
      if (!pointInBBox(xPct, yPct, bbox, 0.55)) continue;
      arr.push({ xPct, yPct });
    }
    if (arr.length >= 4) dotsBySector.set(norm, arr);
  }
  return dotsBySector;
}

export function buildSellableSeatGeodesyWithDots(
  layoutSeats,
  allSeatCoordinates,
  sectorPaths,
  hallWidth,
  hallHeight,
  offers,
  svgMarkup = '',
) {
  const strict = buildSellableSeatGeodesy(layoutSeats, offers);
  const allowAnchor = process.env.LUZHNIKI_ENABLE_ANCHOR_GEODESY === '1';
  const allowLegacyDotOnly = process.env.LUZHNIKI_ENABLE_DOT_GEODESY === '1';

  const strictKeys = new Set(
    strict.seats.map((s) => strictSeatKey(s.sector, s.row, s.seat)),
  );

  const extra = [];
  const seen = new Set(strictKeys);
  let anchorInterpolated = 0;
  let cloudMatched = 0;
  let svgRowMatched = 0;
  let cloudSnapMatched = 0;
  let dotMatched = 0;

  const svgRowLabels =
    typeof svgMarkup === 'string' && svgMarkup.includes('<tspan')
      ? parseSvgHallRowLabels(svgMarkup, hallWidth, hallHeight)
      : [];
  const fieldCenterPct = computeFieldCenterPct(allSeatCoordinates);
  const sectorPathByNorm = new Map();
  for (const sp of sectorPaths || []) {
    const norm = normalizeSectorLabel(sp.label);
    const path = String(sp.path ?? '').trim();
    if (norm && path) sectorPathByNorm.set(norm, path);
  }

  const anchorsBySector = new Map();
  for (const s of layoutSeats || []) {
    const norm = normalizeSectorLabel(s.sector);
    const arr = anchorsBySector.get(norm) ?? [];
    arr.push(s);
    anchorsBySector.set(norm, arr);
  }

  let dotsBySector =
    Array.isArray(allSeatCoordinates) && allSeatCoordinates.length >= 6
      ? buildSectorDotIndex(allSeatCoordinates, sectorPaths, hallWidth, hallHeight)
      : new Map();
  if (allSeatCoordinates?.length >= 100) {
    dotsBySector = fillMissingSectorDotsFromCloud(
      dotsBySector,
      sectorPaths,
      allSeatCoordinates,
      hallWidth,
      hallHeight,
    );
  }
  const rowRanges = buildSectorOfferRowRanges(offers);
  const seatRangesByRow = buildSectorOfferSeatRangesByRow(offers);
  const orientationIndex = buildLabeledSectorOrientationIndex(
    layoutSeats,
    sectorPaths,
    hallWidth,
    hallHeight,
  );

  for (const offer of offers) {
    const sector = String(offer.Sector ?? '');
    const row = String(offer.Row ?? '');
    const norm = normalizeSectorLabel(sector);
    const list = Array.isArray(offer.SeatList) ? offer.SeatList.map(String) : [];
    const anchors = anchorsBySector.get(norm) ?? [];
    const sectorDots = dotsBySector.get(norm);
    const rowNum = parseNum(row);
    if (rowNum == null) continue;

    const anchorRows = new Set(anchors.map((a) => parseNum(a.row)).filter((r) => r != null));
    const canAnchor =
      allowAnchor && anchors.length >= 2 && anchorRows.size >= 2;
    const canDotGrid =
      sectorDots && sectorDots.length >= 12 && anchors.length >= 2 && anchorRows.size >= 2;
    const canPlace =
      sectorDots && sectorDots.length >= 4 && rowRanges.has(norm);
    const sectorPath = sectorPathByNorm.get(norm);
    const canSectorNative =
      canPlace && svgRowLabels.length >= 50 && sectorPath && sectorPath.length > 8;
    const canCloud = canPlace;
    const sectorOrientation = pickNearestSectorOrientation(norm, orientationIndex);
    const seatByRow = seatRangesByRow.get(norm);

    for (const seat of list) {
      if (!seat.trim()) continue;
      const key = strictSeatKey(sector, row, seat);
      if (seen.has(key)) continue;

      const seatNum = parseNum(seat);
      let resolved = null;
      let mode = null;

      if (canAnchor) {
        resolved = resolveOfferSeatFromAnchors(rowNum, seatNum, anchors);
        if (resolved) mode = 'anchor';
      }
      if (!resolved && canDotGrid) {
        resolved = resolveOfferSeatOnDotGrid({
          rowNum,
          seatNum,
          layoutAnchors: anchors,
          sectorDots,
        });
        if (resolved) mode = 'dot';
      }
      const sectorRowMax = rowRanges.get(norm)?.max ?? null;
      const seatAlongAxis =
        sectorPath && fieldCenterPct
          ? seatLeftAxisFromSector(sectorPath, fieldCenterPct, hallWidth, hallHeight)
          : null;
      let svgRowPick = null;
      if (sectorPath && svgRowLabels.length > 0) {
        const b = pathBBox(sectorPath);
        const hintXAbs = b ? (b.minX + b.maxX) / 2 : hallWidth / 2;
        const cal = buildSectorRowYPctCalibration(
          sectorPath,
          svgRowLabels,
          hintXAbs,
          hallWidth,
          hallHeight,
        );
        const targetYPct = interpolateSvgRowYPct(rowNum, cal);
        if (targetYPct != null) svgRowPick = { targetYPct };
      }

      if (!resolved && canSectorNative) {
        resolved = resolveOfferSeatSectorNativeLayout(
          rowNum,
          seatNum,
          sectorDots,
          sectorPath,
          svgRowLabels,
          hallWidth,
          hallHeight,
          fieldCenterPct,
          sectorRowMax,
        );
        if (resolved) mode = 'svgRow';
      }
      if (!resolved && canCloud) {
        resolved = resolveOfferSeatFromCalibratedCloud(
          rowNum,
          seatNum,
          sectorDots,
          rowRanges.get(norm),
          seatByRow?.get(rowNum) ?? null,
          sectorOrientation,
          anchors,
          seatAlongAxis,
          svgRowPick,
        );
        if (resolved) mode = 'cloud';
      }
      if (!resolved && allowLegacyDotOnly && canCloud) {
        resolved = resolveOfferSeatFromSectorDotsOnly(
          rowNum,
          seatNum,
          sectorDots,
          rowRanges.get(norm),
        );
        if (resolved) mode = 'dotOnly';
      }
      if (!resolved && canPlace) {
        let targetY = null;
        const axis =
          sectorPath && fieldCenterPct
            ? seatLeftAxisFromSector(sectorPath, fieldCenterPct, hallWidth, hallHeight)
            : null;
        if (sectorPath) {
          targetY = resolveRowYPctFromSvgLabels(
            rowNum,
            sectorPath,
            svgRowLabels,
            hallWidth,
            hallHeight,
            50,
            fieldCenterPct,
            sectorDots,
          );
        }
        if (targetY == null && canCloud) {
          const bands = clusterDotsByRow(sectorDots);
          if (bands.length >= 1) {
            const fullRowRange = inferCloudSectorRowRange(
              rowRanges.get(norm),
              bands.length,
              anchors,
            );
            const span = Math.max(1, fullRowRange.max - fullRowRange.min);
            const t = (rowNum - fullRowRange.min) / span;
            let idx = Math.round(t * (bands.length - 1));
            const orient = sectorOrientation;
            if (orient?.rowYPctIncreases === -1) idx = bands.length - 1 - idx;
            targetY = bands[Math.min(Math.max(idx, 0), bands.length - 1)]?.yPct;
          }
        }
        resolved = resolveOfferSeatSnapInSector(
          sectorDots,
          targetY,
          seatNum,
          seatByRow?.get(rowNum) ?? null,
          0.9,
          axis,
        );
        if (resolved) mode = 'cloudSnap';
      }
      if (!resolved) continue;

      seen.add(key);
      if (mode === 'anchor') anchorInterpolated += 1;
      else if (mode === 'svgRow') svgRowMatched += 1;
      else if (mode === 'cloud') cloudMatched += 1;
      else if (mode === 'cloudSnap') cloudSnapMatched += 1;
      else dotMatched += 1;
      extra.push({
        sector,
        row,
        seat,
        xPct: resolved.xPct,
        yPct: resolved.yPct,
        geodesySource: mode,
      });
    }
  }

  return {
    seats: [...strict.seats, ...extra],
    matched:
      strict.matched +
      anchorInterpolated +
      svgRowMatched +
      cloudMatched +
      cloudSnapMatched +
      dotMatched,
    totalSellable: strict.totalSellable,
    unmatchedSamples: strict.unmatchedSamples,
    strictMatched: strict.matched,
    anchorInterpolated,
    svgRowMatched,
    cloudMatched,
    cloudSnapMatched,
    dotMatched,
  };
}
