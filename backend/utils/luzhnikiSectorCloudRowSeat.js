/**
 * Sellable из облака coordinates: sector path → ряды (полярная ось) → места вдоль хорды.
 * Не «ближайшая серая» в 2D: row/seat из оффера задают полосу и позицию на хорде.
 */

import { buildSectorDotIndex } from './hallSeatGeodesyFromDots.js';
import { loadSectorCalibrationBlocksByNorm } from './hallSeatGeodesySectorRowAnchors.js';
import {
  buildSectorCloudGrid,
  calibrateSectorGridFromStrict,
  resolveCloudGridSeat,
} from './luzhnikiCloudGridSeatIndex.js';
import { extractPbiletCoordinatesSeatDots } from './luzhnikiPbiletGeodesyExtract.js';
import { resolveRowYPctFromSvgLabels } from './hallSeatGeodesyFromSvgRows.js';
import {
  computeFieldCenterPct,
  findBandIndexForRowNum,
  labelSectorBandsWithSvgRowNumbers,
  resolveSectorNativeMaxRow,
  rowNumToBandIndex,
  sortSectorRowBandsFromField,
} from './hallSeatGeodesySectorNative.js';
import { loadProdLayoutSeats } from './luzhnikiProdLayoutSeats.js';
import { SECTOR_RADIAL_PRIORITY_NORMS } from './luzhnikiSectorPolarGrid.js';

/** Пока только A101: угловой клин без r[] в tickets; B155/B156 — после калибровки. */
export const SECTOR_CLOUD_ROW_SEAT_NORMS = new Set(['a101']);
import {
  luzhnikiSectorLookupNorms,
  normalizeSectorLabel,
} from './ticketHallSectorNormalize.js';

