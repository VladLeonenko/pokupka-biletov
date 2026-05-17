/**
 * Индекс мест по серой чаше: ряды от поля, места вдоль seatAxis.
 * Sellable → snap на узел сетки (не fieldGrid / не interpolate без якоря).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

import { buildSectorDotIndex } from './hallSeatGeodesyFromDots.js';
import { buildLabeledSeatIndex, lookupLabeledSeat } from './hallSeatGeodesyMatch.js';
import {
  computeFieldCenterPct,
  rowAxisFromSector,
  seatLeftAxisFromSector,
  sortSectorRowBandsFromField,
} from './hallSeatGeodesySectorNative.js';
import {
  extractPbiletCoordinateCategoriesSectorPaths,
  extractPbiletCoordinatesSeatDots,
  extractPbiletTicketsSeatGeodesy,
  extractPbiletTicketSectorPaths,
  mergeSectorMetaPreferTickets,
} from './luzhnikiPbiletGeodesyExtract.js';
import {
  luzhnikiSectorLookupNorms,
  normalizeSectorLabel,
  strictSeatKey,
} from './ticketHallSectorNormalize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

function parseNum(value) {
  const n = Number.parseInt(String(value ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function seatSortKey(dot, axis) {
  return dot.xPct * axis.x + dot.yPct * axis.y;
}

function distPct(a, b) {
  return Math.hypot(a.xPct - b.xPct, a.yPct - b.yPct);
}

let sectorAnchorsJsonCache = null;

function loadSectorAnchorsJson() {
  if (sectorAnchorsJsonCache) return sectorAnchorsJsonCache;
  const p = path.join(repoRoot, 'backend/data/luzhniki-geodesy/sector-row-anchors.json');
  if (!fs.existsSync(p)) {
    sectorAnchorsJsonCache = {};
    return sectorAnchorsJsonCache;
  }
  sectorAnchorsJsonCache = JSON.parse(fs.readFileSync(p, 'utf8'));
  return sectorAnchorsJsonCache;
}

/** VIP / ложи без r[] в tickets: 4 угла из sector-row-anchors → билинейная сетка row×seat. */
function resolvePolarGridSeat(sectorNorm, apiRow, apiSeat) {
  const anchorsFile = loadSectorAnchorsJson();
  const norms = luzhnikiSectorLookupNorms(sectorNorm);
  let block = null;
  for (const n of norms) {
    if (anchorsFile[n]?.anchors?.length >= 4) {
      block = anchorsFile[n];
      break;
    }
  }
  if (!block?.anchors) return null;

  const rowN = parseNum(apiRow);
  const seatN = parseNum(apiSeat);
  if (rowN == null || seatN == null) return null;

  const nearL = block.anchors.find((a) => a.role === 'nearLeft');
  const nearR = block.anchors.find((a) => a.role === 'nearRight');
  const farL = block.anchors.find((a) => a.role === 'farLeft');
  const farR = block.anchors.find((a) => a.role === 'farRight');
  if (!nearL || !nearR || !farL || !farR) return null;

  const rMin = Math.min(
    parseNum(nearL.row),
    parseNum(nearR.row),
    parseNum(farL.row),
    parseNum(farR.row),
  );
  const rMax = Math.max(
    parseNum(nearL.row),
    parseNum(nearR.row),
    parseNum(farL.row),
    parseNum(farR.row),
  );
  const sNearL = parseNum(nearL.seat);
  const sNearR = parseNum(nearR.seat);
  const sFarL = parseNum(farL.seat);
  const sFarR = parseNum(farR.seat);
  const tRow = rMax > rMin ? (rowN - rMin) / (rMax - rMin) : 0;
  const tSeatNear = sNearR > sNearL ? (seatN - sNearL) / (sNearR - sNearL) : 0;
  const tSeatFar = sFarR > sFarL ? (seatN - sFarL) / (sFarR - sFarL) : 0;

  const lerp = (a, b, t) => ({
    xPct: a.xPct + (b.xPct - a.xPct) * t,
    yPct: a.yPct + (b.yPct - a.yPct) * t,
  });

  const pNear = lerp(nearL, nearR, Math.max(0, Math.min(1, tSeatNear)));
  const pFar = lerp(farL, farR, Math.max(0, Math.min(1, tSeatFar)));
  const p = lerp(pNear, pFar, Math.max(0, Math.min(1, tRow)));
  return { xPct: p.xPct, yPct: p.yPct, geodesySource: 'polarGrid' };
}

