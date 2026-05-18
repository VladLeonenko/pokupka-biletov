/**
 * Шаг сетки pbilet в % viewBox (11413×9676) — эталон strict «Сектор D 124».
 * Масштаб карты меняет только zoom; шаги в xPct/yPct постоянны.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_HALL_W = 11413;
const DEFAULT_HALL_H = 9676;

/** Эталон для измерения (в tickets есть ряды 5–37, ряд 10 — через интерполяцию офферов). */
export const PBILET_GRID_REFERENCE_SECTOR = 'Сектор D 124';

let cachedSpacing = null;

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

function hypotPct(dx, dy) {
  return Math.hypot(dx, dy);
}

function unitVec(dx, dy) {
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) return { x: 0, y: 0 };
  return { x: dx / len, y: dy / len };
}

/**
 * @param {unknown} ticketsPayload
 * @param {number} [hallWidth]
 * @param {number} [hallHeight]
 */
export function measurePbiletGridSpacingFromTickets(
  ticketsPayload,
  hallWidth = DEFAULT_HALL_W,
  hallHeight = DEFAULT_HALL_H,
) {
  const sectors = Array.isArray(ticketsPayload?.sectors) ? ticketsPayload.sectors : [];
  const sec = sectors.find((s) => String(s?.i ?? '').trim() === PBILET_GRID_REFERENCE_SECTOR);
  if (!sec?.r?.length) {
    return { seatStepPct: 0.206697, rowStepPct: 0.192763, source: 'fallback' };
  }

  const seatSteps = [];
  const rowSteps = [];

  for (const row of sec.r) {
    const seats = (row.s || [])
      .filter((s) => Number.isFinite(s.x) && Number.isFinite(s.y))
      .sort((a, b) => parseNum(a.i) - parseNum(b.i));
    for (let i = 1; i < seats.length; i += 1) {
      const ds = parseNum(seats[i].i) - parseNum(seats[i - 1].i);
      if (ds <= 0) continue;
      seatSteps.push(
        hypotPct(
          ((seats[i].x - seats[i - 1].x) / hallWidth) * 100,
          ((seats[i].y - seats[i - 1].y) / hallHeight) * 100,
        ) / ds,
      );
    }
  }

  const rows = [...sec.r]
    .filter((r) => (r.s || []).some((s) => Number.isFinite(s.x)))
    .sort((a, b) => parseNum(a.i) - parseNum(b.i));

  for (let i = 1; i < rows.length; i += 1) {
    const r0 = rows[i - 1];
    const r1 = rows[i];
    const dr = parseNum(r1.i) - parseNum(r0.i);
    if (dr <= 0) continue;
    const s0 = r0.s.find((s) => parseNum(s.i) === 8) || r0.s[0];
    const s1 = r1.s.find((s) => String(s.i) === String(s0?.i)) || r1.s[0];
    if (!s0 || !s1) continue;
    rowSteps.push(
      hypotPct(
        ((s1.x - s0.x) / hallWidth) * 100,
        ((s1.y - s0.y) / hallHeight) * 100,
      ) / dr,
    );
  }

  return {
    seatStepPct: median(seatSteps) ?? 0.206697,
    rowStepPct: median(rowSteps) ?? 0.192763,
    source: PBILET_GRID_REFERENCE_SECTOR,
  };
}

export function getPbiletGridSpacing(ticketsPayload = null) {
  if (cachedSpacing && !ticketsPayload) return cachedSpacing;
  let payload = ticketsPayload;
  if (!payload) {
    try {
      const ticketsPath = path.resolve(__dirname, '../../tickets.json');
      payload = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
    } catch {
      payload = null;
    }
  }
  const measured = measurePbiletGridSpacingFromTickets(payload);
  if (!ticketsPayload) cachedSpacing = measured;
  return measured;
}

