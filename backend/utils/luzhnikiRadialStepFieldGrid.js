/**
 * Radial Step: ряд 1…maxRow — равные шаги по R от центра поля.
 * Глобально maxRow=35 (или LUZHNIKI_SECTOR_MAX_ROW). Покрывает все точки сектора без «спагетти»-интерполяции strict.
 */

import { computeFieldCenterPct, seatLeftAxisFromSector } from './hallSeatGeodesySectorNative.js';
import { sectorTribuneClass } from './luzhnikiLocalMagneticResonance.js';
import { strictSeatKey } from './ticketHallSectorNormalize.js';

export const DEFAULT_SECTOR_MAX_ROW = 35;

const STRICT_SNAP_RADIUS_PCT = 0.22;

function parseNum(value) {
  const n = Number.parseInt(String(value ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

export function useRadialStepFieldGrid() {
  const v = String(process.env.LUZHNIKI_RADIAL_STEP_FIELDGRID ?? '0').trim().toLowerCase();
  return v === '1' || v === 'true';
}

export function resolveGlobalSectorMaxRow(sectorLabel, opts = {}) {
  const env = parseInt(String(process.env.LUZHNIKI_SECTOR_MAX_ROW ?? '').trim(), 10);
  const base =
    Number.isFinite(env) && env > 0 ? env : DEFAULT_SECTOR_MAX_ROW;
  if (sectorTribuneClass(sectorLabel) === 'vip') {
    return Math.min(24, base);
  }
  const strictMax = Number(opts.strictMax) || 0;
  return Math.max(base, strictMax);
}

export function radialDistancePct(dot, fieldCenter) {
  return Math.hypot(dot.xPct - fieldCenter.xPct, dot.yPct - fieldCenter.yPct);
}

/** Ряд 1 @ rMin, ряд maxRow @ rMax — равномерные шаги (Radial Step). */
export function inferRowNumRadialStep(r, rMin, rMax, maxRow) {
  const maxR = Math.max(1, maxRow);
  if (maxR <= 1) return 1;
  if (!Number.isFinite(r)) return 1;
  if (r <= rMin) return 1;
  if (r >= rMax) return maxR;
  const t = (r - rMin) / Math.max(1e-9, rMax - rMin);
  return 1 + Math.round(t * (maxR - 1));
}

function snapDotFromStrict(dot, strictSeats) {
  let best = null;
  let bestD = STRICT_SNAP_RADIUS_PCT;
  for (const st of strictSeats || []) {
    const d = Math.hypot(dot.xPct - st.xPct, dot.yPct - st.yPct);
    if (d < bestD) {
      bestD = d;
      best = st;
    }
  }
  return best;
}

function phiFromField(dot, fieldCenter) {
  return Math.atan2(dot.yPct - fieldCenter.yPct, dot.xPct - fieldCenter.xPct);
}

/**
 * @returns {{ sector: string, row: string, seat: string, xPct: number, yPct: number, geodesySource: 'fieldGrid' }[]}
 */
export function buildFieldGridSeatsRadialStep({
  sectorLabel,
  sectorDots,
  sectorPath,
  fieldCenterPct,
  hallWidth,
  hallHeight,
  seenKeys,
  strictSeats = [],
  maxRow: maxRowOverride,
}) {
  if (!sectorDots?.length || !sectorPath) return [];

  const fieldCenter = fieldCenterPct ?? { xPct: 50, yPct: 50 };
  const maxRow =
    Number(maxRowOverride) > 0
      ? Number(maxRowOverride)
      : resolveGlobalSectorMaxRow(sectorLabel, {
          strictMax: (strictSeats || []).reduce((m, s) => Math.max(m, parseNum(s.row) ?? 0), 0),
        });

  const rs = sectorDots.map((d) => radialDistancePct(d, fieldCenter));
  const rMin = Math.min(...rs);
  const rMax = Math.max(...rs);
  if (!Number.isFinite(rMin) || !Number.isFinite(rMax)) return [];

  const seatAxis = seatLeftAxisFromSector(sectorPath, fieldCenter, hallWidth, hallHeight);
  const byRow = new Map();

  for (const dot of sectorDots) {
    const strictHit = snapDotFromStrict(dot, strictSeats);
    let rowLabel;
    if (strictHit) {
      rowLabel = String(strictHit.row);
    } else {
      const r = radialDistancePct(dot, fieldCenter);
      rowLabel = String(inferRowNumRadialStep(r, rMin, rMax, maxRow));
    }
    if (!byRow.has(rowLabel)) byRow.set(rowLabel, []);
    byRow.get(rowLabel).push(dot);
  }

  const out = [];
  for (const [rowLabel, dots] of byRow) {
    const sorted = [...dots].sort((a, b) => {
      const pa = phiFromField(a, fieldCenter);
      const pb = phiFromField(b, fieldCenter);
      if (pa !== pb) return pa - pb;
      return (
        a.xPct * seatAxis.x +
        a.yPct * seatAxis.y -
        (b.xPct * seatAxis.x + b.yPct * seatAxis.y)
      );
    });
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

export function buildRadialExtentsForCloud(cloud, fieldCenter = null) {
  const fc = fieldCenter ?? computeFieldCenterPct(cloud);
  const rs = (cloud || []).map((d) => radialDistancePct(d, fc));
  if (!rs.length) return { fieldCenter: fc, rMin: 0, rMax: 0 };
  return { fieldCenter: fc, rMin: Math.min(...rs), rMax: Math.max(...rs) };
}
