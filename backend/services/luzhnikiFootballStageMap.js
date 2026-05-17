/**
 * Каноническая схема стадиона «Лужники» для футбольных событий GetBilet.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ticketPool from '../ticketDb.js';
import { buildSellableSeatGeodesyLuzhniki } from '../utils/hallSeatGeodesyLuzhnikiGrid.js';
import {
  buildSellableSeatGeodesyFromSvgCircles,
  countSvgNativeSeatCircles,
} from '../utils/hallSeatGeodesyFromSvgCircles.js';
import { buildSellableSeatGeodesyCloudGridSnap } from '../utils/luzhnikiCloudGridSeatIndex.js';
import { buildSellableSeatGeodesyPbiletAccurate } from '../utils/luzhnikiPbiletSellableGeodesy.js';
import { LUZHNIKI_PILOT_SEATS_REL_PATH } from '../utils/luzhnikiSeatIndexCache.js';
import { stripLuzhnikiPilotSeatsLayerFromSvg } from '../utils/luzhnikiPilotSeatSvg.js';
import { classifyEventTitle } from './eventTitleHeuristics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const LUZHNIKI_CLIENT_MAX_LAYOUT_SEATS = Number(process.env.LUZHNIKI_CLIENT_MAX_LAYOUT_SEATS) || 8000;

/** cloud-grid (default) | pbilet | fieldgrid/svg */
function resolveLuzhnikiSellableGeodesyMode() {
  if (process.env.LUZHNIKI_USE_FIELDGRID_SELLABLE === '1') return 'fieldgrid';
  const explicit = String(process.env.LUZHNIKI_SELLABLE_GEODESY ?? '').trim().toLowerCase();
  if (explicit === 'pbilet' || explicit === 'pbilet-strict') return 'pbilet';
  if (explicit === 'fieldgrid' || explicit === 'field-grid') return 'fieldgrid';
  return 'cloud-grid';
}

let ticketsPayloadCache = null;

function loadTicketsPayload() {
  if (ticketsPayloadCache) return ticketsPayloadCache;
  const p = process.env.LUZHNIKI_PBILET_TICKETS_JSON?.trim() || path.join(repoRoot, 'tickets.json');
  ticketsPayloadCache = JSON.parse(fs.readFileSync(p, 'utf8'));
  return ticketsPayloadCache;
}

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
    `SELECT stage_external_id, place_external_id, title, svg_markup, layout_json, external_plan_url, updated_at
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
    const minSvgCircles = Number(process.env.LUZHNIKI_MIN_SVG_CIRCLES_FOR_SELLABLE) || 12;

    let geodesy;
    const sellableMode = resolveLuzhnikiSellableGeodesyMode();
    if (sellableMode === 'cloud-grid') {
      const tickets = loadTicketsPayload();
      let coordsPayload = layout._coordinatesPayload;
      if (!coordsPayload) {
        const coordsPath =
          process.env.LUZHNIKI_COORDINATES_TXT?.trim() || path.join(repoRoot, 'luzhniki.txt');
        if (fs.existsSync(coordsPath)) {
          coordsPayload = JSON.parse(fs.readFileSync(coordsPath, 'utf8'));
        }
      }
      geodesy = buildSellableSeatGeodesyCloudGridSnap(tickets, offerRows, {
        ...layout,
        _coordinatesPayload: coordsPayload,
      });
      nextLayout.sellableGeodesyMode = 'cloudGridSnap';
    } else if (sellableMode === 'pbilet') {
      geodesy = buildSellableSeatGeodesyPbiletAccurate(loadTicketsPayload(), offerRows, layout);
      nextLayout.sellableGeodesyMode = 'pbiletStrict';
    } else {
      const svgCircleCount = countSvgNativeSeatCircles(svgMarkup);
      const pilotSvgLayer = String(svgMarkup).includes('luzhniki-pilot-seats');
      geodesy =
        svgCircleCount >= minSvgCircles
          ? buildSellableSeatGeodesyFromSvgCircles(
              svgMarkup,
              baseSeats,
              offerRows,
              hallWidth,
              hallHeight,
              { svgOnlyMatched: pilotSvgLayer, layoutHintsOnly: true },
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
      nextLayout.sellableGeodesyMode = pilotSvgLayer ? 'luzhnikiSvgPilot' : 'luzhnikiGrid';
    }

    nextLayout.sellableSeats = geodesy.seats;
    nextLayout.preferLayoutSeatPositions = true;
    nextLayout.sellableSeatsLabeledOnly = false;
    nextLayout.luzhnikiPilotGeodesyActive = true;
    nextLayout.luzhnikiSeatCalibrationActive = false;
    nextLayout.luzhnikiPilotFullStadium = layout.luzhnikiPilotFullStadium === true;
    nextLayout.luzhnikiPilotCircleCount = geodesy.svgCircleCount ?? 0;
    nextLayout.omitLayoutSeatSellableFallback = true;
    nextLayout.offerSeatGeodesy = {
      matched: geodesy.matched,
      strictMatched: geodesy.strictMatched ?? 0,
      totalSellable: geodesy.totalSellable,
      unmatched: Math.max(0, geodesy.totalSellable - geodesy.matched),
      svgCircleCount: geodesy.svgCircleCount ?? 0,
      svgCircleMatched: geodesy.svgCircleMatched ?? 0,
      sectorGridMatched: geodesy.sectorGridMatched ?? 0,
      layoutSeatCount: geodesy.layoutSeatCount ?? 0,
      dotMatched: geodesy.dotMatched ?? 0,
      cloudMatched: geodesy.cloudMatched ?? 0,
      svgRowMatched: geodesy.svgRowMatched ?? 0,
      cloudSnapMatched: geodesy.cloudSnapMatched ?? 0,
      anchorInterpolated: geodesy.anchorInterpolated ?? 0,
      unmatchedSamples: geodesy.unmatchedSamples,
      geodesyMode: geodesy.geodesyMode,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    ...row,
    layout_json: nextLayout,
  };
}

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
  if (
    svg_markup.includes('luzhniki-pilot-seats') ||
    svg_markup.includes('pbilet-strict-seat-geodesy')
  ) {
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
