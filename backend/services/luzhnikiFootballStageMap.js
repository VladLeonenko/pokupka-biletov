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
  buildSellableSeatGeodesyFromIndex,
  buildGrayCloudRowZipMap,
  lookupLabeledSeat,
} from '../utils/hallSeatGeodesyMatch.js';
import {
  getCachedGrayCloudLabeledIndex,
  isGrayCloudLabeledIndexReady,
  useGrayCloudRowZipForBundle,
  warmupGrayCloudLabeledIndex,
} from '../utils/luzhnikiGrayCloudLabeledIndex.js';
import {
  buildSellableSeatGeodesyPbiletAccurate,
  ensureLuzhnikiLayoutCloud,
} from '../utils/luzhnikiPbiletSellableGeodesy.js';
import { prefersSectorRadialCorner } from '../utils/luzhnikiSectorPolarGrid.js';
import { normalizeSectorLabel } from '../utils/ticketHallSectorNormalize.js';
import { getLuzhnikiLabeledSeatIndex } from '../utils/luzhnikiSeatIndexCache.js';
import { isLuzhnikiConcertFreeZoneSector } from '../utils/luzhnikiConcertFreeZoneSeats.js';
import { filterLuzhnikiConcertSectors } from '../utils/luzhnikiConcertSectorFilter.js';
import { LUZHNIKI_CONCERT_STAGE_MAP_KEY } from '../utils/luzhnikiConcertRepertoires.js';

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

const SVG_CLIENT_RASTER_MAX_EDGE = 2048;

