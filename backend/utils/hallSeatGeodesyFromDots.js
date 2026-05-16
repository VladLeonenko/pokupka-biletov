/**
 * Координаты продаваемых мест из allSeatCoordinates (pbilet hall-layout) + калибровка по layout_json.seats.
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

/** Грубый bbox SVG path (достаточно для клиньев трибун). */
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

function collectDotsInRowBand(dots, targetY, halfBandPct = 0.32) {
  return dots.filter((d) => Math.abs(d.yPct - targetY) <= halfBandPct);
}

function clusterByY(dots, tolerancePct) {
  const sorted = [...dots].sort((a, b) => a.yPct - b.yPct || a.xPct - b.xPct);
  const clusters = [];
  for (const d of sorted) {
    const last = clusters[clusters.length - 1];
    if (!last || Math.abs(d.yPct - last.meanY) > tolerancePct) {
      clusters.push({ meanY: d.yPct, dots: [d] });
    } else {
      last.dots.push(d);
      last.meanY = last.dots.reduce((s, p) => s + p.yPct, 0) / last.dots.length;
    }
  }
  return clusters;
}

function fitRowYCalibration(anchors) {
  const pts = anchors
    .map((a) => ({ rowNum: parseNum(a.row), yPct: a.yPct }))
    .filter((p) => p.rowNum != null && Number.isFinite(p.yPct));
  if (pts.length === 0) return null;
  if (pts.length === 1) {
    const p = pts[0];
    return { predict: () => p.yPct };
  }
  const n = pts.length;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;
  for (const { rowNum, yPct } of pts) {
    sumX += rowNum;
    sumY += yPct;
    sumXX += rowNum * rowNum;
    sumXY += rowNum * yPct;
  }
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-9) {
    const meanY = sumY / n;
    return { predict: () => meanY };
  }
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return {
    predict: (rowNum) => slope * rowNum + intercept,
  };
}

function fitSeatXCalibration(anchors) {
  const pts = anchors
    .map((a) => ({ seatNum: parseNum(a.seat), xPct: a.xPct }))
    .filter((p) => p.seatNum != null && Number.isFinite(p.xPct));
  if (pts.length === 0) return null;
  if (pts.length === 1) {
    const p = pts[0];
    return { predict: () => p.xPct };
  }
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
  if (Math.abs(denom) < 1e-9) {
    const meanX = sumY / n;
    return { predict: () => meanX };
  }
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return {
    predict: (seatNum) => slope * seatNum + intercept,
  };
}

function pickDotBySeatX(rowDots, seatNum, seatAnchors) {
  const cal = fitSeatXCalibration(seatAnchors);
  if (cal && seatNum != null) {
    const targetX = cal.predict(seatNum);
    let best = null;
    let bestD = Infinity;
    for (const d of rowDots) {
      const dist = Math.abs(d.xPct - targetX);
      if (dist < bestD) {
        bestD = dist;
        best = d;
      }
    }
    if (best && bestD < 3.2) return best;
  }
  if (seatNum == null) return null;
  const sorted = [...rowDots].sort((a, b) => a.xPct - b.xPct);
  const idx = seatNum - 1;
  if (idx >= 0 && idx < sorted.length) return sorted[idx];
  return null;
}

/**
 * @param {{ sector: string, row: string, seat: string, xPct: number, yPct: number }[]} layoutSeats
 * @param {{ xPct: number, yPct: number }[]} allSeatCoordinates
 * @param {{ label: string, path: string }[]} sectorPaths
 * @param {number} hallWidth
 * @param {number} hallHeight
 * @param {{ Sector?: string, Row?: string, SeatList?: string[] }[]} offers
 */
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

  if (!Array.isArray(allSeatCoordinates) || allSeatCoordinates.length < 4) {
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
        label,
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

  /** @type {Map<string, { xPct: number, yPct: number }[]>} */
  const dotsBySector = new Map();
  for (const dot of allSeatCoordinates) {
    const xPct = Number(dot.xPct);
    const yPct = Number(dot.yPct);
    if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) continue;
    let best = null;
    for (const sb of sectorBoxes) {
      if (!pointInBBox(xPct, yPct, sb.bbox, 0.25)) continue;
      if (!best || sb.area < best.area) best = sb;
    }
    if (!best) continue;
    const arr = dotsBySector.get(best.norm) ?? [];
    arr.push({ xPct, yPct });
    dotsBySector.set(best.norm, arr);
  }

  /** @type {Map<string, { sector: string, row: string, seat: string, xPct: number, yPct: number }[]>} */
  const anchorsBySector = new Map();
  for (const s of layoutSeats) {
    const norm = normalizeSectorLabel(s.sector);
    const arr = anchorsBySector.get(norm) ?? [];
    arr.push(s);
    anchorsBySector.set(norm, arr);
  }

  const extra = [];
  const seen = new Set(strictKeys);
  let dotMatched = 0;

  for (const offer of offers) {
    const sector = String(offer.Sector ?? '');
    const row = String(offer.Row ?? '');
    const norm = normalizeSectorLabel(sector);
    const list = Array.isArray(offer.SeatList) ? offer.SeatList.map(String) : [];
    const dots = dotsBySector.get(norm);
    if (!dots?.length) continue;

    const anchors = anchorsBySector.get(norm) ?? [];
    const rowNum = parseNum(row);
    if (rowNum == null) continue;

    const rowCal = fitRowYCalibration(anchors);
    if (!rowCal) continue;

    const targetY = rowCal.predict(rowNum);
    const rowDots = collectDotsInRowBand(dots, targetY, 0.32);
    if (rowDots.length === 0) continue;

    const rowAnchors = anchors.filter(
      (a) => normalizeRowLabel(a.row) === normalizeRowLabel(row),
    );

    for (const seat of list) {
      if (!seat.trim()) continue;
      const key = strictSeatKey(sector, row, seat);
      if (seen.has(key)) continue;

      const seatNum = parseNum(seat);
      const dot = pickDotBySeatX(rowDots, seatNum, rowAnchors);
      if (!dot) continue;

      seen.add(key);
      dotMatched += 1;
      extra.push({
        sector,
        row,
        seat,
        xPct: dot.xPct,
        yPct: dot.yPct,
      });
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
