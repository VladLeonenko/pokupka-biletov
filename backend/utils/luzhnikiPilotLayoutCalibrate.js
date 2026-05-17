/**
 * Калибровка layout-якорей (сектора без r[] в tickets).
 * Сдвиг ряда — только для явно откалиброванных секторов (см. layoutAnchorRowShift).
 */

import { normalizeSectorLabel } from './ticketHallSectorNormalize.js';

function parseRowNum(value) {
  const n = Number.parseInt(String(value ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

/** Сектора, где layout.seats и оффер GetBilet расходятся по номеру ряда (ручная калибровка). */
const DEFAULT_LAYOUT_ROW_SHIFT_NORMS = new Set(['d230', 'd231']);

function layoutRowShiftAllowlist() {
  const raw = process.env.LUZHNIKI_LAYOUT_ROW_SHIFT_NORMS?.trim();
  if (raw) {
    return new Set(
      raw
        .split(/[,;\s]+/)
        .map((s) => normalizeSectorLabel(s))
        .filter(Boolean),
    );
  }
  return DEFAULT_LAYOUT_ROW_SHIFT_NORMS;
}

/**
 * Левая трибуна — для масштаба pivot (applyLeftTribuneScale), не для сдвига ряда.
 */
export function isLeftTribuneSector(norm) {
  const n = normalizeSectorLabel(norm);
  if (/^a1(0[1-9]|1[0-6])$/.test(n)) return true;
  if (/^b\d/.test(n)) return true;
  if (/^c1[4-9]\d$/.test(n)) return true;
  if (/^c2[0-5]\d$/.test(n)) return true;
  return false;
}

/** Сдвиг номера ряда при lookup в layout.seats (только allowlist + env). */
export function layoutAnchorRowShift(norm) {
  const n = normalizeSectorLabel(norm);
  if (!layoutRowShiftAllowlist().has(n)) return 0;
  const fromEnv = process.env.LUZHNIKI_LEFT_LAYOUT_ROW_SHIFT;
  if (fromEnv != null && fromEnv !== '') {
    const v = Number(fromEnv);
    if (Number.isFinite(v)) return v;
  }
  return 4;
}

export function layoutAnchorLookupRow(norm, offerRow) {
  const n = parseRowNum(offerRow);
  if (n == null) return String(offerRow ?? '');
  return String(n + layoutAnchorRowShift(norm));
}

export function sectorAnchorPivot(anchors) {
  if (!Array.isArray(anchors) || anchors.length < 1) {
    return { x: 50, y: 50 };
  }
  let sx = 0;
  let sy = 0;
  for (const s of anchors) {
    sx += s.xPct;
    sy += s.yPct;
  }
  return { x: sx / anchors.length, y: sy / anchors.length };
}

/**
 * Масштаб вокруг центра сектора (только layout-anchors + левая трибуна).
 * LUZHNIKI_LEFT_SCALE_X / LUZHNIKI_LEFT_SCALE_Y (default 1).
 */
export function applyLeftTribuneScale(norm, xPct, yPct, pivot, anchorMode) {
  if (anchorMode !== 'layout-anchors' || !isLeftTribuneSector(norm)) {
    return { xPct, yPct };
  }
  const sx = Number(process.env.LUZHNIKI_LEFT_SCALE_X || 1);
  const sy = Number(process.env.LUZHNIKI_LEFT_SCALE_Y || 1);
  if (!Number.isFinite(sx) || !Number.isFinite(sy) || (sx === 1 && sy === 1)) {
    return { xPct, yPct };
  }
  const px = Number(pivot?.x) || xPct;
  const py = Number(pivot?.y) || yPct;
  return {
    xPct: px + (xPct - px) * sx,
    yPct: py + (yPct - py) * sy,
  };
}
