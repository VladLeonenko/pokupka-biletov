/**
 * Каноническая схема стадиона «Лужники» для футбольных событий GetBilet:
 * одна строка в getbilet_stage_maps (паттерн как у лукойл/МХТ-сидов), без pbilet API.
 */

import ticketPool from '../ticketDb.js';
import { buildSellableSeatGeodesyLuzhniki } from '../utils/hallSeatGeodesyLuzhnikiGrid.js';
import {
  buildSellableSeatGeodesyFromSvgCircles,
  countSvgNativeSeatCircles,
} from '../utils/hallSeatGeodesyFromSvgCircles.js';
import { classifyEventTitle } from './eventTitleHeuristics.js';

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

/**
 * Живые офферы GetBilet: координаты только там, где сектор/ряд/место есть в геодезии pbilet.
 * @param {Record<string, unknown> | null | undefined} row
 * @param {unknown[] | null | undefined} [offerRows] ResultData из GetOfferListByRepertoireId
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
    /** Серая чаша = allSeatCoordinates (luzhniki.txt ~77k), не grid layout.seats. */
    hallBackgroundFromLabeledSeats: false,
  };

  if (Array.isArray(offerRows) && offerRows.length > 0) {
    const svgMarkup = typeof row.svg_markup === 'string' ? row.svg_markup : '';
    const hallWidth = Number(layout.geodesy?.hallWidth) || 11413;
    const hallHeight = Number(layout.geodesy?.hallHeight) || 9676;

    const svgCircleCount = countSvgNativeSeatCircles(svgMarkup);
    const minSvgCircles = Number(process.env.LUZHNIKI_MIN_SVG_CIRCLES_FOR_SELLABLE) || 12;
    const geodesy =
      svgCircleCount >= minSvgCircles
        ? buildSellableSeatGeodesyFromSvgCircles(
            svgMarkup,
            baseSeats,
            offerRows,
            hallWidth,
            hallHeight,
          )
        : buildSellableSeatGeodesyLuzhniki({
            layoutSeats: baseSeats,
            allSeatCoordinates,
            sectorPaths,
            hallWidth,
            hallHeight,
            offers: offerRows,
            svgMarkup,
          });

    nextLayout.sellableSeats = geodesy.seats;
    nextLayout.preferLayoutSeatPositions = true;
    nextLayout.sellableSeatsLabeledOnly = false;
    nextLayout.sellableGeodesyMode = 'luzhnikiGrid';
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
