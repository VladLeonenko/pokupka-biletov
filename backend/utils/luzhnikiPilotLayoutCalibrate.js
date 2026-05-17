/**
 * Калибровка layout-якорей (сектора без r[] в tickets) для левой трибуны.
 * layout.seats подписывает ряд ~на 4 выше физического ряда (как D230: оффер 24 → grid «24» ≈ pbilet 28).
 */

import { normalizeSectorLabel } from './ticketHallSectorNormalize.js';

function parseRowNum(value) {
  const n = Number.parseInt(String(value ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

/** Нижняя/средняя левая трибуна: A*, B*, C14–C25 (xPct ≲ 35). */
export function isLeftTribuneSector(norm) {
  const n = normalizeSectorLabel(norm);
  if (/^a\d/.test(n)) return true;
  if (/^b\d/.test(n)) return true;
  if (/^c1[4-9]\d/.test(n)) return true;
  if (/^c2[0-5]\d/.test(n)) return true;
  return false;
}

/** Сдвиг номера ряда при lookup в layout.seats (оффер R → якоря R+shift). */
export function layoutAnchorRowShift(norm) {
  if (!isLeftTribuneSector(norm)) return 0;
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
