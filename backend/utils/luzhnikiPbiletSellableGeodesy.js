/**
 * Sellable-геодезия для Лужников:
 * strict (tickets) → fieldGrid по оффер-ряду → sector-native (облако) → polarGrid → pbilet-интерполяция.
 * Координаты считаются на каждый GET /map, не из сида.
 */

import { buildLabeledSeatIndex, lookupLabeledSeat } from './hallSeatGeodesyMatch.js';
import { getLuzhnikiLabeledSeatIndex } from './luzhnikiSeatIndexCache.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getManualSectorRowAnchors,
  loadSectorCalibrationBlocksByNorm,
} from './hallSeatGeodesySectorRowAnchors.js';
import {
  buildSectorDotIndex,
  buildSectorOfferRowRanges,
  buildSectorOfferSeatRangesByRow,
} from './hallSeatGeodesyFromDots.js';
import {
  parseSvgHallRowLabels,
  resolveOfferSeatFromSvgRowLabels,
} from './hallSeatGeodesyFromSvgRows.js';
import { computeFieldCenterPct } from './hallSeatGeodesySectorNative.js';
import {
  collectLayoutSectorPbiletSeats,
  countPbiletRowAnchors,
  extractPbiletTicketsSeatGeodesy,
  extractPbiletTicketSectorPaths,
  interpolatePbiletSeatGeodesy,
  snapFieldGridSeat,
} from './luzhnikiPbiletGeodesyExtract.js';
import { clampPctToSectorBbox, getSectorBboxPct } from './luzhnikiSectorBbox.js';
import {
  prefersSectorRadialCorner,
  resolvePolarGridSeatFromAnchors,
  tryExactPbiletLabeledForRadialSector,
} from './luzhnikiSectorPolarGrid.js';
import {
  getCachedCloudMasterIndex,
  snapToCloudMaster,
  useCloudMasterMap,
} from './luzhnikiCloudMasterMap.js';
import {
  applyLeftTribuneScale,
  layoutAnchorLookupRow,
  layoutAnchorRowShift,
  sectorAnchorPivot,
} from './luzhnikiPilotLayoutCalibrate.js';
import { loadSeatsArrayFromLayout } from './luzhnikiSeatIndexCache.js';
import { getCachedProdLayoutLabeledIndex } from './luzhnikiProdLayoutSeats.js';
import {
  buildCloudRowSeatIndexForSellable,
  trySectorCloudRowSeatForRadial,
} from './luzhnikiSectorCloudRowSeat.js';
import {
  prefersSectorAxisGrid,
  resolveSellableOnSectorAxisGrid,
} from './luzhnikiSectorAxisGridPlacement.js';
import {
  luzhnikiSectorLookupNorms,
  normalizeSectorLabel,
  strictSeatKey,
} from './ticketHallSectorNormalize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

