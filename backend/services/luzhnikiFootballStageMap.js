/**
 * Каноническая схема стадиона «Лужники» для футбольных событий GetBilet:
 * одна строка в getbilet_stage_maps (паттерн как у лукойл/МХТ-сидов), без pbilet API.
 */

import ticketPool from '../ticketDb.js';
import { buildSellableSeatGeodesyLuzhniki } from '../utils/hallSeatGeodesyLuzhnikiGrid.js';
import {
  buildSellableSeatGeodesyFromLabeledIndex,
  buildSellableSeatGeodesyFromSvgCircles,
  countSvgNativeSeatCircles,
} from '../utils/hallSeatGeodesyFromSvgCircles.js';
import { resolveCalibratedSeatPosition } from '../utils/luzhnikiSeatWarp.js';
import { getLuzhnikiLabeledSeatIndex, LUZHNIKI_PILOT_SEATS_REL_PATH } from '../utils/luzhnikiSeatIndexCache.js';
import { stripLuzhnikiPilotSeatsLayerFromSvg } from '../utils/luzhnikiPilotSeatSvg.js';
import { classifyEventTitle } from './eventTitleHeuristics.js';

/** Не отдавать клиенту layout.seats (80k) — только sellableSeats + облако опционально. */
const LUZHNIKI_CLIENT_MAX_LAYOUT_SEATS = Number(process.env.LUZHNIKI_CLIENT_MAX_LAYOUT_SEATS) || 8000;

export const LUZHNIKI_FOOTBALL_STAGE_MAP_KEY =
  process.env.GETBILET_LUZHNIKI_FOOTBALL_STAGE_MAP_KEY?.trim() || 'luzhniki-football';

