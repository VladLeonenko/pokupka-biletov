/**
 * Присвоение {row, seat} серым точкам чаши (luzhniki.txt) по секторам A/B яруса.
 * Результат: labeled-dots/{norm}.json (precompute).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSectorDotIndex, clusterDotsByRow } from './hallSeatGeodesyFromDots.js';
import { parseSvgHallRowLabels } from './hallSeatGeodesyFromSvgRows.js';
import {
  computeFieldCenterPct,
  labelSectorBandsWithSvgRowNumbers,
  seatLeftAxisFromSector,
  sortSectorRowBandsFromField,
} from './hallSeatGeodesySectorNative.js';
import { extractPbiletCoordinatesSeatDots, extractPbiletTicketSectorPaths } from './luzhnikiPbiletGeodesyExtract.js';
import {
  luzhnikiSectorLookupNorms,
  normalizeSectorLabel,
} from './ticketHallSectorNormalize.js';
import { SECTOR_RADIAL_PRIORITY_NORMS } from './luzhnikiSectorPolarGrid.js';
import { SECTOR_AXIS_GRID_PRIORITY_NORMS } from './luzhnikiSectorAxisGridPlacement.js';
import {
  LABELED_DOTS_DIR,
  LUZHNIKI_PRECOMPUTE_SECTOR_NORMS,
  loadLabeledDotsArray,
  saveLabeledDotsArray,
} from './luzhnikiLabeledDotsStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const DEFAULT_HALL_W = 11413;
const DEFAULT_HALL_H = 9676;
const Y_ROUND = 100;
const MERGE_Y_GAP = 0.05;

function parseNum(value) {
  const n = Number.parseInt(String(value ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function seatSortKey(dot, axis) {
  return dot.xPct * axis.x + dot.yPct * axis.y;
}

function dotToXY(d) {
  return { x: d.xPct, y: d.yPct, xPct: d.xPct, yPct: d.yPct };
}

function mergeYGroups(groups, maxRows) {
  if (!maxRows || groups.length <= maxRows) return groups;
  const merged = [...groups];
  while (merged.length > maxRows) {
    let bestI = 0;
    let bestGap = Infinity;
    for (let i = 0; i < merged.length - 1; i += 1) {
      const gap = Math.abs(merged[i].yKey - merged[i + 1].yKey);
      if (gap < bestGap) {
        bestGap = gap;
        bestI = i;
      }
    }
    const a = merged[bestI];
    const b = merged[bestI + 1];
    merged.splice(bestI, 2, {
      yKey: (a.yKey * a.dots.length + b.yKey * b.dots.length) / (a.dots.length + b.dots.length),
      dots: [...a.dots, ...b.dots],
    });
  }
  return merged;
}

/**
 * @param {{ xPct: number, yPct: number }[]} dots
 * @param {{ expectedRows?: number }} meta
 */
export function labelStraightSector(dots, meta = {}) {
  const byY = new Map();
  for (const d of dots) {
    const yKey = Math.round(d.yPct * Y_ROUND) / Y_ROUND;
    const arr = byY.get(yKey) ?? [];
    arr.push(d);
    byY.set(yKey, arr);
  }
  let groups = [...byY.entries()]
    .map(([yKey, bandDots]) => ({ yKey, dots: bandDots }))
    .sort((a, b) => b.yKey - a.yKey);

  const expected = meta.expectedRows ?? null;
  if (expected && groups.length > expected) {
    groups = mergeYGroups(groups, expected);
  } else if (expected && groups.length < expected) {
    console.warn(
      `[luzhnikiGrayDotsLabeler] straight: expected ${expected} rows, got ${groups.length}`,
    );
  }

  const out = [];
  let rowNum = 1;
  for (const g of groups) {
    const seatAxis = { x: 1, y: 0 };
    const sorted = [...g.dots].sort((a, b) => seatSortKey(a, seatAxis) - seatSortKey(b, seatAxis));
    let seat = 1;
    for (const d of sorted) {
      const xy = dotToXY(d);
      out.push({ x: xy.x, y: xy.y, row: rowNum, seat });
      seat += 1;
    }
    rowNum += 1;
  }
  return out;
}

/**
 * @param {{ xPct: number, yPct: number }[]} dots
 * @param {{ expectedRows?: number }} meta
 * @param {string} sectorPath
 * @param {{ xPct: number, yPct: number }} fieldCenter
 * @param {number} w
 * @param {number} h
 */
