/**
 * Калибровка mapping layout.seats / sellable → SVG-подложка Лужников.
 * — якоря сектора (3–4 угла) → bilinear + радиальный изгиб рядов;
 * — ручная polarGrid (VIP C138 и др. без tickets r[]);
 * — коэффициенты трибун A/B/C/D (scale, skew, rotate вокруг pivot).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getManualSectorRowAnchors,
  loadSectorCalibrationBlocksByNorm,
} from './hallSeatGeodesySectorRowAnchors.js';
import { luzhnikiSectorLookupNorms, normalizeSectorLabel } from './ticketHallSectorNormalize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRIBUNE_CALIB_PATH = path.join(__dirname, '../data/luzhniki-geodesy/luzhniki-tribune-calibration.json');

let tribuneCalibCache = null;

function parseNum(value) {
  const n = Number.parseInt(String(value ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function degToRad(d) {
  return (Number(d) * Math.PI) / 180;
}

/** @returns {'A'|'B'|'C'|'D'|'VIP'|null} */
export function getLuzhnikiTribuneBlock(norm) {
  const n = normalizeSectorLabel(norm);
  if (!n) return null;
  if (n.startsWith('vip') || /^c\d/.test(n) && Number.parseInt(n.slice(1), 10) >= 130) return 'VIP';
  if (/^a\d/.test(n)) return 'A';
  if (/^b\d/.test(n)) return 'B';
  if (/^c\d/.test(n)) return 'C';
  if (/^d\d/.test(n) || /^e\d/.test(n)) return 'D';
  return null;
}

export function loadTribuneCalibration() {
  if (tribuneCalibCache) return tribuneCalibCache;
  try {
    if (fs.existsSync(TRIBUNE_CALIB_PATH)) {
      tribuneCalibCache = JSON.parse(fs.readFileSync(TRIBUNE_CALIB_PATH, 'utf8'));
      return tribuneCalibCache;
    }
  } catch {
    // ignore
  }
  tribuneCalibCache = {};
  return tribuneCalibCache;
}

export function resetTribuneCalibrationCache() {
  tribuneCalibCache = null;
}

/**
 * @param {{ xPct: number, yPct: number }} p
 * @param {{ scaleX?: number, scaleY?: number, skewX?: number, rotateDeg?: number, pivotPct?: { x: number, y: number } }} cfg
 */
export function applyTribuneAffine(p, cfg) {
  if (!cfg || typeof cfg !== 'object') return { xPct: p.xPct, yPct: p.yPct };
  const sx = Number(cfg.scaleX ?? 1);
  const sy = Number(cfg.scaleY ?? 1);
  const skew = Number(cfg.skewX ?? 0);
  const rot = degToRad(cfg.rotateDeg ?? 0);
  const px = Number(cfg.pivotPct?.x ?? p.xPct);
  const py = Number(cfg.pivotPct?.y ?? p.yPct);
  if (sx === 1 && sy === 1 && skew === 0 && rot === 0) return { xPct: p.xPct, yPct: p.yPct };

  let x = p.xPct - px;
  let y = p.yPct - py;
  const xSkew = x + y * skew;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const xr = xSkew * cos - y * sin;
  const yr = xSkew * sin + y * cos;
  return { xPct: px + xr * sx, yPct: py + yr * sy };
}

function bilinear(u, v, p00, p10, p01, p11) {
  const x =
    (1 - u) * (1 - v) * p00.xPct +
    u * (1 - v) * p10.xPct +
    (1 - u) * v * p01.xPct +
    u * v * p11.xPct;
  const y =
    (1 - u) * (1 - v) * p00.yPct +
    u * (1 - v) * p10.yPct +
    (1 - u) * v * p01.yPct +
    u * v * p11.yPct;
  return { xPct: x, yPct: y };
}

/**
 * Изгиб трибуны: смещение середины ряда перпендикулярно хорде rowMin→rowMax.
 * @param {number} rowCurve 0…1 (типично 0.2–0.45)
 */
