/**
 * Каноническая схема стадиона «Лужники» для футбольных событий GetBilet:
 * одна строка в getbilet_stage_maps (паттерн как у лукойл/МХТ-сидов), без pbilet API.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ticketPool from '../ticketDb.js';
import { classifyEventTitle } from './eventTitleHeuristics.js';
import { mergeSellableSeatsIntoLayout } from '../utils/luzhnikiLayoutSeatPatch.js';
import {
  buildGrayCloudRowZipMap,
  lookupLabeledSeat,
} from '../utils/hallSeatGeodesyMatch.js';
import {
  getCachedGrayCloudLabeledIndex,
  useGrayCloudRowZipForBundle,
} from '../utils/luzhnikiGrayCloudLabeledIndex.js';
import {
  buildSellableSeatGeodesyPbiletAccurate,
  ensureLuzhnikiLayoutCloud,
} from '../utils/luzhnikiPbiletSellableGeodesy.js';
import { prefersSectorRadialCorner } from '../utils/luzhnikiSectorPolarGrid.js';
import { normalizeSectorLabel } from '../utils/ticketHallSectorNormalize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

export const LUZHNIKI_FOOTBALL_STAGE_MAP_KEY =
  process.env.GETBILET_LUZHNIKI_FOOTBALL_STAGE_MAP_KEY?.trim() || 'luzhniki-football';

function loadTicketsPayload() {
  const p =
    process.env.LUZHNIKI_TICKETS_JSON?.trim() || path.join(repoRoot, 'tickets.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function parseLayoutJson(row) {
  let layout = row.layout_json;
  if (typeof layout === 'string') {
    try {
      layout = JSON.parse(layout);
    } catch {
      layout = {};
    }
  }
  if (!layout || typeof layout !== 'object') return {};
  return layout;
}

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

/** Клиенту: без ~77k allSeatCoordinates / seats — чаша = PNG + sellableSeats с API. */
export function slimLuzhnikiStageMapForClient(row) {
  if (!row) return row;
  const layout = parseLayoutJson(row);
  const {
    allSeatCoordinates: _cloud,
    seats: _seats,
    seatPositions: _seatPositions,
    backgroundSeats: _bg,
    coordinates: _coords,
    ...slimLayout
  } = layout;

  return {
    ...row,
    layout_json: {
      ...slimLayout,
      omitClientSeatCoordinateCloud: true,
      hallBackgroundRasterUrl: '/hall-maps/luzhniki-football-gray-bowl.png',
      stadiumMapKey: LUZHNIKI_FOOTBALL_STAGE_MAP_KEY,
      luzhnikiStadiumCheckout: true,
    },
  };
}

function useFastManualSellable() {
  const v = process.env.LUZHNIKI_FAST_MANUAL_SELLABLE?.trim();
  return v !== '0' && v !== 'false';
}

