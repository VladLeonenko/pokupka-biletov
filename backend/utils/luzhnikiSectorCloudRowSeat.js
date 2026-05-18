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
import {
  findBandIndexNearestY,
  getRowLabelYPctInSector,
  resolveRowYPctFromSvgLabels,
} from './hallSeatGeodesyFromSvgRows.js';
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

/**
 * @param {{ sector: string, row: string, seat: string, xPct: number, yPct: number }[]} labeledSeats
 * @param {ReturnType<typeof buildSectorCloudGrid>} grid
 */
function calibrateFromLabeledSeats(labeledSeats, grid) {
  if (!labeledSeats?.length) return { rowPairs: [], seatPairs: [], grid };
  return calibrateSectorGridFromStrict(labeledSeats, grid);
}

/**
 * Место M → реальная серая точка в ряду (не lerp между точками).
 * @param {{ xPct: number, yPct: number }[]} sorted
 */
function pickGrayDotAtSeat(sorted, seatN, seatRangeInRow, block) {
  if (!sorted?.length) return null;
  const originSeat = parseNum(block?.originSeat) ?? 1;
  const seatMin = seatRangeInRow?.min ?? originSeat;
  let seatMax = seatRangeInRow?.max;
  if (seatMax == null) seatMax = parseNum(block?.maxSeatPerRow) ?? sorted.length;
  if (seatMax < seatMin) seatMax = seatMin;

  const seatCount = Math.max(1, seatMax - seatMin + 1);
  const seatOrdinal = seatN - seatMin;
  let rel =
    seatCount <= 1
      ? 0
      : block?.seatCountFromLeft || block?.seatCountFromRight || block?.seatMirror
        ? 1 - seatOrdinal / (seatCount - 1)
        : seatOrdinal / (seatCount - 1);
  rel = clamp01(rel);

  const idx =
    seatCount <= 1 || sorted.length <= 1
      ? 0
      : Math.min(
          sorted.length - 1,
          Math.round((seatOrdinal / (seatCount - 1)) * (sorted.length - 1)),
        );
  return sorted[idx];
}

/** Snap вдоль хорды ряда (1D по seatAxis), не nearest 2D по сектору. */
function snapToGrayAlongChord(sorted, seatAxis, hintPt) {
  if (!sorted?.length || !hintPt) return null;
  const target = seatSortKey(hintPt, seatAxis);
  let best = sorted[0];
  let bestD = Infinity;
  for (const d of sorted) {
    const dd = Math.abs(seatSortKey(d, seatAxis) - target);
    if (dd < bestD) {
      bestD = dd;
      best = d;
    }
  }
  return best;
}

function sortBandDots(bandDots, seatAxis) {
  return [...(bandDots || [])].sort((a, b) => seatSortKey(a, seatAxis) - seatSortKey(b, seatAxis));
}

const MIN_GRAY_ROW_BAND_DOTS = 6;
const MIN_LABELED_ROW_BAND_DOTS = 4;
const MAX_SVG_ROW_Y_BAND_GAP_PCT = 1.0;

function bandCentroidYPct(dots) {
  if (!dots?.length) return null;
  return dots.reduce((s, d) => s + d.yPct, 0) / dots.length;
}

/** Y% подписи ряда N на схеме сектора (шкала справа A101). */
function resolveTargetRowYPct(entry, rowN) {
  const { sectorPath, svgRowLabels, sectorDots, fieldCenter, w, h } = entry;
  if (!sectorPath || !svgRowLabels?.length) return null;
  const fromAisle = getRowLabelYPctInSector(rowN, sectorPath, svgRowLabels, w, h);
  if (fromAisle != null) return fromAisle;
  if (!sectorDots?.length) return null;
  return resolveRowYPctFromSvgLabels(
    rowN,
    sectorPath,
    svgRowLabels,
    w,
    h,
    18,
    fieldCenter,
    sectorDots,
  );
}

/**
 * Полоса облака для API-ряда N: ближайшая по Y к подписи ряда на SVG (не bandIdx 11→30).
 * @param {object} entry
 * @param {number} rowN
 */
