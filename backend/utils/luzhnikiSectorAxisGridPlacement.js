/**
 * Расстановка sellable по осям сектора (логика диагностики Лужников).
 *
 * Для агентов / других секторов:
 * 1. Собрать якоря из layout.seats сектора (или sector-row-anchors.json).
 * 2. buildSectorAxisGridModel(anchors) → шаги ряда/места и оси.
 * 3. resolveSeatOnSectorAxisGrid(model, rowNum, seatNum, seatRangeInRow) → { xPct, yPct }.
 *
 * Ряд = линия (одна координата фиксирована), места = шаг вдоль второй оси.
 * Если ряда нет в layout (прорезь B154: 17 между 16 и 27) — не lerp на дальний блок,
 * а rowLo + (target − rowLo) * rowStep, когда ближе к нижнему ряду.
 */

import { normalizeSectorLabel, luzhnikiSectorLookupNorms } from './ticketHallSectorNormalize.js';

/** Сектора, где sellable всегда через axisGrid (не fieldGrid). */
export const SECTOR_AXIS_GRID_PRIORITY_NORMS = new Set(['a101', 'b154']);

/**
 * @param {unknown} ticketsPayload
 * @param {string} norm
 */
export function ticketsSectorHasNoRows(ticketsPayload, norm) {
  const norms = new Set(luzhnikiSectorLookupNorms(norm));
  const sectors = /** @type {{ i?: string, r?: unknown[] }[] | undefined} */ (
    ticketsPayload?.sectors
  );
  if (!Array.isArray(sectors)) return false;
  for (const sec of sectors) {
    const n = normalizeSectorLabel(sec?.i);
    if (!norms.has(n)) continue;
    const rows = sec?.r;
    return !Array.isArray(rows) || rows.length === 0;
  }
  return false;
}

/**
 * axisGrid вместо fieldGrid: нет r[] в tickets + 4 угла в sector-row-anchors (или явный список).
 * @param {string} norm
 * @param {unknown} [ticketsPayload]
 */
/** @param {string} norm @param {unknown} [_ticketsPayload] — зарезервировано под авто-список A-секторов */
export function prefersSectorAxisGrid(norm, _ticketsPayload = null) {
  return SECTOR_AXIS_GRID_PRIORITY_NORMS.has(normalizeSectorLabel(norm));
}

