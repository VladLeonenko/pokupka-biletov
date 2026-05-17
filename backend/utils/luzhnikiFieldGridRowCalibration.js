/**
 * Калибровка номера ряда fieldGrid по strict tickets.
 * Один pbilet-ряд может пересекать несколько band-кластеров — rowNumToBandIndex даёт сдвиг ~4–10 рядов.
 */

import { normalizeSectorLabel, strictSeatKey } from './ticketHallSectorNormalize.js';
import { rowAxisFromSector, seatLeftAxisFromSector } from './hallSeatGeodesySectorNative.js';

function parseNum(value) {
  const n = Number.parseInt(String(value ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {{ sector: string, row: string, seat: string, xPct: number, yPct: number }[]} strictSeats
 * @returns {{ rowNum: number, rowCoord: number }[]} отсортировано по rowCoord
 */
export function buildSectorRowCalibrationFromStrict(
  strictSeats,
  sectorPath,
  fieldCenterPct,
  hallWidth,
  hallHeight,
) {
  if (!strictSeats?.length || !sectorPath) return [];
  const rowAxis = rowAxisFromSector(sectorPath, fieldCenterPct, hallWidth, hallHeight);
  const byRow = new Map();

  for (const s of strictSeats) {
    const rowNum = parseNum(s.row);
    if (rowNum == null) continue;
    const rowCoord = s.xPct * rowAxis.x + s.yPct * rowAxis.y;
    if (!byRow.has(rowNum)) byRow.set(rowNum, { sum: 0, n: 0 });
    const acc = byRow.get(rowNum);
    acc.sum += rowCoord;
    acc.n += 1;
  }

  const points = [];
  for (const [rowNum, acc] of byRow) {
    if (acc.n < 1) continue;
    points.push({ rowNum, rowCoord: acc.sum / acc.n });
  }
  points.sort((a, b) => a.rowCoord - b.rowCoord);
  return points;
}

/** rowCoord → номер ряда pbilet (линейная интерполяция между якорями strict). */
export function inferRowNumFromRowCoord(rowCoord, calibration) {
  if (!calibration?.length) return null;
  if (calibration.length === 1) return calibration[0].rowNum;

  if (rowCoord <= calibration[0].rowCoord) return calibration[0].rowNum;
  const last = calibration[calibration.length - 1];
  if (rowCoord >= last.rowCoord) return last.rowNum;

  for (let i = 0; i < calibration.length - 1; i += 1) {
    const a = calibration[i];
    const b = calibration[i + 1];
    if (rowCoord < a.rowCoord || rowCoord > b.rowCoord) continue;
    const span = b.rowCoord - a.rowCoord;
    if (Math.abs(span) < 1e-9) return a.rowNum;
    const t = (rowCoord - a.rowCoord) / span;
    return Math.round(a.rowNum + t * (b.rowNum - a.rowNum));
  }

  let best = calibration[0];
  let bestD = Math.abs(rowCoord - best.rowCoord);
  for (const p of calibration) {
    const d = Math.abs(rowCoord - p.rowCoord);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best.rowNum;
}

function seatSortKey(dot, axis) {
  return dot.xPct * axis.x + dot.yPct * axis.y;
}

/**
 * fieldGrid: каждая точка чаши → ряд по калибровке strict, места 1…N вдоль seatLeftAxis.
 */
const STRICT_SNAP_RADIUS_PCT = 0.22;

function snapDotRowFromStrict(dot, strictSeats) {
  let bestRow = null;
  let bestD = STRICT_SNAP_RADIUS_PCT;
  for (const st of strictSeats || []) {
    const d = Math.hypot(dot.xPct - st.xPct, dot.yPct - st.yPct);
    if (d < bestD) {
      bestD = d;
      bestRow = st.row;
    }
  }
  return bestRow;
}

export function buildFieldGridSeatsFromStrictCalibration({
  sectorLabel,
  sectorDots,
  sectorPath,
  calibration,
  fieldCenterPct,
  hallWidth,
  hallHeight,
  seenKeys,
  strictSeats = [],
}) {
  if (!calibration?.length || calibration.length < 2 || !sectorDots?.length) return [];

  const rowAxis = rowAxisFromSector(sectorPath, fieldCenterPct, hallWidth, hallHeight);
  const seatAxis = seatLeftAxisFromSector(sectorPath, fieldCenterPct, hallWidth, hallHeight);
  const byRow = new Map();

  for (const dot of sectorDots) {
    const snappedRow = snapDotRowFromStrict(dot, strictSeats);
    let rowLabel = snappedRow;
    if (rowLabel == null) {
      const rowCoord = dot.xPct * rowAxis.x + dot.yPct * rowAxis.y;
      const rowNum = inferRowNumFromRowCoord(rowCoord, calibration);
      if (rowNum == null) continue;
      rowLabel = String(rowNum);
    }
    if (!byRow.has(rowLabel)) byRow.set(rowLabel, []);
    byRow.get(rowLabel).push(dot);
  }

  const out = [];
  for (const [rowLabel, dots] of byRow) {
    const sorted = [...dots].sort((a, b) => seatSortKey(a, seatAxis) - seatSortKey(b, seatAxis));
    for (let i = 0; i < sorted.length; i += 1) {
      const seatLabel = String(i + 1);
      const key = strictSeatKey(sectorLabel, rowLabel, seatLabel);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      const dot = sorted[i];
      out.push({
        sector: sectorLabel,
        row: rowLabel,
        seat: seatLabel,
        xPct: dot.xPct,
        yPct: dot.yPct,
        geodesySource: 'fieldGrid',
      });
    }
  }
  return out;
}

/** @param {Map<string, { sector: string, row: string, seat: string, xPct: number, yPct: number }[]>} strictBySectorNorm */
export function groupStrictSeatsBySectorNorm(strictSeats) {
  const map = new Map();
  for (const s of strictSeats || []) {
    const norm = normalizeSectorLabel(s.sector);
    if (!norm) continue;
    if (!map.has(norm)) map.set(norm, []);
    map.get(norm).push(s);
  }
  return map;
}