function parseNum(value) {
  const n = Number.parseInt(String(value ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function clamp01(t) {
  return Math.max(0, Math.min(1, t));
}

function seatSortKey(dot, axis) {
  return dot.xPct * axis.x + dot.yPct * axis.y;
}

function lerpDot(a, b, t) {
  return {
    xPct: a.xPct + (b.xPct - a.xPct) * t,
    yPct: a.yPct + (b.yPct - a.yPct) * t,
  };
}

function pickAlongSortedDots(sorted, t) {
  if (!sorted.length) return null;
  if (sorted.length === 1) return sorted[0];
  const idx = clamp01(t) * (sorted.length - 1);
  const i0 = Math.floor(idx);
  const i1 = Math.min(sorted.length - 1, i0 + 1);
  const f = idx - i0;
  return lerpDot(sorted[i0], sorted[i1], f);
}

/**
 * @param {{ sector: string, row: string, seat: string, xPct: number, yPct: number }[]} labeledSeats
 * @param {ReturnType<typeof buildSectorCloudGrid>} grid
 */
function calibrateFromLabeledSeats(labeledSeats, grid) {
  if (!labeledSeats?.length) return { rowPairs: [], seatPairs: [], grid };
  return calibrateSectorGridFromStrict(labeledSeats, grid);
}

/**
 * @param {{ xPct: number, yPct: number }[]} dots
 * @param {{ x: number, y: number }} seatAxis
 * @param {number} seatN
 * @param {{ min?: number, max?: number } | null} seatRangeInRow
 * @param {object | null} block sector-row-anchors block
 */
function pickSeatAlongBand(dots, seatAxis, seatN, seatRangeInRow, block) {
  if (!dots?.length) return null;
  const sorted = [...dots].sort((a, b) => seatSortKey(a, seatAxis) - seatSortKey(b, seatAxis));
  const originSeat = parseNum(block?.originSeat) ?? 1;
  const seatMin = seatRangeInRow?.min ?? originSeat;
  let seatMax = seatRangeInRow?.max;
  if (seatMax == null) {
    seatMax = parseNum(block?.maxSeatPerRow) ?? sorted.length;
  }
  if (seatMax <= seatMin) seatMax = seatMin + Math.max(1, sorted.length - 1);

  let t;
  if (block?.seatCountFromLeft) {
    t = 1 - (seatN - seatMin) / Math.max(1, seatMax - seatMin);
  } else if (block?.seatCountFromRight || block?.seatMirror) {
    t = 1 - (seatN - seatMin) / Math.max(1, seatMax - seatMin);
  } else {
    t = (seatN - seatMin) / Math.max(1, seatMax - seatMin);
  }
  return pickAlongSortedDots(sorted, t);
}

/**
 * Полоса облака для API-ряда: SVG Y → ближайшая полоса; иначе подписанные bands / bandIdx.
 * @param {object} entry
 * @param {number} rowN
 */
function resolveRowBandDots(entry, rowN) {
  const { grid, labeledBands, sectorPath, svgRowLabels, sectorDots, fieldCenter, w, h } = entry;
  if (!grid?.rows?.length) return null;

  const targetY =
    sectorPath && svgRowLabels?.length && sectorDots?.length
      ? resolveRowYPctFromSvgLabels(
          rowN,
          sectorPath,
          svgRowLabels,
          w,
          h,
          18,
          fieldCenter,
          sectorDots,
        )
      : null;

  if (targetY != null) {
    let bestRow = null;
    let bestD = Infinity;
    for (const row of grid.rows) {
      if (!row.dots?.length) continue;
      const cy = row.dots.reduce((s, d) => s + d.yPct, 0) / row.dots.length;
      const d = Math.abs(cy - targetY);
      if (d < bestD) {
        bestD = d;
        bestRow = row;
      }
    }
    if (bestRow?.dots?.length >= 2) {
      return { dots: bestRow.dots, via: 'cloudRowSeat+svgY' };
    }
  }

  if (labeledBands?.length >= 2) {
    const band = labeledBands[findBandIndexForRowNum(rowN, labeledBands)];
    if (band?.dots?.length >= 2 && band.rowNum === rowN) {
      return { dots: band.dots, via: 'cloudRowSeat+svgRow' };
    }
  }

  const maxRow = resolveSectorNativeMaxRow(
    sectorPath,
    svgRowLabels ?? [],
    grid.rows.length,
    entry.sectorRowMax ?? null,
    w,
    h,
    fieldCenter,
  );
  const bandIdx = rowNumToBandIndex(rowN, maxRow, grid.rows.length);
  const row = grid.rows[Math.min(Math.max(bandIdx, 0), grid.rows.length - 1)];
  if (row?.dots?.length >= 2) {
    return { dots: row.dots, via: 'cloudRowSeat+bandIdx' };
  }
  return null;
}

/**
 * @param {object} entry
 * @param {string} apiRow
 * @param {string} apiSeat
 * @param {{ min?: number, max?: number } | null} [seatRangeInRow]
 */
export function resolveSectorCloudRowSeat(entry, apiRow, apiSeat, seatRangeInRow = null) {
  if (!entry?.grid?.rows?.length) return null;
  const rowN = parseNum(apiRow);
  const seatN = parseNum(apiSeat);
  if (rowN == null || seatN == null) return null;

  const { grid, calibration, block } = entry;

  const band = resolveRowBandDots(entry, rowN);
  if (band?.dots?.length >= 2) {
    const pt = pickSeatAlongBand(band.dots, grid.seatAxis, seatN, seatRangeInRow, block);
    if (pt) {
      return { xPct: pt.xPct, yPct: pt.yPct, geodesySource: band.via };
    }
  }

  const distinctRows = new Set((calibration?.rowPairs ?? []).map((p) => p.apiRow));
  if (distinctRows.size >= 3) {
    const hit = resolveCloudGridSeat(grid, calibration, apiRow, apiSeat);
    if (hit) {
      return { xPct: hit.xPct, yPct: hit.yPct, geodesySource: 'cloudRowSeat+cal' };
    }
  }

  return null;
}

/**
 * @param {{
 *   cloudDots: { xPct: number, yPct: number }[];
 *   sectorPaths: { label: string, path: string }[];
 *   hallWidth: number;
 *   hallHeight: number;
 *   svgRowLabels?: object[];
 *   labeledSeatsByNorm?: Map<string, { sector: string, row: string, seat: string, xPct: number, yPct: number }[]>;
 *   sectorRowMaxByNorm?: Map<string, number>;
 * }} input
 */
export function buildSectorCloudRowSeatIndex(input) {
  const w = Number(input.hallWidth) || 11413;
  const h = Number(input.hallHeight) || 9676;
  const cloudDots = input.cloudDots || [];
  const fieldCenter = computeFieldCenterPct(cloudDots);
  const dotsBySector = buildSectorDotIndex(cloudDots, input.sectorPaths, w, h);
  const blocks = loadSectorCalibrationBlocksByNorm();
  const byNorm = new Map();

  for (const sp of input.sectorPaths || []) {
    const label = String(sp.label ?? '').trim();
    const sectorPath = String(sp.path ?? '').trim();
    if (!label || !sectorPath) continue;
    const norm = normalizeSectorLabel(label);
    if (!SECTOR_CLOUD_ROW_SEAT_NORMS.has(norm)) continue;

    const sectorDots = dotsBySector.get(norm);
    if (!sectorDots || sectorDots.length < 12) continue;

    const block = blocks.get(norm);
    const rowHint = Math.max(
      parseNum(block?.anchors?.find((a) => a.role === 'farLeft')?.row) ?? 0,
      input.sectorRowMaxByNorm?.get(norm) ?? 0,
      32,
    );

    const grid = buildSectorCloudGrid(label, sectorPath, sectorDots, fieldCenter, w, h, rowHint);
    const labeled = input.labeledSeatsByNorm?.get(norm) ?? [];
    let calibration = calibrateFromLabeledSeats(labeled, grid);

    const { bands } = sortSectorRowBandsFromField(
      sectorDots,
      sectorPath,
      fieldCenter,
      w,
      h,
      rowHint,
    );
    const labeledBands =
      input.svgRowLabels?.length >= 2
        ? labelSectorBandsWithSvgRowNumbers(
            bands,
            sectorPath,
            input.svgRowLabels,
            fieldCenter,
            w,
            h,
          )
        : [];

    byNorm.set(norm, {
      grid,
      calibration,
      labeledBands,
      block,
      fieldCenter,
      sectorPath,
      sectorDots,
      svgRowLabels: input.svgRowLabels,
      sectorRowMax: input.sectorRowMaxByNorm?.get(norm) ?? null,
      w,
      h,
    });
  }

  return { byNorm, hallWidth: w, hallHeight: h, fieldCenter, cloudDotCount: cloudDots.length };
}

/**
 * @param {ReturnType<typeof buildSectorCloudRowSeatIndex>} index
 * @param {string} sector
 * @param {string} row
 * @param {string} seat
 * @param {{ min?: number, max?: number } | null} [seatRangeInRow]
 */
export function trySectorCloudRowSeatForRadial(index, sector, row, seat, seatRangeInRow = null) {
  if (!index?.byNorm?.size) return null;
  const norm = normalizeSectorLabel(sector);
  if (!SECTOR_CLOUD_ROW_SEAT_NORMS.has(norm)) return null;

  let entry = null;
  for (const n of luzhnikiSectorLookupNorms(sector)) {
    entry = index.byNorm.get(n);
    if (entry) break;
  }
  if (!entry) return null;

  const hit = resolveSectorCloudRowSeat(entry, row, seat, seatRangeInRow);
  if (!hit) return null;
  return {
    sector,
    row: String(row),
    seat: String(seat),
    xPct: hit.xPct,
    yPct: hit.yPct,
    geodesySource: hit.geodesySource,
  };
}

/**
 * @param {{
 *   layout: Record<string, unknown>;
 *   ticketsPayload: unknown;
 *   sectorPaths: { label: string, path: string }[];
 *   layoutIndex: Map;
 *   prodLayoutIndex: Map;
 *   svgRowLabels: object[];
 *   hallWidth: number;
 *   hallHeight: number;
 *   offers: unknown[];
 *   loadCoordinatesPayload?: () => unknown;
 * }} opts
 */
export function buildCloudRowSeatIndexForSellable(opts) {
  const w = Number(opts.hallWidth) || 11413;
  const h = Number(opts.hallHeight) || 9676;
  let cloudDots = Array.isArray(opts.layout?.allSeatCoordinates)
    ? opts.layout.allSeatCoordinates
    : [];

  if (cloudDots.length < 500 && typeof opts.loadCoordinatesPayload === 'function') {
    const payload = opts.loadCoordinatesPayload();
    if (payload) {
      cloudDots = extractPbiletCoordinatesSeatDots(payload, w, h);
    }
  }
  if (cloudDots.length < 500) return null;

  const { seats: prodSeats } = loadProdLayoutSeats({ hallWidth: w, hallHeight: h });
  const labeledSeatsByNorm = new Map();
  const sectorRowMaxByNorm = new Map();

  const pushLabeled = (s) => {
    const norm = normalizeSectorLabel(s.sector);
    if (!SECTOR_CLOUD_ROW_SEAT_NORMS.has(norm)) return;
    const arr = labeledSeatsByNorm.get(norm) ?? [];
    arr.push(s);
    labeledSeatsByNorm.set(norm, arr);
  };

  for (const s of prodSeats) {
    pushLabeled(s);
  }
  if (opts.layoutIndex?.values) {
    for (const s of opts.layoutIndex.values()) {
      pushLabeled(s);
    }
  }
  if (opts.prodLayoutIndex?.values) {
    for (const s of opts.prodLayoutIndex.values()) {
      pushLabeled(s);
    }
  }

  for (const o of opts.offers || []) {
    const norm = normalizeSectorLabel(o.Sector);
    if (!norm) continue;
    const rows = new Set();
    const row = parseNum(o.Row);
    if (row != null) rows.add(row);
    const prev = sectorRowMaxByNorm.get(norm) ?? 0;
    if (row != null) sectorRowMaxByNorm.set(norm, Math.max(prev, row));
  }

  return buildSectorCloudRowSeatIndex({
    cloudDots,
    sectorPaths: opts.sectorPaths,
    hallWidth: w,
    hallHeight: h,
    svgRowLabels: opts.svgRowLabels,
    labeledSeatsByNorm,
    sectorRowMaxByNorm,
  });
}

export { SECTOR_RADIAL_PRIORITY_NORMS };
