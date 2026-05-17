/**
 * Точная sellable-геодезия:
 * 1) strict из tickets.json (x,y pbilet)
 * 2) интерполяция по якорям tickets / layout (как пилот до warp)
 * Без lookup в fieldGrid 80k и без bilinear/tribune warp.
 */

import { buildLabeledSeatIndex, lookupLabeledSeat } from './hallSeatGeodesyMatch.js';
import { getLuzhnikiLabeledSeatIndex } from './luzhnikiSeatIndexCache.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getManualSectorRowAnchors } from './hallSeatGeodesySectorRowAnchors.js';
import {
  collectLayoutSectorPbiletSeats,
  countPbiletRowAnchors,
  extractPbiletTicketsSeatGeodesy,
  interpolatePbiletSeatGeodesy,
  snapFieldGridSeat,
} from './luzhnikiPbiletGeodesyExtract.js';
import { clampPctToSectorBbox, getSectorBboxPct } from './luzhnikiSectorBbox.js';
import { resolvePolarGridSeatFromAnchors } from './luzhnikiSectorPolarGrid.js';
import {
  getCachedCloudMasterIndex,
  snapToCloudMaster,
  useCloudMasterMap,
} from './luzhnikiCloudMasterMap.js';
import {
  applyLeftTribuneScale,
  layoutAnchorLookupRow,
  sectorAnchorPivot,
} from './luzhnikiPilotLayoutCalibrate.js';
import { loadSeatsArrayFromLayout } from './luzhnikiSeatIndexCache.js';
import {
  luzhnikiSectorLookupNorms,
  normalizeSectorLabel,
  strictSeatKey,
} from './ticketHallSectorNormalize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

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

/**
 * @param {unknown} ticketsPayload
 * @param {unknown[]} offers
 * @param {Record<string, unknown>} layout
 */
export function buildSellableSeatGeodesyPbiletAccurate(ticketsPayload, offers, layout = {}) {
  const w = Number(layout?.geodesy?.hallWidth) || 11413;
  const h = Number(layout?.geodesy?.hallHeight) || 9676;

  const fromTickets = extractPbiletTicketsSeatGeodesy(ticketsPayload, w, h);
  const strictIndex = buildLabeledSeatIndex(fromTickets);
  const layoutSeats = loadSeatsArrayFromLayout(layout);
  const layoutIndex = buildLabeledSeatIndex(layoutSeats);
  const { index: pilotFieldGridIndex } = getLuzhnikiLabeledSeatIndex(
    layout,
    String(layout?.luzhnikiPilotMergedAt ?? ''),
  );
  const lmrOnlyIndex = (() => {
    if (!pilotFieldGridIndex?.size) return null;
    const lmr = new Map();
    for (const [k, v] of pilotFieldGridIndex) {
      if (v?.geodesySource === 'lmrSnap' || v?.geodesySource === 'fieldGrid') {
        lmr.set(k, v);
      }
    }
    return lmr.size > 1000 ? lmr : pilotFieldGridIndex;
  })();
  const fieldGridSnapIndex = lmrOnlyIndex?.size > 1000 ? lmrOnlyIndex : null;

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
  let cloudMasterMatched = 0;
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
          seats.push(finalizeSellableCoords(sector, row, seat, { ...direct, geodesySource: 'strict' }, ticketsPayload, w, h));
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
          if (unmatchedSamples.length < 24) unmatchedSamples.push({ sector, row, seat });
          continue;
        }

        const lookupRow = mode === 'layout-anchors' ? layoutAnchorLookupRow(norm, row) : row;

        let hit = null;

        if (mode === 'layout-anchors' || mode === 'sector-anchors') {
          hit =
            (fieldGridSnapIndex &&
              (snapFieldGridSeat(fieldGridSnapIndex, sector, row, seat) ||
                snapFieldGridSeat(fieldGridSnapIndex, label, row, seat))) ||
            null;
        }

        if (!hit) {
          hit = interpolatePbiletSeatGeodesy(anchors, label, lookupRow, seat, null);
        }

        if (!hit && mode === 'sector-anchors') {
          hit = resolvePolarGridSeatFromAnchors(norm, row, seat);
        }

        if (!hit && mode === 'layout-anchors' && fieldGridSnapIndex) {
          hit = snapFieldGridSeat(fieldGridSnapIndex, sector, lookupRow, seat);
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
            { ...hit, xPct: scaled.xPct, yPct: scaled.yPct },
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
    svgCircleCount: fromTickets.length,
    svgCircleMatched: strictMatched + interpolated,
    sectorGridMatched: 0,
    layoutSeatCount: fromTickets.length,
    dotMatched: 0,
    cloudMatched: cloudMasterMatched,
    svgRowMatched: 0,
    cloudSnapMatched: cloudMasterMatched,
    anchorInterpolated: interpolated,
    cloudMasterMatched,
    unmatchedSamples,
    geodesyMode: cloudMasterIndex ? 'pbilet-strict+cloudMaster' : 'pbilet-strict',
  };
}
