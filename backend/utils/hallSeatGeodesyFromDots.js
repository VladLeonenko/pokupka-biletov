/**
 * Дополнение strict-геодезии: офферы без точного hit в layout.seats —
 * координаты только из якорей layout.seats (ряд/место), без привязки к облаку allSeatCoordinates
 * (иначе ряд 32 рисуется на полосе 29).
 */

import { buildSellableSeatGeodesy } from './hallSeatGeodesyMatch.js';
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

/** Горизонтальные полосы рядов по плотности точек чаши. */
export function clusterDotsByRow(dots, eps = 0.2) {
  if (!dots?.length) return [];
  const sorted = [...dots].sort((a, b) => a.yPct - b.yPct || a.xPct - b.xPct);
  const bands = [];
  let cur = [sorted[0]];
  for (let i = 1; i < sorted.length; i += 1) {
    const d = sorted[i];
    const meanY = cur.reduce((s, p) => s + p.yPct, 0) / cur.length;
    if (d.yPct - meanY <= eps) cur.push(d);
    else {
      bands.push(cur);
      cur = [d];
    }
  }
  bands.push(cur);
  return bands
    .filter((pts) => pts.length >= 2)
    .map((pts) => ({
      yPct: pts.reduce((s, p) => s + p.yPct, 0) / pts.length,
      dots: pts,
    }));
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

const MAX_ROW_EXTRAPOLATION = 4;

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
  if (rowNum < minR - MAX_ROW_EXTRAPOLATION || rowNum > maxR + MAX_ROW_EXTRAPOLATION) {
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

export function buildSellableSeatGeodesyWithDots(
  layoutSeats,
  _allSeatCoordinates,
  _sectorPaths,
  _hallWidth,
  _hallHeight,
  offers,
) {
  const strict = buildSellableSeatGeodesy(layoutSeats, offers);
  const strictKeys = new Set(
    strict.seats.map((s) => strictSeatKey(s.sector, s.row, s.seat)),
  );

  if (!Array.isArray(layoutSeats) || layoutSeats.length < 2) {
    return strict;
  }

  const anchorsBySector = new Map();
  for (const s of layoutSeats) {
    const norm = normalizeSectorLabel(s.sector);
    const arr = anchorsBySector.get(norm) ?? [];
    arr.push(s);
    anchorsBySector.set(norm, arr);
  }

  /** GetBilet «сектор D230» / «d 230» ≠ подпись полигона «Категория 2» — точки чаши по якорям layout.seats. */
  const extra = [];
  const seen = new Set(strictKeys);
  let dotMatched = 0;

  for (const offer of offers) {
    const sector = String(offer.Sector ?? '');
    const row = String(offer.Row ?? '');
    const norm = normalizeSectorLabel(sector);
    const list = Array.isArray(offer.SeatList) ? offer.SeatList.map(String) : [];
    const anchors = anchorsBySector.get(norm) ?? [];
    if (anchors.length < 2) continue;

    const anchorRows = new Set(anchors.map((a) => parseNum(a.row)).filter((r) => r != null));
    if (anchorRows.size < 2) continue;

    const rowNum = parseNum(row);
    if (rowNum == null) continue;

    for (const seat of list) {
      if (!seat.trim()) continue;
      const key = strictSeatKey(sector, row, seat);
      if (seen.has(key)) continue;

      const seatNum = parseNum(seat);
      const resolved = resolveOfferSeatFromAnchors(rowNum, seatNum, anchors);
      if (!resolved) continue;

      seen.add(key);
      dotMatched += 1;
      extra.push({ sector, row, seat, xPct: resolved.xPct, yPct: resolved.yPct });
    }
  }

  return {
    seats: [...strict.seats, ...extra],
    matched: strict.matched + dotMatched,
    totalSellable: strict.totalSellable,
    unmatchedSamples: strict.unmatchedSamples,
    dotMatched,
  };
}