function parseNum(value) {
  const n = Number.parseInt(String(value ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function median(values) {
  if (!values?.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function hypot(dx, dy) {
  return Math.hypot(dx, dy);
}

function addPct(a, dx, dy) {
  return { xPct: a.xPct + dx, yPct: a.yPct + dy };
}

function lerpPct(a, b, t) {
  return {
    xPct: a.xPct + (b.xPct - a.xPct) * t,
    yPct: a.yPct + (b.yPct - a.yPct) * t,
  };
}

/**
 * @param {{ sector?: string, row: string|number, seat: string|number, xPct: number, yPct: number }[]} anchors
 * @param {string} [sectorLabel]
 */
export function buildSectorAxisGridModel(anchors, sectorLabel = '') {
  const norms = new Set(luzhnikiSectorLookupNorms(sectorLabel || anchors[0]?.sector || ''));
  const seats = (anchors || []).filter(
    (s) =>
      Number.isFinite(s.xPct) &&
      Number.isFinite(s.yPct) &&
      parseNum(s.row) != null &&
      parseNum(s.seat) != null &&
      (!norms.size ||
        !s.sector ||
        norms.has(normalizeSectorLabel(s.sector))),
  );
  if (seats.length < 2) return null;

  const byRow = new Map();
  for (const s of seats) {
    const r = parseNum(s.row);
    const arr = byRow.get(r) ?? [];
    arr.push({
      seat: parseNum(s.seat),
      xPct: s.xPct,
      yPct: s.yPct,
    });
    byRow.set(r, arr);
  }

  for (const arr of byRow.values()) {
    arr.sort((a, b) => a.seat - b.seat);
  }

  const rowNums = [...byRow.keys()].sort((a, b) => a - b);
  const rowCentroids = new Map();
  for (const r of rowNums) {
    const arr = byRow.get(r);
    let sx = 0;
    let sy = 0;
    for (const d of arr) {
      sx += d.xPct;
      sy += d.yPct;
    }
    rowCentroids.set(r, { xPct: sx / arr.length, yPct: sy / arr.length });
  }

  const rowDeltas = [];
  for (let i = 1; i < rowNums.length; i += 1) {
    const a = rowCentroids.get(rowNums[i - 1]);
    const b = rowCentroids.get(rowNums[i]);
    const dr = rowNums[i] - rowNums[i - 1];
    if (dr > 0) {
      rowDeltas.push({
        dx: (b.xPct - a.xPct) / dr,
        dy: (b.yPct - a.yPct) / dr,
      });
    }
  }

  const seatDeltas = [];
  for (const arr of byRow.values()) {
    if (arr.length < 2) continue;
    for (let i = 1; i < arr.length; i += 1) {
      const ds = arr[i].seat - arr[i - 1].seat;
      if (ds > 0) {
        seatDeltas.push({
          dx: (arr[i].xPct - arr[i - 1].xPct) / ds,
          dy: (arr[i].yPct - arr[i - 1].yPct) / ds,
        });
      }
    }
  }

  const rowStep = {
    xPct: median(rowDeltas.map((d) => d.dx)) ?? 0,
    yPct: median(rowDeltas.map((d) => d.dy)) ?? 0,
  };
  const seatStep = {
    xPct: median(seatDeltas.map((d) => d.dx)) ?? 0,
    yPct: median(seatDeltas.map((d) => d.dy)) ?? 0,
  };

  const xs = seats.map((s) => s.xPct);
  const ys = seats.map((s) => s.yPct);
  const xSpan = Math.max(...xs) - Math.min(...xs);
  const ySpan = Math.max(...ys) - Math.min(...ys);

  /** На B154 ряд ≈ горизонталь на схеме: в ряду меняется X, Y ряда общий. */
  const rowIsHorizontal = xSpan >= ySpan;

  return {
    rowNums,
    byRow,
    rowCentroids,
    rowStep,
    seatStep,
    rowIsHorizontal,
  };
}

function rowAnchorForTarget(model, rowNum) {
  if (model.rowCentroids.has(rowNum)) {
    return { ...model.rowCentroids.get(rowNum) };
  }

  const rows = model.rowNums;
  let lower = null;
  let upper = null;
  for (const r of rows) {
    if (r < rowNum) lower = r;
    if (r > rowNum && upper == null) upper = r;
  }

  if (lower != null && upper != null) {
    const dLo = rowNum - lower;
    const dHi = upper - rowNum;
    const cLo = model.rowCentroids.get(lower);
    const cHi = model.rowCentroids.get(upper);
    const gapIsBlockBreak = upper - lower > Math.max(3, (upper - lower) * 0.35);
    if (dLo <= dHi || gapIsBlockBreak) {
      return addPct(cLo, model.rowStep.xPct * dLo, model.rowStep.yPct * dLo);
    }
    return addPct(cHi, -model.rowStep.xPct * dHi, -model.rowStep.yPct * dHi);
  }

  if (lower != null) {
    const c = model.rowCentroids.get(lower);
    const d = rowNum - lower;
    return addPct(c, model.rowStep.xPct * d, model.rowStep.yPct * d);
  }

  if (upper != null) {
    const c = model.rowCentroids.get(upper);
    const d = upper - rowNum;
    return addPct(c, -model.rowStep.xPct * d, -model.rowStep.yPct * d);
  }

  return null;
}

function seatAtRow(model, rowNum, seatNum, seatRangeInRow = null) {
  const arr = model.byRow.get(rowNum);
  if (!arr?.length) return null;
  const exact = arr.find((s) => s.seat === seatNum);
  if (exact) return { xPct: exact.xPct, yPct: exact.yPct };

  const refSeatNum = seatRangeInRow?.min ?? arr[0].seat;
  const ref = arr.find((s) => s.seat === refSeatNum) ?? arr[0];
  const ds = seatNum - ref.seat;
  return addPct(ref, model.seatStep.xPct * ds, model.seatStep.yPct * ds);
}

function nearestRowWithSeats(model, rowNum) {
  let best = model.rowNums[0];
  let bestD = Math.abs(best - rowNum);
  for (const r of model.rowNums) {
    const d = Math.abs(r - rowNum);
    if (d < bestD || (d === bestD && (model.byRow.get(r)?.length ?? 0) > (model.byRow.get(best)?.length ?? 0))) {
      best = r;
      bestD = d;
    }
  }
  return best;
}

/**
 * @param {ReturnType<typeof buildSectorAxisGridModel>} model
 * @param {number} rowNum
 * @param {number} seatNum
 * @param {{ min: number, max: number } | null} [seatRangeInRow]
 */
export function resolveSeatOnSectorAxisGrid(model, rowNum, seatNum, seatRangeInRow = null) {
  if (!model || rowNum == null || seatNum == null) return null;

  const exact = seatAtRow(model, rowNum, seatNum, seatRangeInRow);
  if (exact) return exact;

  const rowPt = rowAnchorForTarget(model, rowNum);
  if (!rowPt) return null;

  const seatMin = seatRangeInRow?.min ?? seatNum;
  const refRow = model.byRow.has(rowNum) ? rowNum : nearestRowWithSeats(model, rowNum);
  const refSeat =
    seatAtRow(model, refRow, seatMin, seatRangeInRow) ??
    seatAtRow(model, refRow, model.byRow.get(refRow)?.[0]?.seat ?? seatMin, seatRangeInRow);
  if (!refSeat) return rowPt;

  const ds = seatNum - seatMin;
  const seatMax = seatRangeInRow?.max ?? seatNum;
  if (model.rowIsHorizontal) {
    const pLo =
      seatAtRow(model, rowNum, seatMin, seatRangeInRow) ??
      seatAtRow(model, refRow, seatMin, seatRangeInRow);
    const pHi =
      seatAtRow(model, rowNum, seatMax, seatRangeInRow) ??
      seatAtRow(model, refRow, seatMax, seatRangeInRow);
    if (pLo && pHi && seatMax > seatMin) {
      const t = (seatNum - seatMin) / (seatMax - seatMin);
      return { xPct: pLo.xPct + (pHi.xPct - pLo.xPct) * t, yPct: rowPt.yPct };
    }
    const base = pLo ?? refSeat;
    return {
      xPct: base.xPct + model.seatStep.xPct * ds,
      yPct: rowPt.yPct,
    };
  }

  const base = seatAtRow(model, rowNum, seatMin, seatRangeInRow) ?? refSeat;
  return {
    xPct: rowPt.xPct,
    yPct: base.yPct + model.seatStep.yPct * ds,
  };
}

/**
 * @param {object} params
 * @param {{ sector?: string, row: string|number, seat: string|number, xPct: number, yPct: number }[]} params.anchors
 * @param {string} params.sectorLabel
 * @param {string|number} params.row
 * @param {string|number} params.seat
 * @param {{ min: number, max: number } | null} [params.seatRangeInRow]
 */
export function resolveSellableOnSectorAxisGrid({
  anchors,
  sectorLabel,
  row,
  seat,
  seatRangeInRow = null,
}) {
  const rowNum = parseNum(row);
  const seatNum = parseNum(seat);
  if (rowNum == null || seatNum == null) return null;

  const model = buildSectorAxisGridModel(anchors, sectorLabel);
  if (!model) return null;

  const pt = resolveSeatOnSectorAxisGrid(model, rowNum, seatNum, seatRangeInRow);
  if (!pt || !Number.isFinite(pt.xPct) || !Number.isFinite(pt.yPct)) return null;

  return {
    sector: sectorLabel,
    row: String(row),
    seat: String(seat),
    xPct: pt.xPct,
    yPct: pt.yPct,
    geodesySource: 'axisGrid',
  };
}