function normVenueText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/Ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function looksLikeLuzhnikiVenue(...values) {
  const text = normVenueText(values.filter(Boolean).join(' '));
  if (!text) return false;
  return (
    /\bluzhniki\b/.test(text) ||
    /лужник/.test(text) ||
    /лу\s*ж\s*ник/i.test(text) ||
    /стадион\s*[«"]?\s*лужники/i.test(text) ||
    /большая\s+спортивная\s+арена/i.test(text)
  );
}

/**
 * @param {{
 *   title: string;
 *   descriptionFromPayload: string | null;
 *   genreFromPayload: string | null;
 *   venueManual: string | null;
 *   venueFromPayload: string | null;
 * }} base
 * @param {string | null} placeMapsVenue
 * @param {string | null} [stageHallLabel]
 */
export function shouldUseLuzhnikiFootballCanonicalMap(base, placeMapsVenue, stageHallLabel = null) {
  const venueHit = looksLikeLuzhnikiVenue(
    base.venueManual,
    base.venueFromPayload,
    placeMapsVenue,
    stageHallLabel,
  );
  if (!venueHit) return false;
  const { kind } = classifyEventTitle(base.title || '', {
    subtitle: base.descriptionFromPayload || '',
    genre: base.genreFromPayload || '',
  });
  return kind === 'football';
}

export async function loadLuzhnikiFootballStageMapRow() {
  const key = LUZHNIKI_FOOTBALL_STAGE_MAP_KEY;
  const r = await ticketPool.query(
    `SELECT stage_external_id, place_external_id, title, svg_markup, layout_json, external_plan_url
     FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [key],
  );
  return r.rows[0] || null;
}

function parseLayoutJson(row) {
  if (!row) return {};
  let layout = row.layout_json;
  if (typeof layout === 'string') {
    try {
      layout = JSON.parse(layout);
    } catch {
      layout = {};
    }
  }
  return layout && typeof layout === 'object' ? layout : {};
}

function calibrateSellableList(seats, enabled) {
  if (!enabled || !Array.isArray(seats)) return seats;
  return seats.map((s) => {
    const hit = resolveCalibratedSeatPosition(s.sector, s.row, s.seat);
    if (!hit) return s;
    return {
      ...s,
      xPct: hit.xPct,
      yPct: hit.yPct,
      geodesySource: s.geodesySource === 'strict' ? 'strict' : 'calibrated',
    };
  });
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 * @param {unknown[] | null | undefined} [offerRows]
 */
export function adaptLuzhnikiStageMapForLiveOffers(row, offerRows = null) {
  if (!row) return row;
  const layout = parseLayoutJson(row);
  const baseSeats = Array.isArray(layout.seats) ? layout.seats : [];
  const allSeatCoordinates = Array.isArray(layout.allSeatCoordinates)
    ? layout.allSeatCoordinates
    : [];
  const sectorPaths = Array.isArray(layout.sectorMode?.sectors)
    ? layout.sectorMode.sectors
    : [];

  /** @type {Record<string, unknown>} */
  const nextLayout = {
    ...layout,
    stadiumMapKey: LUZHNIKI_FOOTBALL_STAGE_MAP_KEY,
    luzhnikiStadiumCheckout: true,
    grayHallWhenNoOffers: false,
    seatSelectionDisabled: false,
    disablePositionalSeatZip: true,
    preferExactOfferSeatMatch: true,
    uniformHallSeatAppearance: true,
    omitClientSeatCoordinateCloud: false,
    disableStadiumCanvas: false,
    hallBackgroundFromLabeledSeats: false,
  };

  if (Array.isArray(offerRows) && offerRows.length > 0) {
    const svgMarkup = typeof row.svg_markup === 'string' ? row.svg_markup : '';
    const hallWidth = Number(layout.geodesy?.hallWidth) || 11413;
    const hallHeight = Number(layout.geodesy?.hallHeight) || 9676;

    const layoutPilotActive = layout.luzhnikiPilotGeodesyActive === true;
    const svgCircleCount =
      Number(layout.luzhnikiPilotCircleCount) > 0
        ? Number(layout.luzhnikiPilotCircleCount)
        : countSvgNativeSeatCircles(svgMarkup);
    const minSvgCircles = Number(process.env.LUZHNIKI_MIN_SVG_CIRCLES_FOR_SELLABLE) || 12;
    const pilotSvgLayer =
      layoutPilotActive || String(svgMarkup).includes('id="luzhniki-pilot-seats"');
    const fullPilotStadium =
      layout.luzhnikiPilotFullStadium === true ||
      Number(layout.luzhnikiPilotCircleCount) >= 8000 ||
      svgCircleCount >= 8000;

    const calibrateSellable = process.env.LUZHNIKI_SKIP_SEAT_CALIBRATION !== '1';

    let geodesy;
    if (fullPilotStadium && pilotSvgLayer) {
      const { index, seatCount } = getLuzhnikiLabeledSeatIndex(
        layout,
        String(row.updated_at ?? layout.luzhnikiPilotMergedAt ?? ''),
      );
      if (index.size >= minSvgCircles) {
        geodesy = buildSellableSeatGeodesyFromLabeledIndex(index, offerRows, {
          geodesySource: 'svgCircle',
          svgOnlyMatched: true,
        });
        geodesy.layoutSeatCount = seatCount;
      } else {
        geodesy = buildSellableSeatGeodesyLuzhniki({
          layoutSeats: baseSeats,
          allSeatCoordinates,
          sectorPaths,
          hallWidth,
          hallHeight,
          offers: offerRows,
          svgMarkup,
        });
      }
    } else if (svgCircleCount >= minSvgCircles) {
      geodesy = buildSellableSeatGeodesyFromSvgCircles(
        svgMarkup,
        baseSeats,
        offerRows,
        hallWidth,
        hallHeight,
        { svgOnlyMatched: pilotSvgLayer, layoutHintsOnly: true },
      );
    } else {
      geodesy = buildSellableSeatGeodesyLuzhniki({
        layoutSeats: baseSeats,
        allSeatCoordinates,
        sectorPaths,
        hallWidth,
        hallHeight,
        offers: offerRows,
        svgMarkup,
      });
    }

    nextLayout.sellableSeats = calibrateSellable
      ? calibrateSellableList(geodesy.seats, true)
      : geodesy.seats;
    nextLayout.preferLayoutSeatPositions = true;
    nextLayout.sellableSeatsLabeledOnly = false;
    nextLayout.sellableGeodesyMode = pilotSvgLayer ? 'luzhnikiSvgPilot' : 'luzhnikiGrid';
    nextLayout.luzhnikiPilotGeodesyActive = pilotSvgLayer && (geodesy.svgCircleCount ?? 0) >= minSvgCircles;
    nextLayout.luzhnikiSeatCalibrationActive = calibrateSellable;
    nextLayout.luzhnikiPilotFullStadium = fullPilotStadium;
    nextLayout.luzhnikiPilotCircleCount = geodesy.svgCircleCount ?? svgCircleCount;
    nextLayout.omitLayoutSeatSellableFallback = nextLayout.luzhnikiPilotGeodesyActive === true;
    nextLayout.offerSeatGeodesy = {
      matched: geodesy.matched,
      strictMatched: geodesy.strictMatched ?? 0,
      totalSellable: geodesy.totalSellable,
      unmatched: Math.max(0, geodesy.totalSellable - geodesy.matched),
      svgCircleCount: geodesy.svgCircleCount ?? 0,
      svgCircleMatched: geodesy.svgCircleMatched ?? 0,
      sectorGridMatched: geodesy.sectorGridMatched ?? 0,
      layoutSeatCount: geodesy.layoutSeatCount ?? baseSeats.length,
      dotMatched: geodesy.dotMatched ?? 0,
      cloudMatched: geodesy.cloudMatched ?? 0,
      svgRowMatched: geodesy.svgRowMatched ?? 0,
      cloudSnapMatched: geodesy.cloudSnapMatched ?? 0,
      anchorInterpolated: geodesy.anchorInterpolated ?? 0,
      unmatchedSamples: geodesy.unmatchedSamples,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    ...row,
    layout_json: nextLayout,
  };
}

/**
 * Облегчённый ответ GET /stage/.../map: без 80k seats, без 77k облака (серая чаша = SVG).
 * @param {Record<string, unknown>} row
 */
export function slimLuzhnikiStageMapForClient(row) {
  if (!row) return row;
  const layout = parseLayoutJson(row);
  const fullPilot =
    layout.luzhnikiPilotFullStadium === true ||
    Number(layout.luzhnikiPilotCircleCount) >= 8000 ||
    layout.luzhnikiPilotUseLayoutSeatsForLookup === true;

  if (!fullPilot && !layout.luzhnikiPilotGeodesyActive) {
    return row;
  }

  let svg_markup = typeof row.svg_markup === 'string' ? row.svg_markup : '';
  if (svg_markup.includes('luzhniki-pilot-seats')) {
    svg_markup = stripLuzhnikiPilotSeatsLayerFromSvg(svg_markup);
  }

  const seats = Array.isArray(layout.seats) ? layout.seats : [];
  const nextLayout = { ...layout };

  if (seats.length > LUZHNIKI_CLIENT_MAX_LAYOUT_SEATS) {
    delete nextLayout.seats;
    delete nextLayout.nativeSeatCount;
    delete nextLayout.layoutSeatsFromGrid;
    nextLayout.layoutSeatsOmittedForClient = true;
    nextLayout.layoutSeatsCount = seats.length;
    nextLayout.luzhnikiPilotSeatsFile = layout.luzhnikiPilotSeatsFile || LUZHNIKI_PILOT_SEATS_REL_PATH;
  }

  if (process.env.LUZHNIKI_OMIT_CLIENT_SEAT_CLOUD !== '0') {
    const cloud = Array.isArray(layout.allSeatCoordinates) ? layout.allSeatCoordinates : [];
    if (cloud.length > 15000) {
      delete nextLayout.allSeatCoordinates;
      nextLayout.omitClientSeatCoordinateCloud = true;
      nextLayout.allSeatCoordinatesCount = cloud.length;
      nextLayout.hallBackgroundFromLabeledSeats = false;
    }
  }

  return {
    ...row,
    svg_markup,
    layout_json: nextLayout,
  };
}
