/**
 * Угловые сектора: билинейная / radial сетка по 4 углам sector-row-anchors.json.
 * A-трибуна: bilinear + rowCurve (дуга рядов). B/C — классический polar без изгиба.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadSectorCalibrationBlocksByNorm } from './hallSeatGeodesySectorRowAnchors.js';
import { getSectorBboxPct } from './luzhnikiSectorBbox.js';
import { normalizeSectorLabel, luzhnikiSectorLookupNorms } from './ticketHallSectorNormalize.js';
import { resolveCornerSectorPbiletStepGrid } from './luzhnikiPbiletGridSpacing.js';
import { interpolateSeatFromCornerAnchors } from './luzhnikiSeatWarp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let cachedTickets = null;

function loadTicketsPayload() {
  if (cachedTickets) return cachedTickets;
  try {
    cachedTickets = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../tickets.json'), 'utf8'),
    );
  } catch {
    cachedTickets = null;
  }
  return cachedTickets;
}

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

/** Угловые A: пока только A101 (остальные A — fieldGrid, см. тест a216). */
export const SECTOR_RADIAL_PRIORITY_NORMS = new Set(['a101']);

/**
 * @param {string} norm
 */
export function prefersSectorRadialCorner(norm) {
  return SECTOR_RADIAL_PRIORITY_NORMS.has(normalizeSectorLabel(norm));
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
  let normHit = '';
  for (const norm of luzhnikiSectorLookupNorms(sectorLabel)) {
    const b = blocks.get(norm);
    if (b?.anchors?.length >= 4) {
      block = b;
      normHit = norm;
      break;
    }
  }
  if (!block?.anchors) return null;

  const usePbiletStepGrid = SECTOR_RADIAL_PRIORITY_NORMS.has(normHit);
  if (usePbiletStepGrid) {
    const tickets = loadTicketsPayload();
    const sectorBbox = tickets
      ? getSectorBboxPct(tickets, block.sectorLabel || sectorLabel, 11413, 9676)
      : null;
    const pt = resolveCornerSectorPbiletStepGrid(block.anchors, apiRow, apiSeat, {
      rowCurve: Number(block.rowCurve ?? 0.32),
      rowStepMultiplier: Number(block.rowStepMultiplier ?? 1),
      rowBendExtraDeg: Number(block.rowBendExtraDeg ?? 0),
      originRow: block.originRow,
      originSeat: block.originSeat,
      minSeatPerRow: block.minSeatPerRow,
      maxSeatPerRow: block.maxSeatPerRow,
      seatCountFromRight: block.seatCountFromRight,
      sectorBbox,
    });
    if (!pt || !Number.isFinite(pt.xPct) || !Number.isFinite(pt.yPct)) return null;
    return {
      sector: sectorLabel,
      row: String(apiRow),
      seat: String(apiSeat),
      xPct: pt.xPct,
      yPct: pt.yPct,
      geodesySource: 'radialGrid+d124step',
    };
  }

  const useRadialCurve = Number(block.rowCurve) > 0;
  if (useRadialCurve) {
    const pt = interpolateSeatFromCornerAnchors(
      block.anchors,
      apiRow,
      apiSeat,
      Number(block.rowCurve ?? 0.32),
    );
    if (!pt || !Number.isFinite(pt.xPct) || !Number.isFinite(pt.yPct)) return null;
    return {
      sector: sectorLabel,
      row: String(apiRow),
      seat: String(apiSeat),
      xPct: pt.xPct,
      yPct: pt.yPct,
      geodesySource: 'radialGrid',
    };
  }

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