export function labelCornerSector(dots, meta, sectorPath, fieldCenter, w, h, svgRowLabels = []) {
  const rowHint = meta.expectedRows ?? 38;
  const { bands } = sortSectorRowBandsFromField(dots, sectorPath, fieldCenter, w, h, rowHint);
  let labeledBands = bands;
  if (svgRowLabels?.length >= 2) {
    labeledBands = labelSectorBandsWithSvgRowNumbers(
      bands,
      sectorPath,
      svgRowLabels,
      fieldCenter,
      w,
      h,
    );
  } else if (bands.length !== rowHint) {
    console.warn(
      `[luzhnikiGrayDotsLabeler] corner: expected ${rowHint} row bands, got ${bands.length}`,
    );
  }
  const seatAxis = seatLeftAxisFromSector(sectorPath, fieldCenter, w, h);
  const out = [];
  let fallbackRow = 1;
  for (const band of labeledBands) {
    const rowNum = Number(band.rowNum) >= 1 ? Number(band.rowNum) : fallbackRow;
    fallbackRow += 1;
    const sorted = [...(band.dots || [])].sort(
      (a, b) => seatSortKey(a, seatAxis) - seatSortKey(b, seatAxis),
    );
    if (meta.seatCountFromLeft) {
      sorted.reverse();
    }
    let seat = 1;
    for (const d of sorted) {
      const xy = dotToXY(d);
      out.push({ x: xy.x, y: xy.y, row: rowNum, seat });
      seat += 1;
    }
  }
  return out;
}

/**
 * @param {{ xPct: number, yPct: number }[]} dots
 * @param {{ expectedRows?: number, rowGap?: number }} meta
 */
export function labelAxisGridSector(dots, meta = {}) {
  const bands = clusterDotsByRow(dots, 0.14);
  const sorted = [...bands].sort((a, b) => b.yPct - a.yPct);
  const rowGap = meta.rowGap ?? 17;
  const out = [];
  let rowNum = 1;
  for (const band of sorted) {
    if (rowNum === rowGap) rowNum += 1;
    const sortedSeats = [...(band.dots || [])].sort((a, b) => a.xPct - b.xPct);
    let seat = 1;
    for (const d of sortedSeats) {
      const xy = dotToXY(d);
      out.push({ x: xy.x, y: xy.y, row: rowNum, seat });
      seat += 1;
    }
    rowNum += 1;
  }
  return out;
}

export function inferAnchorsFromDots(dots) {
  if (!dots?.length) return null;
  const pts = dots.map((d) => ({ x: d.xPct ?? d.x, y: d.yPct ?? d.y }));
  const maxY = Math.max(...pts.map((d) => d.y));
  const minY = Math.min(...pts.map((d) => d.y));
  const nearRow = pts.filter((d) => Math.abs(d.y - maxY) < 0.12);
  const farRow = pts.filter((d) => Math.abs(d.y - minY) < 0.12);
  if (!nearRow.length || !farRow.length) return null;
  return {
    nearLeft: { x: Math.min(...nearRow.map((d) => d.x)), y: maxY },
    nearRight: { x: Math.max(...nearRow.map((d) => d.x)), y: maxY },
    farLeft: { x: Math.min(...farRow.map((d) => d.x)), y: minY },
    farRight: { x: Math.max(...farRow.map((d) => d.x)), y: minY },
  };
}

function resolveGridMode(norm, metaEntry) {
  if (metaEntry?.gridMode) return metaEntry.gridMode;
  if (SECTOR_RADIAL_PRIORITY_NORMS.has(norm)) return 'radialGrid+d124step';
  if (SECTOR_AXIS_GRID_PRIORITY_NORMS.has(norm)) return 'axisGrid';
  return 'fieldGrid';
}

/**
 * @param {string} sectorNorm
 * @param {ReturnType<typeof loadPrecomputeContext>} ctx
 */
export function labelSectorDots(sectorNorm, ctx) {
  const norm = normalizeSectorLabel(sectorNorm);
  const metaEntry = ctx.meta.sectors?.[norm] ?? {};
  const gridMode = resolveGridMode(norm, metaEntry);
  const sectorPath = ctx.sectorPathByNorm.get(norm);
  if (!sectorPath) {
    console.warn(`[luzhnikiGrayDotsLabeler] ${norm}: no sector path in tickets`);
    return [];
  }
  const dots = ctx.dotsByNorm.get(norm);
  if (!dots?.length) {
    console.warn(`[luzhnikiGrayDotsLabeler] ${norm}: no gray dots in cloud`);
    return [];
  }

  const meta = { expectedRows: metaEntry.expectedRows, rowGap: metaEntry.rowGap, seatCountFromLeft: metaEntry.seatCountFromLeft };

  if (gridMode === 'radialGrid+d124step') {
    return labelCornerSector(
      dots,
      meta,
      sectorPath,
      ctx.fieldCenter,
      ctx.w,
      ctx.h,
      ctx.svgRowLabels,
    );
  }
  if (gridMode === 'axisGrid') {
    return labelAxisGridSector(dots, meta);
  }
  return labelStraightSector(dots, meta);
}