/** Image() берёт width/height. Концерт: 11413×9676 → сотни МБ bitmap. viewBox не трогаем. */
export function capSvgIntrinsicRasterSize(svg, maxEdge = SVG_CLIENT_RASTER_MAX_EDGE) {
  const src = String(svg || '');
  if (!src.includes('<svg') || !(maxEdge > 0)) return svg;
  const vb = src.match(/\bviewBox=["']([^"']+)["']/i)?.[1];
  let w = NaN;
  let h = NaN;
  if (vb) {
    const p = vb.trim().split(/[\s,]+/).map(Number);
    if (p.length >= 4 && p.every(Number.isFinite) && p[2] > 0 && p[3] > 0) {
      w = p[2];
      h = p[3];
    }
  }
  if (!(w > 0 && h > 0)) {
    w = Number(src.match(/\bwidth=["']([\d.]+)/i)?.[1]);
    h = Number(src.match(/\bheight=["']([\d.]+)/i)?.[1]);
  }
  if (!(w > 0 && h > 0)) return svg;
  const edge = Math.max(w, h);
  if (edge <= maxEdge) return svg;
  const scale = maxEdge / edge;
  const dw = Math.max(1, Math.round(w * scale));
  const dh = Math.max(1, Math.round(h * scale));
  let out = src;
  out = /\bwidth=["']/.test(out)
    ? out.replace(/\bwidth=["'][^"']*["']/i, `width="${dw}"`)
    : out.replace(/<svg\b/i, `<svg width="${dw}"`);
  out = /\bheight=["']/.test(out)
    ? out.replace(/\bheight=["'][^"']*["']/i, `height="${dh}"`)
    : out.replace(/<svg\b/i, `<svg height="${dh}"`);
  return out;
}

/** Клиенту: без ~77k allSeatCoordinates / seats — чаша = PNG + sellableSeats с API. */
export function slimLuzhnikiStageMapForClient(row) {
  if (!row) return row;
  const layout = parseLayoutJson(row);
  const manualSeats = Array.isArray(layout.seats) && layout.seats.length <= 8000
    ? layout.seats.filter((s) => String(s?.geodesySource ?? '').includes('manual'))
    : [];
  const manualBackgroundSeats = Array.isArray(layout.backgroundSeats) ? layout.backgroundSeats : [];
  const {
    allSeatCoordinates: _cloud,
    seats: _seats,
    seatPositions: _seatPositions,
    backgroundSeats: _bg,
    coordinates: _coords,
    ...slimLayout
  } = layout;

  const rasterUrl =
    typeof slimLayout.hallBackgroundRasterUrl === 'string' && slimLayout.hallBackgroundRasterUrl.trim()
      ? slimLayout.hallBackgroundRasterUrl.trim()
      : null;

  return {
    ...row,
    svg_markup: capSvgIntrinsicRasterSize(row.svg_markup),
    layout_json: {
      ...slimLayout,
      ...(manualSeats.length > 0 ? { seats: manualSeats } : null),
      ...(manualBackgroundSeats.length > 0 ? { backgroundSeats: manualBackgroundSeats } : null),
      omitClientSeatCoordinateCloud: true,
      hallBackgroundRasterUrl: rasterUrl || '/hall-maps/luzhniki-football-gray-bowl.png',
      stadiumMapKey:
        typeof slimLayout.stadiumMapKey === 'string' && slimLayout.stadiumMapKey.trim()
          ? slimLayout.stadiumMapKey.trim()
          : LUZHNIKI_FOOTBALL_STAGE_MAP_KEY,
      luzhnikiStadiumCheckout: true,
    },
  };
}

function useFastManualSellable() {
  const v = process.env.LUZHNIKI_FAST_MANUAL_SELLABLE?.trim();
  return v !== '0' && v !== 'false';
}

function buildSellableSeatsFromManualBundle(offers = [], opts = {}) {
  if (!useFastManualSellable()) return null;
  const index = getCachedGrayCloudLabeledIndex();
  if (!index?.size) return null;
  const skipAllManualMaterialization = opts.skipAllManualMaterialization === true;

  const allManualSeats = [];
  const backgroundSeats = [];
  const seenManual = new Set();
  const seenBackground = new Set();
  const pushManualSeat = (s) => {
    const key = `${s.sector}|${s.row}|${s.seat}|${Number(s.xPct).toFixed(4)}|${Number(s.yPct).toFixed(4)}`;
    const xPct = Number(s.xPct);
    const yPct = Number(s.yPct);
    if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) return;

    const bgKey = `${xPct.toFixed(4)}|${yPct.toFixed(4)}`;
    if (!seenBackground.has(bgKey)) {
      seenBackground.add(bgKey);
      backgroundSeats.push([Number(xPct.toFixed(4)), Number(yPct.toFixed(4))]);
    }

    if (index.size > 8000 || seenManual.has(key)) return;
    seenManual.add(key);
    allManualSeats.push({
      sector: s.sector,
      row: String(s.row),
      seat: String(s.seat),
      xPct,
      yPct,
      geodesySource: 'manualEditor',
    });
  };
  if (!skipAllManualMaterialization) {
    for (const s of index.values()) pushManualSeat(s);
  }

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
    allManualSeats,
    backgroundSeats,
    seats,
    totalSellable,
    matched: seats.length,
    directMatched,
    rowZipMatched,
    unmatchedSamples,
  };
}

function isLuzhnikiConcertStageRow(row, layout) {
  const stageId = String(row?.stage_external_id || '').trim();
  const mapKey = String(layout?.stadiumMapKey || '').trim();
  return stageId === LUZHNIKI_CONCERT_STAGE_MAP_KEY || mapKey === LUZHNIKI_CONCERT_STAGE_MAP_KEY;
}

/**
 * layout.seats или sidecar pilot (layoutSeatsStoredInFile) — как НН, без 77k cloud.
 * @param {Record<string, unknown>} layout
 * @param {{ Sector?: string, Row?: string, SeatList?: string[] }[]} [offers]
 * @param {{ allowRowZip?: boolean, updatedAt?: string }} [opts]
 */
function buildSellableSeatsFromLayoutSeats(layout, offers = [], opts = {}) {
  const { index, seatCount } = getLuzhnikiLabeledSeatIndex(layout, opts.updatedAt);
  if (seatCount < 1 || !index?.size) return null;

  const geodesy = buildSellableSeatGeodesyFromIndex(index, offers, {
    allowRowZip: opts.allowRowZip === true,
  });
  if (!geodesy?.seats?.length) return null;
  return geodesy;
}

export async function loadLuzhnikiFootballStageMapRow() {
  return loadLuzhnikiStageMapRowByKey(LUZHNIKI_FOOTBALL_STAGE_MAP_KEY);
}

/** @param {string} stageExternalId */
export async function loadLuzhnikiStageMapRowByKey(stageExternalId) {
  const key = String(stageExternalId || '').trim();
  if (!key) return null;
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
    stadiumMapKey:
      typeof layoutForGeodesy.stadiumMapKey === 'string' && layoutForGeodesy.stadiumMapKey.trim()
        ? layoutForGeodesy.stadiumMapKey.trim()
        : LUZHNIKI_FOOTBALL_STAGE_MAP_KEY,
    luzhnikiStadiumCheckout: true,
    grayHallWhenNoOffers: false,
    seatSelectionDisabled: false,
  };

  const offers = Array.isArray(offerRows) ? offerRows : [];
  if (offers.length < 1) {
    return { ...row, layout_json: { ...base, sellableSeats: [], sellableSeatsFromLiveOffers: true } };
  }

  const concertFast = isLuzhnikiConcertStageRow(row, layoutForGeodesy);

  if (!isGrayCloudLabeledIndexReady()) {
    warmupGrayCloudLabeledIndex();
    return {
      ...row,
      layout_json: {
        ...base,
        sellableSeats: [],
        sellableSeatsFromLiveOffers: true,
        sellableSeatsPending: true,
        ...(concertFast
          ? {
              omitClientSeatCoordinateCloud: true,
              hallBackgroundRasterUrl:
                typeof base.hallBackgroundRasterUrl === 'string' && base.hallBackgroundRasterUrl.trim()
                  ? base.hallBackgroundRasterUrl.trim()
                  : '/hall-maps/luzhniki-football-gray-bowl.png',
              maskFieldBackgroundDots: true,
              hideSeatList: true,
            }
          : null),
      },
    };
  }

  // Концерт: sellable из gray-cloud разметки редактора (как спорт).
  // Старый pilot (`concertLayoutStrict`) давал сдвиг/разнос рядов (a104 р.1/38).
  // Танцпол/фан-зона — зона без точек (покупка по зоне).
  if (concertFast) {
    const rawSectorMode =
      base.sectorMode && typeof base.sectorMode === 'object' ? base.sectorMode : { enabled: false, sectors: [] };
    const slimSectors = filterLuzhnikiConcertSectors(rawSectorMode.sectors || [], offers);
    const concertShell = {
      allSeatCoordinates: undefined,
      // Трибуны: PNG + dots.bin. Поле/сцена без точек — FE маскирует zone covers.
      hallBackgroundRasterUrl:
        typeof base.hallBackgroundRasterUrl === 'string' && base.hallBackgroundRasterUrl.trim()
          ? base.hallBackgroundRasterUrl.trim()
          : '/hall-maps/luzhniki-football-gray-bowl.png',
      omitClientSeatCoordinateCloud: true,
      disableHallBackgroundDots: false,
      maskFieldBackgroundDots: true,
      concertZoneOnlySectors: ['танцпол', 'фан-зона', 'fan-zone'],
      hideSeatList: true,
      concertSeatPctFromFootball: false,
      concertMapOrientation: undefined,
      sectorMode: {
        ...rawSectorMode,
        enabled: slimSectors.length > 0,
        sectors: slimSectors,
      },
    };

    const manualSellable = buildSellableSeatsFromManualBundle(offers, {
      skipAllManualMaterialization: true,
    });
    const manualSeats = (manualSellable?.seats || []).filter(
      (seat) => !isLuzhnikiConcertFreeZoneSector(seat.sector),
    );
    if (manualSeats.length > 0) {
      return {
        ...row,
        layout_json: {
          ...base,
          ...concertShell,
          sellableSeats: manualSeats,
          sellableSeatsFromLiveOffers: true,
          sellableGeodesyMode: 'concertManualBundleFast',
          offerSeatGeodesy: {
            matched: manualSeats.length,
            totalSellable: manualSellable?.totalSellable ?? 0,
            grayCloudLabeledMatched: manualSellable?.directMatched ?? 0,
            grayCloudRowZipMatched: manualSellable?.rowZipMatched ?? 0,
            freeZoneMatched: 0,
            sectorsKept: slimSectors.length,
            partialManualOnly: true,
            unmatchedSamples: manualSellable?.unmatchedSamples ?? [],
          },
        },
      };
    }

    const layoutSellable = buildSellableSeatsFromLayoutSeats(layoutForGeodesy, offers, {
      allowRowZip: false,
      updatedAt: String(row.updated_at || ''),
    });
    const seats = (layoutSellable?.seats || [])
      .filter((seat) => !isLuzhnikiConcertFreeZoneSector(seat.sector))
      .map((seat) => ({
        ...seat,
        geodesySource: seat.geodesySource || 'layoutStrictFast',
      }));
    return {
      ...row,
      layout_json: {
        ...base,
        ...concertShell,
        sellableSeats: seats,
        sellableSeatsFromLiveOffers: true,
        sellableGeodesyMode: 'concertLayoutStrict',
        offerSeatGeodesy: {
          matched: seats.length,
          totalSellable: layoutSellable?.totalSellable ?? 0,
          strictMatched: layoutSellable?.strictMatched ?? layoutSellable?.matched ?? 0,
          freeZoneMatched: 0,
          sectorsKept: slimSectors.length,
          partialManualOnly: false,
          unmatchedSamples: layoutSellable?.unmatchedSamples ?? [],
        },
      },
    };
  }

  const manualSellable = buildSellableSeatsFromManualBundle(offers);
  if (manualSellable?.seats?.length) {
    return {
      ...row,
      layout_json: {
        ...base,
        ...(manualSellable.allManualSeats.length > 0 ? { seats: manualSellable.allManualSeats } : null),
        backgroundSeats: manualSellable.backgroundSeats,
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

  const layoutSellable = buildSellableSeatsFromLayoutSeats(layoutForGeodesy, offers, {
    allowRowZip: false,
    updatedAt: String(row.updated_at || ''),
  });
  if (layoutSellable?.seats?.length) {
    return {
      ...row,
      layout_json: {
        ...base,
        sellableSeats: layoutSellable.seats.map((seat) => ({
          ...seat,
          geodesySource: seat.geodesySource || 'layoutStrictFast',
        })),
        sellableSeatsFromLiveOffers: true,
        sellableGeodesyMode: 'layoutStrictFast',
        offerSeatGeodesy: {
          matched: layoutSellable.matched,
          totalSellable: layoutSellable.totalSellable,
          strictMatched: layoutSellable.strictMatched ?? layoutSellable.matched,
          partialManualOnly: false,
          unmatchedSamples: layoutSellable.unmatchedSamples,
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