/**
 * @param {string} sectorLabel
 * @param {string} sectorPath
 * @param {{ xPct: number, yPct: number }[]} sectorDots
 * @param {{ xPct: number, yPct: number }} fieldCenter
 * @param {number} w
 * @param {number} h
 * @param {number} [rowHint]
 */
export function buildSectorCloudGrid(sectorLabel, sectorPath, sectorDots, fieldCenter, w, h, rowHint = 32) {
  const rowAxis = rowAxisFromSector(sectorPath, fieldCenter, w, h);
  const seatAxis = seatLeftAxisFromSector(sectorPath, fieldCenter, w, h);
  const { bands } = sortSectorRowBandsFromField(
    sectorDots,
    sectorPath,
    fieldCenter,
    w,
    h,
    rowHint,
  );

  const rows = bands.map((band, bandIdx) => {
    const sorted = [...(band.dots ?? [])].sort((a, b) => seatSortKey(a, seatAxis) - seatSortKey(b, seatAxis));
    return {
      bandIdx,
      gridRow: bandIdx + 1,
      dots: sorted.map((d, i) => ({
        ...d,
        gridSeat: i + 1,
      })),
    };
  });

  return { sectorLabel, sectorPath, rows, rowAxis, seatAxis };
}

/**
 * Калибровка: api row/seat → bandIdx / seatIdx по strict якорям pbilet.
 * @param {{ sector: string, row: string, seat: string, xPct: number, yPct: number }[]} strictSeats
 * @param {ReturnType<typeof buildSectorCloudGrid>} grid
 */
export function calibrateSectorGridFromStrict(strictSeats, grid) {
  const rowPairs = [];
  const seatPairs = [];

  for (const st of strictSeats) {
    let bestBand = null;
    let bestBandD = Infinity;
    for (const row of grid.rows) {
      const cy = row.dots.reduce((s, d) => s + d.yPct, 0) / row.dots.length;
      const d = Math.abs(cy - st.yPct);
      if (d < bestBandD) {
        bestBandD = d;
        bestBand = row;
      }
    }
    if (!bestBand) continue;

    const apiRow = parseNum(st.row);
    if (apiRow != null) {
      rowPairs.push({ apiRow, bandIdx: bestBand.bandIdx });
    }

    let bestSeat = null;
    let bestSeatD = Infinity;
    for (const d of bestBand.dots) {
      const dd = distPct(st, d);
      if (dd < bestSeatD) {
        bestSeatD = dd;
        bestSeat = d;
      }
    }
    const apiSeat = parseNum(st.seat);
    if (apiSeat != null && bestSeat) {
      seatPairs.push({ apiRow, apiSeat, gridSeat: bestSeat.gridSeat });
    }
  }

  rowPairs.sort((a, b) => a.apiRow - b.apiRow);

  return { rowPairs, seatPairs, grid };
}

function apiSeatToGridSeat(apiRow, apiSeat, seatPairs, rowDots) {
  const r = parseNum(apiRow);
  const s = parseNum(apiSeat);
  if (s == null || !rowDots?.length) return null;

  const relevant = seatPairs
    .filter((p) => p.apiRow === r)
    .sort((a, b) => a.apiSeat - b.apiSeat);

  if (relevant.length >= 2) {
    if (s <= relevant[0].apiSeat) {
      const span = relevant[1].apiSeat - relevant[0].apiSeat || 1;
      const t = (s - relevant[0].apiSeat) / span;
      return Math.round(relevant[0].gridSeat + t * (relevant[1].gridSeat - relevant[0].gridSeat));
    }
    const last = relevant[relevant.length - 1];
    if (s >= last.apiSeat) {
      const prev = relevant[relevant.length - 2] ?? last;
      const span = last.apiSeat - prev.apiSeat || 1;
      const t = (s - prev.apiSeat) / span;
      return Math.round(prev.gridSeat + t * (last.gridSeat - prev.gridSeat));
    }
    for (let i = 0; i < relevant.length - 1; i += 1) {
      const lo = relevant[i];
      const hi = relevant[i + 1];
      if (s >= lo.apiSeat && s <= hi.apiSeat) {
        const span = hi.apiSeat - lo.apiSeat || 1;
        const t = (s - lo.apiSeat) / span;
        return Math.round(lo.gridSeat + t * (hi.gridSeat - lo.gridSeat));
      }
    }
  }
  if (relevant.length === 1) {
    const offset = s - relevant[0].apiSeat;
    return relevant[0].gridSeat + offset;
  }

  return Math.min(rowDots.length, Math.max(1, s));
}

