/**
 * Дополнение strict-геодезии: места из офферов без снимка tickets подбираются к точкам pbilet
 * по кластерам рядов в allSeatCoordinates (не по интерполяции только из разреженных якорей).
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
  if (rowNum <= pts[0].r) return pts[0].v;
  if (rowNum >= pts[pts.length - 1].r) return pts[pts.length - 1].v;
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

function pickDotNearRowSeat(rowDots, targetY, targetX, maxDist = 0.42) {
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
 * Место оффера на сетке точек сектора: ряд → полоса Y, место → X (калибровка якорями).
 * @returns {{ xPct: number, yPct: number } | null}
 */
export function resolveOfferSeatOnDotGrid({
  rowNum,
  seatNum,
  layoutAnchors,
  sectorDots,
}) {
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

export function buildSellableSeatGeodesyWithDots(
  layoutSeats,
  allSeatCoordinates,
  sectorPaths,
  hallWidth,
  hallHeight,
  offers,
) {
  const strict = buildSellableSeatGeodesy(layoutSeats, offers);
  const strictKeys = new Set(
    strict.seats.map((s) => strictSeatKey(s.sector, s.row, s.seat)),
  );

  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;

  if (!Array.isArray(allSeatCoordinates) || allSeatCoordinates.length < 6) {
    return strict;
  }
  if (!Array.isArray(sectorPaths) || sectorPaths.length === 0) {
    return strict;
  }

  const sectorBoxes = sectorPaths
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
  for (const dot of allSeatCoordinates) {
    const xPct = Number(dot.xPct);
    const yPct = Number(dot.yPct);
    if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) continue;
    let best = null;
    for (const sb of sectorBoxes) {
      if (!pointInBBox(xPct, yPct, sb.bbox, 0.2)) continue;
      if (!best || sb.area < best.area) best = sb;
    }
    if (!best) continue;
    const arr = dotsBySector.get(best.norm) ?? [];
    arr.push({ xPct, yPct });
    dotsBySector.set(best.norm, arr);
  }

  const anchorsBySector = new Map();
  for (const s of layoutSeats) {
    const norm = normalizeSectorLabel(s.sector);
    const arr = anchorsBySector.get(norm) ?? [];
    arr.push(s);
    anchorsBySector.set(norm, arr);
  }

  /** GetBilet «сектор D230» / «d 230» ≠ подпись полигона «Категория 2» — точки чаши по якорям layout.seats. */
  const dotsByTribuneSector = new Map();
  for (const s of layoutSeats) {
    const norm = normalizeSectorLabel(s.sector);
    const xPct = Number(s.xPct);
    const yPct = Number(s.yPct);
    if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) continue;
    let bestBox = null;
    for (const sb of sectorBoxes) {
      if (!pointInBBox(xPct, yPct, sb.bbox, 0.2)) continue;
      if (!bestBox || sb.area < bestBox.area) bestBox = sb;
    }
    if (!bestBox) continue;
    const polyDots = dotsBySector.get(bestBox.norm);
    if (!polyDots?.length) continue;
    const cur = dotsByTribuneSector.get(norm);
    if (!cur || cur.length < polyDots.length) dotsByTribuneSector.set(norm, polyDots);
  }

  const extra = [];
  const seen = new Set(strictKeys);
  let dotMatched = 0;

  for (const offer of offers) {
    const sector = String(offer.Sector ?? '');
    const row = String(offer.Row ?? '');
    const norm = normalizeSectorLabel(sector);
    const list = Array.isArray(offer.SeatList) ? offer.SeatList.map(String) : [];
    const sectorDots = dotsByTribuneSector.get(norm) ?? dotsBySector.get(norm);
    const anchors = anchorsBySector.get(norm) ?? [];
    if (!sectorDots?.length || anchors.length < 2) continue;

    const anchorRows = new Set(anchors.map((a) => parseNum(a.row)).filter((r) => r != null));
    if (anchorRows.size < 2) continue;

    const rowNum = parseNum(row);
    if (rowNum == null) continue;

    for (const seat of list) {
      if (!seat.trim()) continue;
      const key = strictSeatKey(sector, row, seat);
      if (seen.has(key)) continue;

      const seatNum = parseNum(seat);
      const dot = resolveOfferSeatOnDotGrid({
        rowNum,
        seatNum,
        layoutAnchors: anchors,
        sectorDots,
      });
      if (!dot) continue;

      seen.add(key);
      dotMatched += 1;
      extra.push({ sector, row, seat, xPct: dot.xPct, yPct: dot.yPct });
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