export function loadSectorLabelMeta() {
  const p = path.join(__dirname, '../data/luzhniki-geodesy/sector-label-meta.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export function loadPrecomputeContext(options = {}) {
  const w = options.hallWidth ?? DEFAULT_HALL_W;
  const h = options.hallHeight ?? DEFAULT_HALL_H;
  const ticketsPath =
    options.ticketsPath ?? path.join(repoRoot, 'tickets.json');
  const coordsPath =
    options.coordinatesPath ??
    process.env.LUZHNIKI_COORDINATES_JSON?.trim() ??
    path.join(repoRoot, 'luzhniki.txt');

  const ticketsPayload = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
  const coordsPayload = JSON.parse(fs.readFileSync(coordsPath, 'utf8'));
  const svgPath =
    options.svgPath ??
    path.join(repoRoot, 'frontend/public/hall-maps/luzhniki-football-stadium.svg');
  let svgRowLabels = [];
  if (fs.existsSync(svgPath)) {
    const svgMarkup = fs.readFileSync(svgPath, 'utf8');
    if (svgMarkup.includes('<tspan')) {
      svgRowLabels = parseSvgHallRowLabels(svgMarkup, w, h);
    }
  }
  const cloudDots = extractPbiletCoordinatesSeatDots(coordsPayload, w, h);
  const sectorPaths = extractPbiletTicketSectorPaths(ticketsPayload);
  const fieldCenter = computeFieldCenterPct(cloudDots);
  const dotsBySector = buildSectorDotIndex(cloudDots, sectorPaths, w, h);

  const sectorPathByNorm = new Map();
  for (const sp of sectorPaths) {
    const norm = normalizeSectorLabel(sp.label);
    if (norm) sectorPathByNorm.set(norm, sp.path);
  }

  const dotsByNorm = new Map();
  const sectorPathByNormCanonical = new Map();
  for (const norm of LUZHNIKI_PRECOMPUTE_SECTOR_NORMS) {
    for (const alias of luzhnikiSectorLookupNorms(norm)) {
      const path = sectorPathByNorm.get(alias);
      if (path && !sectorPathByNormCanonical.has(norm)) {
        sectorPathByNormCanonical.set(norm, path);
      }
      const dots = dotsBySector.get(alias);
      if (dots?.length && !dotsByNorm.has(norm)) {
        dotsByNorm.set(norm, dots);
      }
    }
  }

  return {
    w,
    h,
    ticketsPayload,
    cloudDots,
    sectorPaths,
    fieldCenter,
    dotsByNorm,
    sectorPathByNorm: sectorPathByNormCanonical,
    svgRowLabels,
    meta: loadSectorLabelMeta(),
  };
}

/**
 * @param {ReturnType<typeof loadPrecomputeContext>} [ctx]
 */
export function labelAllSectors(ctx = null) {
  const context = ctx ?? loadPrecomputeContext();
  const result = new Map();
  for (const norm of LUZHNIKI_PRECOMPUTE_SECTOR_NORMS) {
    result.set(norm, labelSectorDots(norm, context));
  }
  return result;
}

/**
 * Runtime: labeled array or on-the-fly label (warn once per sector).
 */
export function getLabeledDots(sectorNorm, ctx = null) {
  const norm = normalizeSectorLabel(sectorNorm);
  const fromFile = loadLabeledDotsArray(norm);
  if (fromFile?.length) return fromFile;
  if (!LUZHNIKI_PRECOMPUTE_SECTOR_NORMS.includes(norm)) return null;
  console.warn(`[luzhnikiGrayDotsLabeler] ${norm}: labeled-dots.json missing, computing on-the-fly`);
  const context = ctx ?? loadPrecomputeContext();
  return labelSectorDots(norm, context);
}

export { LABELED_DOTS_DIR, LUZHNIKI_PRECOMPUTE_SECTOR_NORMS, saveLabeledDotsArray };