function apiRowToBandIdx(apiRow, rowPairs, bandCount) {
  const r = parseNum(apiRow);
  if (r == null || rowPairs.length < 1) return null;
  if (rowPairs.length === 1) return rowPairs[0].bandIdx;

  if (r <= rowPairs[0].apiRow) {
    const span = rowPairs[1].apiRow - rowPairs[0].apiRow || 1;
    const t = (r - rowPairs[0].apiRow) / span;
    return Math.round(rowPairs[0].bandIdx + t * (rowPairs[1].bandIdx - rowPairs[0].bandIdx));
  }
  const last = rowPairs[rowPairs.length - 1];
  if (r >= last.apiRow) {
    const prev = rowPairs[rowPairs.length - 2] ?? last;
    const span = last.apiRow - prev.apiRow || 1;
    const t = (r - prev.apiRow) / span;
    return Math.round(prev.bandIdx + t * (last.bandIdx - prev.bandIdx));
  }

  for (let i = 0; i < rowPairs.length - 1; i += 1) {
    const lo = rowPairs[i];
    const hi = rowPairs[i + 1];
    if (r >= lo.apiRow && r <= hi.apiRow) {
      const span = hi.apiRow - lo.apiRow || 1;
      const t = (r - lo.apiRow) / span;
      return Math.round(lo.bandIdx + t * (hi.bandIdx - lo.bandIdx));
    }
  }

  return Math.min(bandCount - 1, Math.max(0, Math.round(((r - rowPairs[0].apiRow) / (rowPairs[rowPairs.length - 1].apiRow - rowPairs[0].apiRow || 1)) * (bandCount - 1))));
}

/**
 * @param {ReturnType<typeof buildSectorCloudGrid>} grid
 * @param {ReturnType<typeof calibrateSectorGridFromStrict>} calibration
 * @param {string} apiRow
 * @param {string} apiSeat
 */
export function resolveCloudGridSeat(grid, calibration, apiRow, apiSeat) {
  const bandIdx = apiRowToBandIdx(apiRow, calibration.rowPairs, grid.rows.length);
  if (bandIdx == null) return null;

  const row = grid.rows.find((r) => r.bandIdx === bandIdx) ?? grid.rows[Math.min(bandIdx, grid.rows.length - 1)];
  if (!row?.dots?.length) return null;

  const gridSeat = apiSeatToGridSeat(apiRow, apiSeat, calibration.seatPairs, row.dots);
  if (gridSeat == null) return null;

  let dot = row.dots.find((d) => d.gridSeat === gridSeat);
  if (!dot) {
    let best = row.dots[0];
    let bestD = Math.abs(best.gridSeat - gridSeat);
    for (const d of row.dots) {
      const dd = Math.abs(d.gridSeat - gridSeat);
      if (dd < bestD) {
        bestD = dd;
        best = d;
      }
    }
    dot = best;
  }

  return { xPct: dot.xPct, yPct: dot.yPct, geodesySource: 'cloudGrid' };
}

/**
 * @param {{
 *   coordinatesPayload?: unknown;
 *   ticketsPayload?: unknown;
 *   sectorPaths?: { label: string, path: string }[];
 *   hallWidth?: number;
 *   hallHeight?: number;
 * }} input
 */
