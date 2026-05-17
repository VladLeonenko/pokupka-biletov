/**
 * Сетка рядов/колонн по серой чаше (allSeatCoordinates) без подписей мест.
 * Ряды — полосы вдоль оси «поле → сектор»; колонны — вдоль seatLeftAxis.
 */

import {
  buildSectorDotIndex,
  clusterDotsByRowAlongAxis,
} from './hallSeatGeodesyFromDots.js';
import {
  computeFieldCenterPct,
  rowAxisFromSector,
  seatLeftAxisFromSector,
} from './hallSeatGeodesySectorNative.js';
import { normalizeSectorLabel } from './ticketHallSectorNormalize.js';

function toHallPoint(dot, w, h) {
  return { x: (dot.xPct / 100) * w, y: (dot.yPct / 100) * h };
}

function sortAlongAxis(dots, axis) {
  const ax = Number(axis.x);
  const ay = Number(axis.y);
  return [...dots].sort((a, b) => {
    const pa = a.xPct * ax + a.yPct * ay;
    const pb = b.xPct * ax + b.yPct * ay;
    if (pa !== pb) return pa - pb;
    return a.yPct - b.yPct;
  });
}

function normSectorFilter(sectorLabel, filter) {
  if (!filter?.trim()) return true;
  const f = filter.trim().toLowerCase();
  const s = String(sectorLabel).trim().toLowerCase();
  return s.includes(f) || f.includes(s);
}

/**
 * @param {{
 *   allSeatCoordinates: { xPct: number, yPct: number }[];
 *   sectorPaths: { label: string, path: string }[];
 *   hallWidth: number;
 *   hallHeight: number;
 *   sectorFilter?: string;
 *   minDotsPerSector?: number;
 *   rowClusterEps?: number;
 * }} opts
 */
export function buildGrayCloudRowColumnGrid(opts) {
  const w = Number(opts.hallWidth) > 0 ? Number(opts.hallWidth) : 11413;
  const h = Number(opts.hallHeight) > 0 ? Number(opts.hallHeight) : 9676;
  const minDots = Number(opts.minDotsPerSector) > 0 ? Number(opts.minDotsPerSector) : 8;
  const rowEps = Number(opts.rowClusterEps) > 0 ? Number(opts.rowClusterEps) : 0.14;
  const sectorFilter = opts.sectorFilter?.trim() ?? '';

  const cloud = Array.isArray(opts.allSeatCoordinates) ? opts.allSeatCoordinates : [];
  const sectorPaths = Array.isArray(opts.sectorPaths) ? opts.sectorPaths : [];
  const fieldCenter = computeFieldCenterPct(cloud);
  const dotsBySector = buildSectorDotIndex(cloud, sectorPaths, w, h);

  const rowLines = [];
  const columnLines = [];
  let sectorCount = 0;
  let dotCount = 0;

  for (const sp of sectorPaths) {
    const label = String(sp.label ?? '').trim();
    if (!label || !normSectorFilter(label, sectorFilter)) continue;
    const path = String(sp.path ?? '').trim();
    if (!path) continue;

    const norm = normalizeSectorLabel(label);
    const sectorDots = dotsBySector.get(norm);
    if (!sectorDots || sectorDots.length < minDots) continue;

    sectorCount += 1;
    dotCount += sectorDots.length;

    const rowAxis = rowAxisFromSector(path, fieldCenter, w, h);
    const seatAxis = seatLeftAxisFromSector(path, fieldCenter, w, h);

    const rowBands = clusterDotsByRowAlongAxis(sectorDots, rowAxis, rowEps);
    const sortedRows = rowBands
      .map((band) => sortAlongAxis(band.dots ?? [], seatAxis))
      .filter((pts) => pts.length >= 2);

    for (const pts of sortedRows) {
      rowLines.push({
        sector: label,
        kind: 'row',
        points: pts.map((d) => toHallPoint(d, w, h)),
      });
    }

    /** Колонна = i-я точка в каждом ряду (после сортировки вдоль seatAxis). */
    const maxSeatsInRow = sortedRows.reduce((m, pts) => Math.max(m, pts.length), 0);
    for (let seatIdx = 0; seatIdx < maxSeatsInRow; seatIdx += 1) {
      const colPts = [];
      for (const rowPts of sortedRows) {
        if (rowPts[seatIdx]) colPts.push(rowPts[seatIdx]);
      }
      if (colPts.length < 2) continue;
      columnLines.push({
        sector: label,
        kind: 'column',
        points: sortAlongAxis(colPts, rowAxis).map((d) => toHallPoint(d, w, h)),
      });
    }
  }

  return {
    rowLines,
    columnLines,
    hallWidth: w,
    hallHeight: h,
    sectorCount,
    dotCount,
    cloudDotCount: cloud.length,
  };
}