function applyRowCurveOffset(point, u, v, p00, p10, p01, p11, rowCurve) {
  const k = Number(rowCurve);
  if (!Number.isFinite(k) || k === 0) return point;
  const midU = { xPct: (p00.xPct + p10.xPct) / 2, yPct: (p00.yPct + p10.yPct) / 2 };
  const midV = { xPct: (p01.xPct + p11.xPct) / 2, yPct: (p01.yPct + p11.yPct) / 2 };
  const dx = midV.xPct - midU.xPct;
  const dy = midV.yPct - midU.yPct;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const bend = k * Math.sin(Math.PI * u) * (v - 0.5) * 2;
  const chord = Math.hypot(p10.xPct - p00.xPct, p10.yPct - p00.yPct) || 1;
  const amp = chord * 0.08;
  return {
    xPct: point.xPct + nx * bend * amp,
    yPct: point.yPct + ny * bend * amp,
  };
}

/**
 * @param {{ row: string, seat: string, xPct: number, yPct: number }[]} anchors — ≥4 угловых места
 */
export function inferCornerAnchors(anchors) {
  const parsed = anchors
    .map((a) => ({
      ...a,
      rn: parseNum(a.row),
      sn: parseNum(a.seat),
    }))
    .filter((a) => a.rn != null && a.sn != null);
  if (parsed.length < 4) return null;

  const minR = Math.min(...parsed.map((a) => a.rn));
  const maxR = Math.max(...parsed.map((a) => a.rn));
  const minS = Math.min(...parsed.map((a) => a.sn));
  const maxS = Math.max(...parsed.map((a) => a.sn));

  const pick = (rn, sn) =>
    parsed.find((a) => a.rn === rn && a.sn === sn) ||
    parsed.reduce((best, a) => {
      const d = Math.abs(a.rn - rn) + Math.abs(a.sn - sn);
      const bd = best ? Math.abs(best.rn - rn) + Math.abs(best.sn - sn) : Infinity;
      return d < bd ? a : best;
    }, null);

  const p00 = pick(minR, minS);
  const p10 = pick(maxR, minS);
  const p01 = pick(minR, maxS);
  const p11 = pick(maxR, maxS);
  if (!p00 || !p10 || !p01 || !p11) return null;

  return { p00, p10, p01, p11, minR, maxR, minS, maxS };
}

/**
 * Bilinear в (row, seat) + радиальный изгиб рядов.
 */
export function interpolateSeatFromCornerAnchors(anchors, row, seat, rowCurve = 0.28) {
  const corners = inferCornerAnchors(anchors);
  if (!corners) return null;

  const rowN = parseNum(row);
  const seatN = parseNum(seat);
  if (rowN == null || seatN == null) return null;

  const { p00, p10, p01, p11, minR, maxR, minS, maxS } = corners;
  const u = maxR === minR ? 0 : (rowN - minR) / (maxR - minR);
  const v = maxS === minS ? 0 : (seatN - minS) / (maxS - minS);
  const uClamped = Math.max(0, Math.min(1, u));
  const vClamped = Math.max(0, Math.min(1, v));

  let point = bilinear(uClamped, vClamped, p00, p10, p01, p11);
  point = applyRowCurveOffset(point, uClamped, vClamped, p00, p10, p01, p11, rowCurve);
  return { xPct: point.xPct, yPct: point.yPct };
}

/**
 * Ручная polarGrid из sector-row-anchors.json (сектора без tickets r[]).
 * @param {object} block
 */
export function polarGridSeatPosition(block, row, seat) {
  const rowN = parseNum(row);
  const seatN = parseNum(seat);
  if (rowN == null || seatN == null) return null;

  const maxRow = Number(block.maxRow) || 1;
  const maxSeat = Number(block.maxSeat) || 1;
  const ox = Number(block.origin?.xPct);
  const oy = Number(block.origin?.yPct);
  if (!Number.isFinite(ox) || !Number.isFinite(oy)) return null;

  const u = maxRow <= 1 ? 0 : (rowN - 1) / (maxRow - 1);
  const v = maxSeat <= 1 ? 0 : (seatN - 1) / (maxSeat - 1);

  const rowRad = degToRad(block.rowDirectionDeg ?? block.fieldDirectionDeg ?? 90);
  const seatRad = degToRad(block.seatDirectionDeg ?? (Number(block.rowDirectionDeg ?? 90) + 90));

  const rowDist = Number(block.rowSpacingPct ?? 0.35) * u;
  const seatDist = Number(block.seatSpacingPct ?? 0.2) * (v - 0.5);

  const curve = Number(block.rowCurve ?? 0.25);
  const lateral = curve * Math.sin(Math.PI * u) * (v - 0.5) * Number(block.seatSpacingPct ?? 0.2);

  const xPct =
    ox + Math.cos(rowRad) * rowDist + Math.cos(seatRad) * seatDist + Math.cos(seatRad + Math.PI / 2) * lateral;
  const yPct =
    oy + Math.sin(rowRad) * rowDist + Math.sin(seatRad) * seatDist + Math.sin(seatRad + Math.PI / 2) * lateral;

  return { xPct, yPct };
}