export function buildLuzhnikiCloudGridIndex(input = {}) {
  const w = Number(input.hallWidth) || Number(input.coordinatesPayload?.width) || 11413;
  const h = Number(input.hallHeight) || Number(input.coordinatesPayload?.height) || 9676;
  const cloud = input.coordinatesPayload
    ? extractPbiletCoordinatesSeatDots(input.coordinatesPayload, w, h)
    : input.allSeatCoordinates || [];

  let sectorPaths = input.sectorPaths;
  if (!sectorPaths?.length && input.ticketsPayload && input.coordinatesPayload) {
    sectorPaths = mergeSectorMetaPreferTickets(
      extractPbiletTicketSectorPaths(input.ticketsPayload),
      extractPbiletCoordinateCategoriesSectorPaths(input.coordinatesPayload),
    );
  }

  const fieldCenter = computeFieldCenterPct(cloud);
  const dotsBySector = buildSectorDotIndex(cloud, sectorPaths, w, h);
  const strictAll = input.ticketsPayload
    ? extractPbiletTicketsSeatGeodesy(input.ticketsPayload, w, h)
    : [];

  const gridsByNorm = new Map();
  const calibrationsByNorm = new Map();

  for (const sp of sectorPaths || []) {
    const label = String(sp.label ?? '').trim();
    const path = String(sp.path ?? '').trim();
    if (!label || !path) continue;
    const norm = normalizeSectorLabel(label);
    const sectorDots = dotsBySector.get(norm);
    if (!sectorDots || sectorDots.length < 8) continue;

    const strictSector = strictAll.filter((s) => normalizeSectorLabel(s.sector) === norm);
    const maxRowHint = strictSector.reduce((m, s) => Math.max(m, parseNum(s.row) ?? 0), 0);

    const grid = buildSectorCloudGrid(label, path, sectorDots, fieldCenter, w, h, maxRowHint || 32);
    gridsByNorm.set(norm, grid);

    if (strictSector.length >= 2) {
      calibrationsByNorm.set(norm, calibrateSectorGridFromStrict(strictSector, grid));
    } else {
      calibrationsByNorm.set(norm, { rowPairs: [], seatPairs: [], grid });
    }
  }

  return { gridsByNorm, calibrationsByNorm, hallWidth: w, hallHeight: h, cloudDotCount: cloud.length };
}

/**
 * Sellable: strict → cloudGrid snap → polarGrid (VIP).
 * @param {unknown} ticketsPayload
 * @param {unknown[]} offers
 * @param {Record<string, unknown>} layout
 * @param {ReturnType<typeof buildLuzhnikiCloudGridIndex>} [gridIndex]
 */
export function buildSellableSeatGeodesyCloudGridSnap(
  ticketsPayload,
  offers,
  layout = {},
  gridIndex = null,
) {
  const w = Number(layout?.geodesy?.hallWidth) || 11413;
  const h = Number(layout?.geodesy?.hallHeight) || 9676;

  const index =
    gridIndex ??
    buildLuzhnikiCloudGridIndex({
      ticketsPayload,
      coordinatesPayload: layout._coordinatesPayload,
      allSeatCoordinates: layout.allSeatCoordinates,
      sectorPaths: layout.sectorMode?.sectors,
      hallWidth: w,
      hallHeight: h,
    });

  const strictIndex = buildLabeledSeatIndex(extractPbiletTicketsSeatGeodesy(ticketsPayload, w, h));

  const seen = new Set();
  const seats = [];
  let strictMatched = 0;
  let cloudGridMatched = 0;
  let polarMatched = 0;
  let totalSellable = 0;
  const unmatchedSamples = [];

  for (const o of offers) {
    const sector = String(o.Sector ?? '');
    const row = String(o.Row ?? '');
    const list = Array.isArray(o.SeatList) ? o.SeatList.map(String) : [];
    const norm = normalizeSectorLabel(sector);

    for (const seat of list) {
      if (!seat.trim()) continue;
      totalSellable += 1;
      const dedupe = strictSeatKey(sector, row, seat);
      if (seen.has(dedupe)) continue;

      const direct = lookupLabeledSeat(strictIndex, sector, row, seat);
      if (direct) {
        seen.add(dedupe);
        strictMatched += 1;
        seats.push({
          sector,
          row,
          seat,
          xPct: direct.xPct,
          yPct: direct.yPct,
          geodesySource: 'strict',
        });
        continue;
      }

      const cal = index.calibrationsByNorm.get(norm);
      const grid = index.gridsByNorm.get(norm);
      if (cal && grid) {
        const hit = resolveCloudGridSeat(grid, cal, row, seat);
        if (hit) {
          seen.add(dedupe);
          cloudGridMatched += 1;
          seats.push({ sector, row, seat, ...hit });
          continue;
        }
      }

      const polar = resolvePolarGridSeat(norm, row, seat);
      if (polar) {
        seen.add(dedupe);
        polarMatched += 1;
        seats.push({ sector, row, seat, ...polar });
        continue;
      }

      if (unmatchedSamples.length < 24) unmatchedSamples.push({ sector, row, seat });
    }
  }

  return {
    seats,
    matched: seats.length,
    totalSellable,
    strictMatched,
    cloudGridMatched,
    polarMatched,
    svgCircleCount: strictMatched + cloudGridMatched + polarMatched,
    svgCircleMatched: strictMatched + cloudGridMatched + polarMatched,
    sectorGridMatched: cloudGridMatched,
    layoutSeatCount: 0,
    dotMatched: 0,
    cloudMatched: cloudGridMatched,
    svgRowMatched: 0,
    cloudSnapMatched: cloudGridMatched,
    anchorInterpolated: 0,
    unmatchedSamples,
    geodesyMode: 'cloud-grid-snap',
  };
}

