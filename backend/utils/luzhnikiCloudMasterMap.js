/**
 * Master Map = только точки из luzhniki.txt (~77k).
 * Без R_mean, без виртуальных дуг, без fieldGrid-интерполяции координат.
 */

import { buildLabeledSeatIndex, lookupLabeledSeat } from './hallSeatGeodesyMatch.js';
import { computeFieldCenterPct } from './hallSeatGeodesySectorNative.js';
import {
  buildFullCloudGridLabeledSeats,
  buildLuzhnikiCloudGridIndex,
  interpolateBandToApiRow,
  resolveCloudGridSeat,
} from './luzhnikiCloudGridSeatIndex.js';
import { extractPbiletCoordinatesSeatDots } from './luzhnikiPbiletGeodesyExtract.js';
import { normalizeSectorLabel } from './ticketHallSectorNormalize.js';

function parseNum(value) {
  const n = parseInt(String(value ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function toHall(dot, w, h) {
  return { x: (dot.xPct / 100) * w, y: (dot.yPct / 100) * h };
}

export function useCloudMasterMap() {
  const v = String(process.env.LUZHNIKI_CLOUD_MASTER ?? '0').trim().toLowerCase();
  return v === '1' || v === 'true';
}

let cachedCloudMasterIndex = null;

export function getCachedCloudMasterIndex(input = {}) {
  if (!cachedCloudMasterIndex) {
    cachedCloudMasterIndex = buildCloudMasterIndex(input);
  }
  return cachedCloudMasterIndex;
}

export function resetCloudMasterIndexCache() {
  cachedCloudMasterIndex = null;
}

/**
 * Индекс облака: grids + labeledIndex (sector|row|seat → точка чаши).
 */
export function buildCloudMasterIndex(input = {}) {
  const built = buildFullCloudGridLabeledSeats(input);
  const cloudIndex = buildLuzhnikiCloudGridIndex(input);
  const labeledSeats = built.seats.filter((s) => s.geodesySource === 'cloudGrid');
  const labeledIndex = buildLabeledSeatIndex(labeledSeats);
  return {
    ...cloudIndex,
    labeledSeats,
    labeledIndex,
    sectorPaths: built.sectorPaths,
    hallWidth: built.hallWidth,
    hallHeight: built.hallHeight,
    stats: built.stats,
  };
}

/** Snap sellable → точная координата узла Master Map (не интерполяция). */
export function snapToCloudMaster(masterIndex, sector, row, seat) {
  const norm = normalizeSectorLabel(sector);
  const exact = lookupLabeledSeat(masterIndex.labeledIndex, sector, row, seat);
  if (exact) {
    return {
      sector,
      row: String(row),
      seat: String(seat),
      xPct: exact.xPct,
      yPct: exact.yPct,
      geodesySource: 'cloudMaster',
    };
  }

  const grid = masterIndex.gridsByNorm.get(norm);
  const cal = masterIndex.calibrationsByNorm.get(norm);
  if (grid && cal) {
    const hit = resolveCloudGridSeat(grid, cal, String(row), String(seat));
    if (hit) {
      return {
        sector,
        row: String(row),
        seat: String(seat),
        xPct: hit.xPct,
        yPct: hit.yPct,
        geodesySource: 'cloudMaster',
      };
    }
  }

  const targetRow = parseNum(row);
  const targetSeat = parseNum(seat);
  let best = null;
  let bestScore = Infinity;
  for (const s of masterIndex.labeledSeats) {
    if (normalizeSectorLabel(s.sector) !== norm) continue;
    if (targetRow && parseNum(s.row) !== targetRow) continue;
    const seatD = Math.abs(parseNum(s.seat) - targetSeat);
    if (seatD < bestScore) {
      bestScore = seatD;
      best = s;
    }
  }
  if (!best) return null;
  return {
    sector,
    row: String(row),
    seat: String(seat),
    xPct: best.xPct,
    yPct: best.yPct,
    geodesySource: 'cloudMaster',
  };
}

function normSectorFilter(sectorLabel, filter) {
  if (!filter?.trim()) return true;
  const f = filter.trim().toLowerCase();
  const s = String(sectorLabel).trim().toLowerCase();
  return s.includes(f) || f.includes(s);
}

/**
 * Диагностика: полилинии только через фактические точки чаши (пиксель в пиксель).
 */
export function buildCloudMasterDiagnosticGrid(opts) {
  const w = Number(opts.hallWidth) > 0 ? Number(opts.hallWidth) : 11413;
  const h = Number(opts.hallHeight) > 0 ? Number(opts.hallHeight) : 9676;
  const sectorFilter = opts.sectorFilter?.trim() ?? '';
  const maxCols = Number(opts.maxColumnsPerSector) > 0 ? Number(opts.maxColumnsPerSector) : 16;

  const masterIndex =
    opts.masterIndex ??
    buildCloudMasterIndex({
      ticketsPayload: opts.ticketsPayload,
      coordinatesPayload: opts.coordinatesPayload,
      allSeatCoordinates: opts.allSeatCoordinates,
      hallWidth: w,
      hallHeight: h,
    });

  const cloudDots = opts.allSeatCoordinates?.length
    ? opts.allSeatCoordinates
    : masterIndex.labeledSeats;

  const seats = (opts.labeledSeats?.length ? opts.labeledSeats : masterIndex.labeledSeats).filter(
    (s) => normSectorFilter(s.sector, sectorFilter),
  );

  const bySector = new Map();
  for (const s of seats) {
    const norm = normalizeSectorLabel(s.sector);
    if (!bySector.has(norm)) bySector.set(norm, { label: s.sector, rows: new Map() });
    const sec = bySector.get(norm);
    const rk = String(s.row);
    if (!sec.rows.has(rk)) sec.rows.set(rk, []);
    sec.rows.get(rk).push(s);
  }

  const rowLines = [];
  const columnLines = [];
  let sectorCount = 0;

  for (const [, sec] of bySector) {
    sectorCount += 1;
    const rowEntries = [...sec.rows.entries()].sort(
      (a, b) => parseNum(a[0]) - parseNum(b[0]) || a[0].localeCompare(b[0]),
    );

    for (const [rowId, rowSeats] of rowEntries) {
      const sorted = [...rowSeats].sort((a, b) => parseNum(a.seat) - parseNum(b.seat));
      if (sorted.length < 2) continue;
      rowLines.push({
        sector: sec.label,
        kind: 'row',
        source: 'cloudDot',
        rowId,
        points: sorted.map((d) => toHall(d, w, h)),
      });
    }

    const seatNums = new Set();
    for (const [, rowSeats] of rowEntries) {
      for (const s of rowSeats) seatNums.add(parseNum(s.seat));
    }
    const seatList = [...seatNums].filter((n) => n > 0).sort((a, b) => a - b);
    const colPick =
      seatList.length <= maxCols
        ? seatList
        : (() => {
            const set = new Set([seatList[0], seatList[seatList.length - 1]]);
            const step = Math.max(1, Math.ceil(seatList.length / maxCols));
            for (let i = 0; i < seatList.length; i += step) set.add(seatList[i]);
            return [...set].sort((a, b) => a - b);
          })();

    for (const sn of colPick) {
      const colPts = [];
      for (const [rowId, rowSeats] of rowEntries) {
        const hit = rowSeats.find((s) => parseNum(s.seat) === sn);
        if (hit) colPts.push({ rowNum: parseNum(rowId), dot: hit });
      }
      colPts.sort((a, b) => a.rowNum - b.rowNum);
      if (colPts.length < 2) continue;
      columnLines.push({
        sector: sec.label,
        kind: 'column',
        source: 'cloudDot',
        seat: String(sn),
        points: colPts.map((p) => toHall(p.dot, w, h)),
      });
    }
  }

  const fieldCenter = computeFieldCenterPct(cloudDots);

  return {
    rowLines,
    columnLines,
    hallWidth: w,
    hallHeight: h,
    sectorCount,
    dotCount: seats.length,
    cloudDotCount: masterIndex.stats?.coordinateDots ?? cloudDots.length,
    fieldCenter,
    masterMap: true,
    labeledSeatCount: seats.length,
  };
}