export function getSectorCalibrationBlock(norm) {
  const blocks = loadSectorCalibrationBlocksByNorm();
  if (blocks.has(norm)) return blocks.get(norm);
  for (const alt of luzhnikiSectorLookupNorms(norm)) {
    if (blocks.has(alt)) return blocks.get(alt);
  }
  return null;
}

/**
 * @param {string} sectorLabel
 * @param {string} row
 * @param {string} seat
 * @param {{ rowCurve?: number, skipTribune?: boolean }} [options]
 */
export function resolveCalibratedSeatPosition(sectorLabel, row, seat, options = {}) {
  const norm = normalizeSectorLabel(sectorLabel);
  if (!norm) return null;

  const block = getSectorCalibrationBlock(norm);
  if (block?.mode === 'polarGrid') {
    const pt = polarGridSeatPosition(block, row, seat);
    if (!pt) return null;
    const tribune = getLuzhnikiTribuneBlock(norm);
    if (!options.skipTribune && tribune) {
      const cfg = loadTribuneCalibration()[tribune];
      return applyTribuneAffine(pt, cfg);
    }
    return pt;
  }

  const anchors = Array.isArray(block?.anchors)
    ? block.anchors
    : getManualSectorRowAnchors(sectorLabel);
  if (anchors.length >= 4) {
    const rowCurve = Number(block?.rowCurve ?? options.rowCurve ?? 0.28);
    const pt = interpolateSeatFromCornerAnchors(anchors, row, seat, rowCurve);
    if (!pt) return null;
    const tribune = getLuzhnikiTribuneBlock(norm);
    if (!options.skipTribune && tribune) {
      const cfg = loadTribuneCalibration()[tribune];
      return applyTribuneAffine(pt, cfg);
    }
    return pt;
  }

  return null;
}

/**
 * @param {{ sector: string, row: string, seat: string, xPct: number, yPct: number, geodesySource?: string }[]} seats
 * @param {{ onlyFieldGrid?: boolean, onlySectors?: string[] }} [options]
 */
export function applyLuzhnikiCalibrationBatch(seats, options = {}) {
  const onlyGrid = options.onlyFieldGrid !== false;
  const sectorFilter = options.onlySectors
    ? new Set(options.onlySectors.map((s) => normalizeSectorLabel(s)))
    : null;

  let calibrated = 0;
  const out = seats.map((seat) => {
    const norm = normalizeSectorLabel(seat.sector);
    if (sectorFilter && !sectorFilter.has(norm)) return seat;
    if (onlyGrid && seat.geodesySource === 'strict') return seat;

    const next = transformLayoutSeatToSvg(seat, options);
    if (next.xPct !== seat.xPct || next.yPct !== seat.yPct) calibrated += 1;
    return next;
  });

  return { seats: out, calibrated };
}

/**
 * Трансформатор для одной точки: layout → калиброванные % viewBox.
 */
export function transformLayoutSeatToSvg(seat, options = {}) {
  const calibrated = resolveCalibratedSeatPosition(seat.sector, seat.row, seat.seat, options);
  if (calibrated) {
    return {
      ...seat,
      xPct: calibrated.xPct,
      yPct: calibrated.yPct,
      geodesySource: seat.geodesySource === 'strict' ? 'strict' : 'calibrated',
    };
  }
  const tribune = getLuzhnikiTribuneBlock(normalizeSectorLabel(seat.sector));
  if (tribune && !options.skipTribune) {
    const cfg = loadTribuneCalibration()[tribune];
    const p = applyTribuneAffine({ xPct: seat.xPct, yPct: seat.yPct }, cfg);
    if (p.xPct === seat.xPct && p.yPct === seat.yPct) return seat;
    return {
      ...seat,
      xPct: p.xPct,
      yPct: p.yPct,
      geodesySource: seat.geodesySource === 'strict' ? 'strict' : 'tribuneAdjusted',
    };
  }
  return seat;
}