/**
 * Полный набор мест для pilot bundle: strict + все узлы cloudGrid (подписанные grid row/seat).
 */
export function buildFullCloudGridLabeledSeats({
  ticketsPayload,
  coordinatesPayload,
  svgMarkup,
  hallWidth,
  hallHeight,
}) {
  const w = Number(hallWidth) || Number(coordinatesPayload?.width) || 11413;
  const h = Number(hallHeight) || Number(coordinatesPayload?.height) || 9676;

  const index = buildLuzhnikiCloudGridIndex({ ticketsPayload, coordinatesPayload, hallWidth: w, hallHeight: h });
  const strictIndex = buildLabeledSeatIndex(extractPbiletTicketsSeatGeodesy(ticketsPayload, w, h));
  const seen = new Set();
  const out = [];

  for (const s of strictIndex.values()) {
    const key = strictSeatKey(s.sector, s.row, s.seat);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      sector: s.sector,
      row: s.row,
      seat: s.seat,
      xPct: s.xPct,
      yPct: s.yPct,
      geodesySource: 'strict',
    });
  }

  for (const [norm, grid] of index.gridsByNorm) {
    const cal = index.calibrationsByNorm.get(norm);
    for (const row of grid.rows) {
      for (const dot of row.dots) {
        const apiRow = cal?.rowPairs?.length
          ? interpolateBandToApiRow(row.bandIdx, cal.rowPairs)
          : String(row.gridRow);
        const apiSeat = String(dot.gridSeat);
        const key = strictSeatKey(grid.sectorLabel, apiRow, apiSeat);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          sector: grid.sectorLabel,
          row: apiRow,
          seat: apiSeat,
          xPct: dot.xPct,
          yPct: dot.yPct,
          geodesySource: 'cloudGrid',
        });
      }
    }
  }

  return {
    seats: out,
    sectorPaths: mergeSectorMetaPreferTickets(
      extractPbiletTicketSectorPaths(ticketsPayload),
      extractPbiletCoordinateCategoriesSectorPaths(coordinatesPayload),
    ),
    hallWidth: w,
    hallHeight: h,
    stats: {
      strictCount: out.filter((s) => s.geodesySource === 'strict').length,
      cloudGridCount: out.filter((s) => s.geodesySource === 'cloudGrid').length,
      sectorCount: index.gridsByNorm.size,
      coordinateDots: index.cloudDotCount,
    },
  };
}

export function interpolateBandToApiRow(bandIdx, rowPairs) {
  if (!rowPairs?.length) return String(bandIdx + 1);
  for (let i = 0; i < rowPairs.length - 1; i += 1) {
    const lo = rowPairs[i];
    const hi = rowPairs[i + 1];
    if (bandIdx >= lo.bandIdx && bandIdx <= hi.bandIdx) {
      const span = hi.bandIdx - lo.bandIdx || 1;
      const t = (bandIdx - lo.bandIdx) / span;
      const api = lo.apiRow + t * (hi.apiRow - lo.apiRow);
      return String(Math.round(api));
    }
  }
  const last = rowPairs[rowPairs.length - 1];
  return String(last.apiRow);
}