function parseRowNum(value) {
  const n = Number.parseInt(String(value ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function loadCoordinatesPayload() {
  const p =
    process.env.LUZHNIKI_COORDINATES_JSON?.trim() ||
    path.join(repoRoot, 'luzhniki.txt');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function filterPbiletForNorms(pbilet, lookupNorms) {
  const norms = new Set(lookupNorms.map((n) => normalizeSectorLabel(n)));
  return pbilet.filter((s) => norms.has(normalizeSectorLabel(s.sector)));
}

function resolveSectorPbiletAnchors(pbilet, layoutIndex, lookupNorms, label) {
  const fromTickets = filterPbiletForNorms(pbilet, lookupNorms).map((s) => ({
    ...s,
    sector: label || s.sector,
  }));
  if (countPbiletRowAnchors(fromTickets) >= 2) {
    return { anchors: fromTickets, mode: 'tickets' };
  }
  const fromLayout = collectLayoutSectorPbiletSeats(layoutIndex, lookupNorms, label);
  if (countPbiletRowAnchors(fromLayout) >= 2) {
    return { anchors: fromLayout, mode: 'layout-anchors' };
  }
  const manual = getManualSectorRowAnchors(label || lookupNorms[0] || '');
  if (manual.length >= 4) {
    return {
      anchors: manual.map((a) => ({
        sector: label || lookupNorms[0] || '',
        row: a.row,
        seat: a.seat,
        xPct: a.xPct,
        yPct: a.yPct,
      })),
      mode: 'sector-anchors',
    };
  }
  return { anchors: [], mode: 'none' };
}

function canonicalSectorLabel(pbilet, lookupNorms, offerSector) {
  for (const norm of lookupNorms) {
    const fromPb = pbilet.find((s) => normalizeSectorLabel(s.sector) === norm)?.sector;
    if (fromPb) return fromPb;
  }
  return offerSector || lookupNorms[0] || '';
}

function finalizeSellableCoords(sector, row, seat, hit, ticketsPayload, w, h) {
  const bbox = getSectorBboxPct(ticketsPayload, sector, w, h);
  const clamped = clampPctToSectorBbox(hit.xPct, hit.yPct, bbox);
  return {
    sector,
    row,
    seat,
    xPct: clamped.xPct,
    yPct: clamped.yPct,
    geodesySource: clamped.clamped ? `${hit.geodesySource}+bbox` : hit.geodesySource,
  };
}

function snapFieldGridOfferRow(fieldGridIndex, sector, label, row, seat) {
  if (!fieldGridIndex?.size) return null;
  return (
    snapFieldGridSeat(fieldGridIndex, sector, row, seat) ||
    snapFieldGridSeat(fieldGridIndex, label, row, seat) ||
    null
  );
}

/**
 * @param {unknown} layout
 * @param {unknown} ticketsPayload
 * @param {unknown[]} offers
 * @param {string} svgMarkup
 * @param {number} w
 * @param {number} h
 */
function buildSectorNativeLookup(layout, ticketsPayload, offers, svgMarkup, w, h) {
  const allSeatCoordinates = Array.isArray(layout?.allSeatCoordinates)
    ? layout.allSeatCoordinates
    : [];
  if (allSeatCoordinates.length < 100) return null;

  const sectorPathByNorm = new Map();
  for (const sp of extractPbiletTicketSectorPaths(ticketsPayload)) {
    const norm = normalizeSectorLabel(sp.label);
    if (norm && sp.path) sectorPathByNorm.set(norm, sp.path);
  }
  for (const sp of Array.isArray(layout?.sectorMode?.sectors) ? layout.sectorMode.sectors : []) {
    const norm = normalizeSectorLabel(sp.label);
    const path = String(sp.path ?? '').trim();
    if (norm && path) sectorPathByNorm.set(norm, path);
  }

  const sectorPaths = [...sectorPathByNorm.entries()].map(([label, path]) => ({ label, path }));
  const dotsBySector = buildSectorDotIndex(allSeatCoordinates, sectorPaths, w, h);
  const svgRowLabels =
    typeof svgMarkup === 'string' && svgMarkup.includes('<tspan')
      ? parseSvgHallRowLabels(svgMarkup, w, h)
      : [];
  const fieldCenterPct = computeFieldCenterPct(allSeatCoordinates);
  const rowRanges = buildSectorOfferRowRanges(offers);
  const seatRangesByRow = buildSectorOfferSeatRangesByRow(offers);

  return {
    sectorPathByNorm,
    dotsBySector,
    svgRowLabels,
    fieldCenterPct,
    rowRanges,
    seatRangesByRow,
  };
}

/** Угловые сектора: A (radialGrid+rowCurve), B/C (polarGrid). */
function trySectorPolarGrid(norm, row, seat) {
  const blocks = loadSectorCalibrationBlocksByNorm();
  for (const n of luzhnikiSectorLookupNorms(norm)) {
    const hasAnchors = blocks.get(n)?.anchors?.length >= 4;
    if (!hasAnchors) continue;
    if (/^a\d{3}$/.test(n) || /^[bc]\d{3}$/.test(n)) {
      return resolvePolarGridSeatFromAnchors(n, row, seat);
    }
  }
  return null;
}

function trySectorAxisGrid(norm, label, row, seat, anchors, seatRangesByRow) {
  if (!anchors?.length) return null;
  const rowNum = parseRowNum(row);
  const seatRangeInRow = seatRangesByRow?.get(norm)?.get(rowNum) ?? null;
  return resolveSellableOnSectorAxisGrid({
    anchors,
    sectorLabel: label || norm,
    row,
    seat,
    seatRangeInRow,
  });
}

function mergeAxisGridAnchors(layoutAnchors, norm, label) {
  const seen = new Set();
  const out = [];
  const push = (a) => {
    const key = `${a.row}|${a.seat}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(a);
  };
  for (const a of layoutAnchors) push(a);
  const manual = getManualSectorRowAnchors(label || norm);
  for (const a of manual) {
    push({
      sector: label || norm,
      row: a.row,
      seat: a.seat,
      xPct: a.xPct,
      yPct: a.yPct,
    });
  }
  return out;
}

function trySectorNative(nativeCtx, norm, row, seat, w, h) {
  if (!nativeCtx) return null;
  const rowNum = parseRowNum(row);
  const seatNum = parseRowNum(seat);
  if (rowNum == null || seatNum == null) return null;

  const sectorDots = nativeCtx.dotsBySector.get(norm);
  const sectorPath = nativeCtx.sectorPathByNorm.get(norm);
  if (!sectorDots?.length || !sectorPath) return null;

  const seatRangeInRow = nativeCtx.seatRangesByRow.get(norm)?.get(rowNum) ?? null;
  const pt = resolveOfferSeatFromSvgRowLabels(
    rowNum,
    seatNum,
    sectorDots,
    sectorPath,
    nativeCtx.svgRowLabels,
    w,
    h,
    seatRangeInRow,
    nativeCtx.fieldCenterPct,
  );
  if (!pt) return null;
  return {
    sector: norm,
    row: String(row),
    seat: String(seat),
    xPct: pt.xPct,
    yPct: pt.yPct,
    geodesySource: 'svgRow',
  };
}

/**
 * @param {unknown} ticketsPayload
 * @param {unknown[]} offers
 * @param {Record<string, unknown>} layout
 * @param {{ svgMarkup?: string }} [options]
 */
export function buildSellableSeatGeodesyPbiletAccurate(
  ticketsPayload,
  offers,
  layout = {},
  options = {},
) {
  const w = Number(layout?.geodesy?.hallWidth) || 11413;
  const h = Number(layout?.geodesy?.hallHeight) || 9676;
  const svgMarkup = String(options.svgMarkup ?? layout?.svg_markup ?? '');

  const fromTickets = extractPbiletTicketsSeatGeodesy(ticketsPayload, w, h);
  const strictIndex = buildLabeledSeatIndex(fromTickets);
  const layoutSeats = loadSeatsArrayFromLayout(layout);
  const layoutIndex = buildLabeledSeatIndex(layoutSeats);
  const prodLayoutIndex = getCachedProdLayoutLabeledIndex();
  const { index: pilotFieldGridIndex } = getLuzhnikiLabeledSeatIndex(
    layout,
    String(layout?.luzhnikiPilotMergedAt ?? ''),
  );
  const fieldGridSnapIndex =
    pilotFieldGridIndex?.size > 1000 ? pilotFieldGridIndex : layoutIndex;

  const nativeCtx = buildSectorNativeLookup(layout, ticketsPayload, offers, svgMarkup, w, h);
  const seatRangesByRow = buildSectorOfferSeatRangesByRow(offers);
  const svgRowLabelsForCloud =
    typeof svgMarkup === 'string' && svgMarkup.includes('<tspan')
      ? parseSvgHallRowLabels(svgMarkup, w, h)
      : [];
  const sectorPathsForCloud = (() => {
    const byNorm = new Map();
    for (const sp of extractPbiletTicketSectorPaths(ticketsPayload)) {
      const norm = normalizeSectorLabel(sp.label);
      if (norm && sp.path) byNorm.set(norm, { label: sp.label, path: sp.path });
    }
    for (const sp of Array.isArray(layout?.sectorMode?.sectors) ? layout.sectorMode.sectors : []) {
      const norm = normalizeSectorLabel(sp.label);
      const p = String(sp.path ?? '').trim();
      if (norm && p) byNorm.set(norm, { label: sp.label, path: p });
    }
    return [...byNorm.values()];
  })();
  const cloudRowSeatIndex =
    sectorPathsForCloud.length > 0
      ? buildCloudRowSeatIndexForSellable({
          layout,
          ticketsPayload,
          sectorPaths: sectorPathsForCloud,
          layoutIndex,
          prodLayoutIndex,
          svgRowLabels: svgRowLabelsForCloud,
          hallWidth: w,
          hallHeight: h,
          offers,
          loadCoordinatesPayload,
        })
      : null;

  const cloudMasterIndex = (() => {
    if (!useCloudMasterMap()) return null;
    const coordinatesPayload = loadCoordinatesPayload();
    if (!coordinatesPayload) return null;
    return getCachedCloudMasterIndex({
      ticketsPayload,
      coordinatesPayload,
      hallWidth: w,
      hallHeight: h,
    });
  })();

  const offerByNorm = new Map();
  for (const o of offers) {
    const norm = normalizeSectorLabel(o.Sector);
    if (!norm) continue;
    if (!offerByNorm.has(norm)) offerByNorm.set(norm, []);
    offerByNorm.get(norm).push(o);
  }

  const seen = new Set();
  const seats = [];
  let strictMatched = 0;
  let pbiletLabeledMatched = 0;
  let cloudRowSeatMatched = 0;
  let cloudMasterMatched = 0;
  let fieldGridMatched = 0;
  let sectorNativeMatched = 0;
  let axisGridMatched = 0;
  let radialGridMatched = 0;
  let interpolated = 0;
  let totalSellable = 0;
  const unmatchedSamples = [];

  for (const [norm, sectorOffers] of offerByNorm) {
    const lookupNorms = luzhnikiSectorLookupNorms(norm);
    const label = canonicalSectorLabel(fromTickets, lookupNorms, sectorOffers[0]?.Sector);
    const { anchors, mode } = resolveSectorPbiletAnchors(
      fromTickets,
      layoutIndex,
      lookupNorms,
      label,
    );
    const pivot = sectorAnchorPivot(anchors);
    const rowShift = layoutAnchorRowShift(norm);

    for (const o of sectorOffers) {
      const sector = String(o.Sector ?? '');
      const row = String(o.Row ?? '');
      const list = Array.isArray(o.SeatList) ? o.SeatList.map(String) : [];

      for (const seat of list) {
        if (!seat.trim()) continue;
        totalSellable += 1;
        const dedupe = strictSeatKey(sector, row, seat);
        if (seen.has(dedupe)) continue;

        const direct = lookupLabeledSeat(strictIndex, sector, row, seat);
        if (direct) {
          seen.add(dedupe);
          strictMatched += 1;
          seats.push(
            finalizeSellableCoords(
              sector,
              row,
              seat,
              { ...direct, geodesySource: 'strict' },
              ticketsPayload,
              w,
              h,
            ),
          );
          continue;
        }

        if (cloudMasterIndex) {
          const cloudHit = snapToCloudMaster(cloudMasterIndex, sector, row, seat);
          if (cloudHit) {
            seen.add(dedupe);
            cloudMasterMatched += 1;
            seats.push(finalizeSellableCoords(sector, row, seat, cloudHit, ticketsPayload, w, h));
            continue;
          }
        }

        if (mode === 'none') {
          const axisAnchors = mergeAxisGridAnchors([], norm, label);
          const axisHit = trySectorAxisGrid(norm, label, row, seat, axisAnchors, seatRangesByRow);
          if (axisHit) {
            seen.add(dedupe);
            axisGridMatched += 1;
            seats.push(finalizeSellableCoords(sector, row, seat, axisHit, ticketsPayload, w, h));
            continue;
          }
          const nativeOnly = trySectorNative(nativeCtx, norm, row, seat, w, h);
          if (nativeOnly) {
            seen.add(dedupe);
            sectorNativeMatched += 1;
            seats.push(
              finalizeSellableCoords(sector, row, seat, nativeOnly, ticketsPayload, w, h),
            );
            continue;
          }
          if (unmatchedSamples.length < 24) unmatchedSamples.push({ sector, row, seat });
          continue;
        }

        let hit = null;

        if (mode === 'tickets') {
          hit = interpolatePbiletSeatGeodesy(anchors, label, row, seat, null);
        }

        const axisAnchors = mergeAxisGridAnchors(anchors, norm, label);
        const preferAxisGrid = prefersSectorAxisGrid(norm, ticketsPayload);
        const preferRadial = prefersSectorRadialCorner(norm);
        const rowNumOffer = parseRowNum(row);
        const rowMissingInLayout =
          rowNumOffer != null &&
          axisAnchors.length >= 2 &&
          !axisAnchors.some((a) => parseRowNum(a.row) === rowNumOffer);

        if (!hit && preferRadial) {
          const labeledPbilet = tryExactPbiletLabeledForRadialSector(
            layoutIndex,
            prodLayoutIndex,
            sector,
            row,
            seat,
          );
          if (labeledPbilet) {
            seen.add(dedupe);
            pbiletLabeledMatched += 1;
            seats.push(
              finalizeSellableCoords(
                sector,
                row,
                seat,
                labeledPbilet,
                ticketsPayload,
                w,
                h,
              ),
            );
            continue;
          }
          const seatRangeInRow = seatRangesByRow?.get(norm)?.get(rowNumOffer) ?? null;
          const cloudRowHit = cloudRowSeatIndex
            ? trySectorCloudRowSeatForRadial(
                cloudRowSeatIndex,
                sector,
                row,
                seat,
                seatRangeInRow,
              )
            : null;
          if (cloudRowHit) {
            seen.add(dedupe);
            cloudRowSeatMatched += 1;
            seats.push(
              finalizeSellableCoords(sector, row, seat, cloudRowHit, ticketsPayload, w, h),
            );
            continue;
          }
          hit = trySectorPolarGrid(norm, row, seat);
          if (hit) {
            seen.add(dedupe);
            radialGridMatched += 1;
            seats.push(finalizeSellableCoords(sector, row, seat, hit, ticketsPayload, w, h));
            continue;
          }
        }

        if (!hit && preferAxisGrid) {
          hit = trySectorAxisGrid(norm, label, row, seat, axisAnchors, seatRangesByRow);
          if (hit) {
            seen.add(dedupe);
            axisGridMatched += 1;
            seats.push(finalizeSellableCoords(sector, row, seat, hit, ticketsPayload, w, h));
            continue;
          }
        }

        if (!hit && mode === 'layout-anchors' && !preferAxisGrid && !preferRadial) {
          hit = snapFieldGridOfferRow(fieldGridSnapIndex, sector, label, row, seat);
        }

        if (!hit && rowMissingInLayout && !preferRadial) {
          hit = trySectorAxisGrid(norm, label, row, seat, axisAnchors, seatRangesByRow);
          if (hit) {
            seen.add(dedupe);
            axisGridMatched += 1;
            seats.push(finalizeSellableCoords(sector, row, seat, hit, ticketsPayload, w, h));
            continue;
          }
        }

        if (!hit && mode === 'layout-anchors') {
          const interpRow = rowShift > 0 ? layoutAnchorLookupRow(norm, row) : row;
          hit = interpolatePbiletSeatGeodesy(
            anchors,
            label,
            interpRow,
            seat,
            fieldGridSnapIndex,
          );
          if (!hit && rowShift > 0) {
            hit = interpolatePbiletSeatGeodesy(anchors, label, row, seat, fieldGridSnapIndex);
          }
        }

        if (!hit && axisAnchors.length >= 2 && !preferRadial) {
          hit = trySectorAxisGrid(norm, label, row, seat, axisAnchors, seatRangesByRow);
          if (hit) {
            seen.add(dedupe);
            axisGridMatched += 1;
            seats.push(finalizeSellableCoords(sector, row, seat, hit, ticketsPayload, w, h));
            continue;
          }
        }

        if (!hit) {
          hit = trySectorNative(nativeCtx, norm, row, seat, w, h);
          if (hit) {
            seen.add(dedupe);
            sectorNativeMatched += 1;
            seats.push(finalizeSellableCoords(sector, row, seat, hit, ticketsPayload, w, h));
            continue;
          }
        }

        if (!hit) {
          hit = trySectorPolarGrid(norm, row, seat);
        }

        if (!hit) {
          if (unmatchedSamples.length < 24) unmatchedSamples.push({ sector, row, seat });
          continue;
        }

        const scaled = applyLeftTribuneScale(norm, hit.xPct, hit.yPct, pivot, mode);
        seen.add(dedupe);
        interpolated += 1;
        seats.push(
          finalizeSellableCoords(
            sector,
            row,
            seat,
            {
              ...hit,
              xPct: scaled.xPct,
              yPct: scaled.yPct,
              geodesySource: hit.geodesySource || 'pbiletInterp',
            },
            ticketsPayload,
            w,
            h,
          ),
        );
      }
    }
  }

  return {
    seats,
    matched: seats.length,
    totalSellable,
    strictMatched,
    pbiletLabeledMatched,
    cloudRowSeatMatched,
    fieldGridMatched,
    sectorNativeMatched,
    axisGridMatched,
    radialGridMatched,
    svgCircleCount: fromTickets.length,
    svgCircleMatched: strictMatched + fieldGridMatched + sectorNativeMatched + interpolated,
    sectorGridMatched: sectorNativeMatched,
    layoutSeatCount: fromTickets.length,
    dotMatched: 0,
    cloudMatched: cloudMasterMatched,
    svgRowMatched: sectorNativeMatched,
    cloudSnapMatched: cloudMasterMatched,
    anchorInterpolated: interpolated,
    cloudMasterMatched,
    unmatchedSamples,
    geodesyMode: cloudMasterIndex ? 'pbilet-strict+sectorNative' : 'pbilet-strict+sectorNative',
  };
}
