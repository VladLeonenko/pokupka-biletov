/**
 * Точная sellable-геодезия:
 * 1) strict из tickets.json (x,y pbilet)
 * 2) интерполяция по якорям tickets / layout (как пилот до warp)
 * Без lookup в fieldGrid 80k и без bilinear/tribune warp.
 */

import { buildLabeledSeatIndex, lookupLabeledSeat } from './hallSeatGeodesyMatch.js';
import {
  collectLayoutSectorPbiletSeats,
  countPbiletRowAnchors,
  extractPbiletTicketsSeatGeodesy,
  interpolatePbiletSeatGeodesy,
} from './luzhnikiPbiletGeodesyExtract.js';
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
  return { anchors: [], mode: 'none' };
}

function canonicalSectorLabel(pbilet, lookupNorms, offerSector) {
  for (const norm of lookupNorms) {
    const fromPb = pbilet.find((s) => normalizeSectorLabel(s.sector) === norm)?.sector;
    if (fromPb) return fromPb;
  }
  return offerSector || lookupNorms[0] || '';
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

        if (mode === 'none') {
          if (unmatchedSamples.length < 24) unmatchedSamples.push({ sector, row, seat });
          continue;
        }

        const lookupRow = mode === 'layout-anchors' ? layoutAnchorLookupRow(norm, row) : row;
        const hit = interpolatePbiletSeatGeodesy(anchors, label, lookupRow, seat);
        if (!hit) {
          if (unmatchedSamples.length < 24) unmatchedSamples.push({ sector, row, seat });
          continue;
        }

        const scaled = applyLeftTribuneScale(norm, hit.xPct, hit.yPct, pivot, mode);
        seen.add(dedupe);
        interpolated += 1;
        seats.push({
          sector,
          row,
          seat,
          xPct: scaled.xPct,
          yPct: scaled.yPct,
          geodesySource: mode === 'tickets' ? 'svgCircle' : 'anchor',
        });
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
    cloudMatched: 0,
    svgRowMatched: 0,
    cloudSnapMatched: 0,
    anchorInterpolated: interpolated,
    unmatchedSamples,
    geodesyMode: 'pbilet-strict',
  };
}