function resolveRowBandDots(entry, rowN) {
  const { grid, labeledBands, sectorPath, svgRowLabels, w, h, fieldCenter } = entry;
  if (!grid?.rows?.length) return null;

  const targetY = resolveTargetRowYPct(entry, rowN);

  if (labeledBands?.length >= 2 && targetY != null) {
    const candidates = labeledBands
      .map((band) => ({
        band,
        yPct: bandCentroidYPct(band.dots),
        n: band.dots?.length ?? 0,
      }))
      .filter((c) => c.n >= MIN_LABELED_ROW_BAND_DOTS && c.yPct != null);
    if (candidates.length) {
      const bi = findBandIndexNearestY(
        candidates.map((c) => ({ yPct: c.yPct })),
        targetY,
      );
      const chosen = candidates[bi];
      if (chosen?.band?.dots?.length) {
        if (Math.abs(chosen.yPct - targetY) <= MAX_SVG_ROW_Y_BAND_GAP_PCT) {
          return { dots: chosen.band.dots, via: 'cloudRowSeat+svgRowY' };
        }
        const approx = labeledBands[findBandIndexForRowNum(rowN, labeledBands)];
        if (approx?.dots?.length >= MIN_LABELED_ROW_BAND_DOTS) {
          return { dots: approx.dots, via: 'cloudRowSeat+svgRowNum' };
        }
        return { dots: chosen.band.dots, via: 'cloudRowSeat+svgRowY+gap' };
      }
    }
  }

  if (labeledBands?.length >= 2) {
    const band = labeledBands[findBandIndexForRowNum(rowN, labeledBands)];
    if (band?.dots?.length >= MIN_GRAY_ROW_BAND_DOTS && Number(band.rowNum) === rowN) {
      return { dots: band.dots, via: 'cloudRowSeat+svgRow' };
    }
  }

  const denseRows = grid.rows.filter((r) => r.dots?.length >= MIN_GRAY_ROW_BAND_DOTS);
  if (targetY != null && denseRows.length) {
    let bestRow = null;
    let bestD = Infinity;
    for (const gridRow of denseRows) {
      const cy = bandCentroidYPct(gridRow.dots);
      const d = Math.abs(cy - targetY);
      if (d < bestD) {
        bestD = d;
        bestRow = gridRow;
      }
    }
    if (bestRow) {
      return { dots: bestRow.dots, via: 'cloudRowSeat+svgY' };
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
  if (row?.dots?.length >= MIN_GRAY_ROW_BAND_DOTS) {
    return { dots: row.dots, via: 'cloudRowSeat+bandIdx' };
  }
  if (row?.dots?.length >= 2) {
    return { dots: row.dots, via: 'cloudRowSeat+bandIdx+thin' };
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
  if (band?.dots?.length >= 1) {
    const sorted = sortBandDots(band.dots, grid.seatAxis);
    const pt = pickGrayDotAtSeat(sorted, seatN, seatRangeInRow, block);
    if (pt) {
      return { xPct: pt.xPct, yPct: pt.yPct, geodesySource: `grayCloud+${band.via}` };
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
function getCloudEntry(index, sector) {
  if (!index?.byNorm?.size) return null;
  for (const n of luzhnikiSectorLookupNorms(sector)) {
    const entry = index.byNorm.get(n);
    if (entry) return entry;
  }
  return null;
}

/**
 * Sellable на серой точке: ряд из SVG-полосы + место по §3 (seatCountFromLeft).
 * @param {ReturnType<typeof buildSectorCloudRowSeatIndex>} index
 * @param {{ xPct?: number, yPct?: number }} [radialHint] — после radialGrid, snap вдоль хорды
 */
export function resolveSellableGrayCloudSeat(
  index,
  sector,
  row,
  seat,
  seatRangeInRow = null,
  radialHint = null,
) {
  const norm = normalizeSectorLabel(sector);
  if (!SECTOR_CLOUD_ROW_SEAT_NORMS.has(norm)) return null;
  const entry = getCloudEntry(index, sector);
  if (!entry) return null;

  const rowN = parseNum(row);
  const seatN = parseNum(seat);
  if (rowN == null || seatN == null) return null;

  const band = resolveRowBandDots(entry, rowN);
  if (!band?.dots?.length) return null;

  const sorted = sortBandDots(band.dots, entry.grid.seatAxis);
  let dot = pickGrayDotAtSeat(sorted, seatN, seatRangeInRow, entry.block);
  let via = `grayCloud+${band.via}`;

  if (
    radialHint &&
    Number.isFinite(radialHint.xPct) &&
    Number.isFinite(radialHint.yPct)
  ) {
    const along = snapToGrayAlongChord(sorted, entry.grid.seatAxis, radialHint);
    if (along) {
      dot = along;
      via = `grayCloud+radialChord+${band.via}`;
    }
  }

  if (!dot) return null;
  return {
    sector,
    row: String(row),
    seat: String(seat),
    xPct: dot.xPct,
    yPct: dot.yPct,
    geodesySource: via,
  };
}

/** @deprecated use resolveSellableGrayCloudSeat */
export function trySectorCloudRowSeatForRadial(index, sector, row, seat, seatRangeInRow = null) {
  return resolveSellableGrayCloudSeat(index, sector, row, seat, seatRangeInRow, null);
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
    const src = String(s.geodesySource ?? '').toLowerCase();
    if (src.includes('fieldgrid')) continue;
    pushLabeled(s);
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

// ─── Doc mechanical port (labeled-dots + anchor-band gray cloud) ─────────────

function projectOnAxisDoc(pt, origin, axis) {
  return (pt.x - origin.x) * axis.x + (pt.y - origin.y) * axis.y;
}

function normalizeDoc(v) {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function clusterDotsIntoRowBands(dots, anchors, expectedRows) {
  const depthAxis = normalizeDoc({
    x: anchors.farLeft.x - anchors.nearLeft.x,
    y: anchors.farLeft.y - anchors.nearLeft.y,
  });

  const projected = dots.map((pt, i) => ({
    pt,
    idx: i,
    depthT: projectOnAxisDoc(pt, anchors.nearLeft, depthAxis),
  }));

  projected.sort((a, b) => a.depthT - b.depthT);

  const gaps = [];
  for (let i = 1; i < projected.length; i++) {
    gaps.push({
      i,
      gap: projected[i].depthT - projected[i - 1].depthT,
    });
  }
  gaps.sort((a, b) => b.gap - a.gap);

  const splitPoints = gaps
    .slice(0, expectedRows - 1)
    .map((g) => g.i)
    .sort((a, b) => a - b);

  const bands = [];
  let start = 0;
  for (const sp of splitPoints) {
    bands.push(projected.slice(start, sp).map((p) => p.pt));
    start = sp;
  }
  bands.push(projected.slice(start).map((p) => p.pt));

  return bands;
}

export function sortDotsAlongChord(band, anchors) {
  const chordAxis = normalizeDoc({
    x: anchors.nearRight.x - anchors.nearLeft.x,
    y: anchors.nearRight.y - anchors.nearLeft.y,
  });

  return [...band].sort(
    (a, b) =>
      projectOnAxisDoc(a, anchors.nearLeft, chordAxis) -
      projectOnAxisDoc(b, anchors.nearLeft, chordAxis),
  );
}

export function resolveSellableGrayCloudSeatByAnchors(dots, anchors, rowN, seatN, params) {
  const { seatCountFromLeft = false, expectedRows = 38 } = params ?? {};

  const bands = clusterDotsIntoRowBands(dots, anchors, expectedRows);
  if (rowN < 1 || rowN > bands.length) return null;

  const band = bands[rowN - 1];
  const sorted = sortDotsAlongChord(band, anchors);

  const idx = seatN - 1;

  if (idx < 0 || idx >= sorted.length) return null;

  return {
    ...sorted[idx],
    geodesySource: 'grayCloud',
  };
}

export function buildLabeledDotsMap(labeledDots) {
  const map = new Map();
  for (const d of labeledDots) {
    map.set(`${d.row}:${d.seat}`, { x: d.x, y: d.y });
  }
  return map;
}

export function resolveSellableFromLabeledDots(labeledMap, rowN, seatN) {
  const pt = labeledMap.get(`${rowN}:${seatN}`);
  if (!pt) return null;
  return { x: pt.x, y: pt.y, geodesySource: 'grayCloud+labeled' };
}