function buildSellableSeatsFromManualBundle(offers = []) {
  if (!useFastManualSellable()) return null;
  const index = getCachedGrayCloudLabeledIndex();
  if (!index?.size) return null;

  const seats = [];
  const seen = new Set();
  let totalSellable = 0;
  let directMatched = 0;
  let rowZipMatched = 0;
  const unmatchedSamples = [];
  const allowRowZip = useGrayCloudRowZipForBundle();

  for (const o of offers) {
    const sector = String(o?.Sector ?? '');
    const row = String(o?.Row ?? '');
    const seatList = Array.isArray(o?.SeatList) ? o.SeatList.map(String) : [];
    const rowZipMap = allowRowZip ? buildGrayCloudRowZipMap(index, sector, row, seatList) : null;

    for (const seat of seatList) {
      if (!seat.trim()) continue;
      totalSellable += 1;
      const dedupe = `${sector}|${row}|${seat}`;
      if (seen.has(dedupe)) continue;

      let hit = lookupLabeledSeat(index, sector, row, seat);
      let geodesySource = 'grayCloudLabeledFast';
      if (hit) {
        directMatched += 1;
      } else if (rowZipMap?.has(String(seat).trim())) {
        hit = rowZipMap.get(String(seat).trim());
        geodesySource = 'grayCloudLabeledFast+rowZip';
        rowZipMatched += 1;
      }

      if (!hit) {
        if (unmatchedSamples.length < 24) unmatchedSamples.push({ sector, row, seat });
        continue;
      }

      seen.add(dedupe);
      seats.push({
        sector,
        row,
        seat,
        xPct: Number(hit.xPct),
        yPct: Number(hit.yPct),
        geodesySource,
      });
    }
  }

  return {
    seats,
    totalSellable,
    matched: seats.length,
    directMatched,
    rowZipMatched,
    unmatchedSamples,
  };
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

/**
 * Живые офферы GetBilet: sellableSeats (pbilet strict + интерполяция) и патч layout.seats.
 * @param {Record<string, unknown> | null | undefined} row
 * @param {{ Sector?: string, Row?: string, SeatList?: string[] }[]} [offerRows]
 */
export function adaptLuzhnikiStageMapForLiveOffers(row, offerRows = []) {
  if (!row) return row;
  const layout = parseLayoutJson(row);
  const {
    sellableSeats: _seedSellable,
    offerSeatGeodesy: _seedMeta,
    ...layoutForGeodesy
  } = layout;
  const base = {
    ...layoutForGeodesy,
    stadiumMapKey: LUZHNIKI_FOOTBALL_STAGE_MAP_KEY,
    luzhnikiStadiumCheckout: true,
    grayHallWhenNoOffers: false,
    seatSelectionDisabled: false,
  };

  const offers = Array.isArray(offerRows) ? offerRows : [];
  if (offers.length < 1) {
    return { ...row, layout_json: { ...base, sellableSeats: [], sellableSeatsFromLiveOffers: true } };
  }

  const manualSellable = buildSellableSeatsFromManualBundle(offers);
  if (manualSellable?.seats?.length) {
    return {
      ...row,
      layout_json: {
        ...base,
        sellableSeats: manualSellable.seats,
        sellableSeatsFromLiveOffers: true,
        sellableGeodesyMode: 'manualBundleFast',
        offerSeatGeodesy: {
          matched: manualSellable.matched,
          totalSellable: manualSellable.totalSellable,
          grayCloudLabeledMatched: manualSellable.directMatched,
          grayCloudRowZipMatched: manualSellable.rowZipMatched,
          partialManualOnly: true,
          unmatchedSamples: manualSellable.unmatchedSamples,
        },
      },
    };
  }

  const ticketsPayload = loadTicketsPayload();
  if (!ticketsPayload) {
    return { ...row, layout_json: base };
  }

  const hallW = Number(layoutForGeodesy?.geodesy?.hallWidth) || 11413;
  const hallH = Number(layoutForGeodesy?.geodesy?.hallHeight) || 9676;
  const { layout: layoutWithCloud, cloudDotCount, cloudSource } = ensureLuzhnikiLayoutCloud(
    layoutForGeodesy,
    hallW,
    hallH,
  );

  const geodesy = buildSellableSeatGeodesyPbiletAccurate(ticketsPayload, offers, layoutWithCloud, {
    svgMarkup: String(row.svg_markup ?? ''),
  });
  const layoutSeats = Array.isArray(layoutForGeodesy.seats) ? layoutForGeodesy.seats : [];
  /** Угловые (a101…): не пачкать layout.seats старыми sellable — иначе pbiletLabeled съедает cloud/radial. */
  const sellableForLayoutPatch = geodesy.seats.filter((s) => {
    if (!prefersSectorRadialCorner(normalizeSectorLabel(s.sector))) return true;
    const src = String(s.geodesySource ?? '');
    return (
      src.includes('strict') ||
      src.includes('pbiletLabeled') ||
      src.includes('grayCloudLabeled')
    );
  });
  const mergeResult = mergeSellableSeatsIntoLayout(layoutSeats, sellableForLayoutPatch);
  const patched = mergeResult?.patched ?? 0;

  return {
    ...row,
    layout_json: {
      ...base,
      allSeatCoordinates: layoutWithCloud.allSeatCoordinates ?? base.allSeatCoordinates,
      seats: layoutSeats,
      sellableSeats: geodesy.seats,
      sellableSeatsFromLiveOffers: true,
      sellableGeodesyMode: geodesy.geodesyMode,
      offerSeatGeodesy: {
        matched: geodesy.matched,
        partialManualOnly: geodesy.partialManualOnly === true,
        totalSellable: geodesy.totalSellable,
        strictMatched: geodesy.strictMatched,
        pbiletLabeledMatched: geodesy.pbiletLabeledMatched ?? 0,
        cloudRowSeatMatched: geodesy.cloudRowSeatMatched ?? 0,
        grayCloudMatched: geodesy.grayCloudMatched ?? 0,
        grayCloudLabeledMatched: geodesy.grayCloudLabeledMatched ?? 0,
        radialGridMatched: geodesy.radialGridMatched ?? 0,
        sectorNativeMatched: geodesy.sectorNativeMatched ?? 0,
        fieldGridMatched: geodesy.fieldGridMatched ?? 0,
        anchorInterpolated: geodesy.anchorInterpolated,
        layoutSeatsPatched: patched,
        cloudDotCount,
        cloudSource,
        unmatchedSamples: geodesy.unmatchedSamples,
      },
    },
  };
}
