/**
 * Диагностика: ровно maxRow концентрических дуг от центра поля (без пересечений).
 * Не полилинии через layout.seats — критерий приёмки luzhniki-grid-diagnostic.html.
 */

import { computeFieldCenterPct } from './hallSeatGeodesySectorNative.js';
import {
  buildRadialExtentsForCloud,
  DEFAULT_SECTOR_MAX_ROW,
  inferRowNumRadialStep,
} from './luzhnikiRadialStepFieldGrid.js';

function parseMaxRows(opts) {
  const env = parseInt(String(process.env.LUZHNIKI_SECTOR_MAX_ROW ?? '').trim(), 10);
  const fromOpts = Number(opts.maxRows);
  if (Number.isFinite(fromOpts) && fromOpts > 0) return fromOpts;
  if (Number.isFinite(env) && env > 0) return env;
  return DEFAULT_SECTOR_MAX_ROW;
}

/** Кольцо в viewBox: полный оборот 2π на фиксированном R (pct) — дуги не пересекаются. */
function circlePolyline(fieldCenter, rPct, w, h, segments = 360) {
  const pts = [];
  for (let i = 0; i <= segments; i += 1) {
    const phi = -Math.PI + (2 * Math.PI * i) / segments;
    const xPct = fieldCenter.xPct + rPct * Math.cos(phi);
    const yPct = fieldCenter.yPct + rPct * Math.sin(phi);
    pts.push({ x: (xPct / 100) * w, y: (yPct / 100) * h });
  }
  return pts;
}

/**
 * @param {{ xPct: number, yPct: number }[]} allSeatCoordinates
 * @param {number} hallWidth
 * @param {number} hallHeight
 * @param {number} [maxRows]
 */
export function buildStadiumRadialDiagnosticGrid(allSeatCoordinates, hallWidth, hallHeight, opts = {}) {
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;
  const maxRows = parseMaxRows(opts);
  const cloud = Array.isArray(allSeatCoordinates) ? allSeatCoordinates : [];
  const { fieldCenter, rMin, rMax } = buildRadialExtentsForCloud(cloud);

  const rowLines = [];
  for (let row = 1; row <= maxRows; row += 1) {
    const rPct =
      maxRows <= 1
        ? rMin
        : rMin + ((row - 1) / Math.max(1, maxRows - 1)) * Math.max(0, rMax - rMin);
    rowLines.push({
      kind: 'row',
      rowId: String(row),
      source: 'stadiumRadialStep',
      sector: '',
      label: `ряд ${row}`,
      points: circlePolyline(fieldCenter, rPct, w, h, 360),
    });
  }

  return {
    rowLines,
    columnLines: [],
    hallWidth: w,
    hallHeight: h,
    sectorCount: 0,
    dotCount: cloud.length,
    cloudDotCount: cloud.length,
    maxRows,
    fieldCenter,
    rMin,
    rMax,
  };
}

/** Проверка: ряды 1..maxRow покрывают облако без дыр > 1 шага. */
export function radialStepCoverageStats(cloud, maxRows = DEFAULT_SECTOR_MAX_ROW) {
  const { fieldCenter, rMin, rMax } = buildRadialExtentsForCloud(cloud);
  const usedRows = new Set();
  for (const d of cloud) {
    const r = Math.hypot(d.xPct - fieldCenter.xPct, d.yPct - fieldCenter.yPct);
    usedRows.add(inferRowNumRadialStep(r, rMin, rMax, maxRows));
  }
  const missing = [];
  for (let rn = 1; rn <= maxRows; rn += 1) {
    if (!usedRows.has(rn)) missing.push(rn);
  }
  return {
    maxRows,
    usedRowCount: usedRows.size,
    missingRows: missing,
    cloudCount: cloud.length,
  };
}