function pickCornerAnchors(anchors) {
  const parsed = (anchors || [])
    .map((a) => ({
      row: parseNum(a.row),
      seat: parseNum(a.seat),
      xPct: Number(a.xPct),
      yPct: Number(a.yPct),
      role: a.role,
    }))
    .filter((a) => a.row != null && a.seat != null && Number.isFinite(a.xPct));

  const byRole = Object.fromEntries(
    parsed.filter((a) => a.role).map((a) => [a.role, a]),
  );
  if (byRole.nearLeft && byRole.nearRight && byRole.farLeft && byRole.farRight) {
    return byRole;
  }

  const minR = Math.min(...parsed.map((a) => a.row));
  const maxR = Math.max(...parsed.map((a) => a.row));
  const minS = Math.min(...parsed.map((a) => a.seat));
  const maxS = Math.max(...parsed.map((a) => a.seat));
  const pick = (rn, sn) =>
    parsed.find((a) => a.row === rn && a.seat === sn) ||
    parsed.reduce((best, a) => {
      const d = Math.abs(a.row - rn) + Math.abs(a.seat - sn);
      const bd = best ? Math.abs(best.row - rn) + Math.abs(best.seat - sn) : Infinity;
      return d < bd ? a : best;
    }, null);

  return {
    nearLeft: pick(minR, minS),
    nearRight: pick(minR, maxS),
    farLeft: pick(maxR, minS),
    farRight: pick(maxR, maxS),
  };
}

function addPct(a, dx, dy) {
  return { xPct: a.xPct + dx, yPct: a.yPct + dy };
}

/**
 * Угловой сектор (A101): оси из 4 углов, шаг места/ряда = D124 strict.
 * @param {{ row: string|number, seat: string|number, xPct: number, yPct: number, role?: string }[]} anchors
 * @param {string|number} row
 * @param {string|number} seat
 * @param {{ rowCurve?: number, seatStepPct?: number, rowStepPct?: number }} [opts]
 */
export function resolveCornerSectorPbiletStepGrid(anchors, row, seat, opts = {}) {
  const roles = pickCornerAnchors(anchors);
  const nearL = roles.nearLeft;
  const nearR = roles.nearRight;
  const farL = roles.farLeft;
  const farR = roles.farRight;
  if (!nearL || !nearR || !farL || !farR) return null;

  const rowN = parseNum(row);
  const seatN = parseNum(seat);
  if (rowN == null || seatN == null) return null;

  const { seatStepPct, rowStepPct } = getPbiletGridSpacing();
  const seatStep = Number(opts.seatStepPct ?? seatStepPct);
  const rowStep = Number(opts.rowStepPct ?? rowStepPct);

  const dr = rowN - nearL.row;
  const rowDirNear = unitVec(farL.xPct - nearL.xPct, farL.yPct - nearL.yPct);
  const rowDirFar = unitVec(farR.xPct - nearR.xPct, farR.yPct - nearR.yPct);

  const leftEdge = addPct(nearL, rowDirNear.x * dr * rowStep, rowDirNear.y * dr * rowStep);
  const rightEdge = addPct(nearR, rowDirFar.x * dr * rowStep, rowDirFar.y * dr * rowStep);

  const seatDir = unitVec(rightEdge.xPct - leftEdge.xPct, rightEdge.yPct - leftEdge.yPct);
  const ds = seatN - nearL.seat;
  let pt = addPct(leftEdge, seatDir.x * ds * seatStep, seatDir.y * ds * seatStep);

  const k = Number(opts.rowCurve ?? 0);
  if (Number.isFinite(k) && k > 0) {
    const rowSpan = Math.max(1, (farL.row ?? nearL.row) - nearL.row);
    const u = Math.max(0, Math.min(1, dr / rowSpan));
    const v = Math.max(0, Math.min(1, ds / Math.max(1, (farR.seat ?? nearR.seat) - nearL.seat)));
    const midU = { xPct: (nearL.xPct + nearR.xPct) / 2, yPct: (nearL.yPct + nearR.yPct) / 2 };
    const midV = { xPct: (farL.xPct + farR.xPct) / 2, yPct: (farL.yPct + farR.yPct) / 2 };
    const nx = midV.xPct - midU.xPct;
    const ny = midV.yPct - midU.yPct;
    const len = Math.hypot(nx, ny) || 1;
    const bend = k * Math.sin(Math.PI * u) * (v - 0.5) * 2;
    const chord = Math.hypot(nearR.xPct - nearL.xPct, nearR.yPct - nearL.yPct) || 1;
    const amp = chord * 0.06;
    pt = addPct(pt, (-ny / len) * bend * amp, (nx / len) * bend * amp);
  }

  if (!Number.isFinite(pt.xPct) || !Number.isFinite(pt.yPct)) return null;
  return pt;
}
