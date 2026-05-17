/**
 * Билинейная сетка по 4 углам sector-row-anchors.json (сектора без r[] в tickets).
 */

import { loadSectorCalibrationBlocksByNorm } from './hallSeatGeodesySectorRowAnchors.js';
import { luzhnikiSectorLookupNorms } from './ticketHallSectorNormalize.js';

function parseNum(value) {
  const n = Number.parseInt(String(value ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function lerp(a, b, t) {
  return {
    xPct: a.xPct + (b.xPct - a.xPct) * t,
    yPct: a.yPct + (b.yPct - a.yPct) * t,
  };
}

function clamp01(t) {
  return Math.max(0, Math.min(1, t));
}

/**
 * @param {string} sectorLabel
 * @param {string} apiRow
 * @param {string} apiSeat
 */
export function resolvePolarGridSeatFromAnchors(sectorLabel, apiRow, apiSeat) {
  const rowN = parseNum(apiRow);
  const seatN = parseNum(apiSeat);
  if (rowN == null || seatN == null) return null;

  const blocks = loadSectorCalibrationBlocksByNorm();
  let block = null;
  for (const norm of luzhnikiSectorLookupNorms(sectorLabel)) {
    const b = blocks.get(norm);
    if (b?.anchors?.length >= 4) {
      block = b;
      break;
    }
  }
  if (!block?.anchors) return null;

  const byRole = Object.fromEntries(
    block.anchors
      .filter((a) => a.role)
      .map((a) => [
        a.role,
        { row: parseNum(a.row), seat: parseNum(a.seat), xPct: Number(a.xPct), yPct: Number(a.yPct) },
      ]),
  );
  const nearL = byRole.nearLeft;
  const nearR = byRole.nearRight;
  const farL = byRole.farLeft;
  const farR = byRole.farRight;
  if (!nearL || !nearR || !farL || !farR) return null;

  const rowNums = [nearL.row, nearR.row, farL.row, farR.row].filter((n) => n != null);
  const rMin = Math.min(...rowNums);
  const rMax = Math.max(...rowNums);
  const tRow = rMax > rMin ? clamp01((rowN - rMin) / (rMax - rMin)) : 0;

  const tSeatNear =
    nearR.seat > nearL.seat ? clamp01((seatN - nearL.seat) / (nearR.seat - nearL.seat)) : 0;
  const tSeatFar = farR.seat > farL.seat ? clamp01((seatN - farL.seat) / (farR.seat - farL.seat)) : 0;

  const pNear = lerp(nearL, nearR, tSeatNear);
  const pFar = lerp(farL, farR, tSeatFar);
  const p = lerp(pNear, pFar, tRow);

  if (!Number.isFinite(p.xPct) || !Number.isFinite(p.yPct)) return null;

  return {
    sector: sectorLabel,
    row: String(apiRow),
    seat: String(apiSeat),
    xPct: p.xPct,
    yPct: p.yPct,
    geodesySource: 'polarGrid',
  };
}
