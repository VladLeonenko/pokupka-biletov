/**
 * Лукойл Арена: живые офферы GetBilet → sellableSeats.
 * layout.seats — только старый снимок pbilet (~367 мест), облако ~47k без подписей.
 * Недостающие места ставим по сетке облака внутри полигона сектора.
 */

import { footballStadiumCheckoutLayoutFlags } from '../utils/footballStadiumCheckoutLayout.js';
import { buildSellableSeatGeodesy } from '../utils/hallSeatGeodesyMatch.js';
import { buildSellableSeatGeodesyWithDots } from '../utils/hallSeatGeodesyFromDots.js';
import {
  LUKOIL_ARENA_HALL_HEIGHT,
  LUKOIL_ARENA_HALL_WIDTH,
  LUKOIL_ARENA_STAGE_MAP_KEY,
} from '../utils/footballStadiumRepertoires.js';
import { strictSeatKey } from '../utils/ticketHallSectorNormalize.js';

export { LUKOIL_ARENA_STAGE_MAP_KEY };

const LUKOIL_ARENA_GRAY_BOWL_PNG = '/hall-maps/lukoil-arena-gray-bowl.png';

function parseLayoutJson(row) {
  let layout = row?.layout_json;
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

function parseSvgViewBoxSize(svgMarkup) {
  const m = String(svgMarkup || '').match(/viewBox=["']([^"']+)["']/i);
  if (!m) return null;
  const p = m[1].trim().split(/[\s,]+/).map(Number);
  if (p.length >= 4 && p[2] > 0 && p[3] > 0) return { width: p[2], height: p[3] };
  return null;
}

export function lukoilArenaHallSize(layout, svgMarkup) {
  const pb = layout?.pbilet && typeof layout.pbilet === 'object' ? layout.pbilet : {};
  const fromPbW = Number(pb.hallWidth) || Number(pb.coordinateWidth);
  const fromPbH = Number(pb.hallHeight) || Number(pb.coordinateHeight);
  if (fromPbW > 0 && fromPbH > 0) return { hallW: fromPbW, hallH: fromPbH };
  const vb = parseSvgViewBoxSize(svgMarkup);
  if (vb) return { hallW: vb.width, hallH: vb.height };
  return { hallW: LUKOIL_ARENA_HALL_WIDTH, hallH: LUKOIL_ARENA_HALL_HEIGHT };
}

/**
 * Portalbilet не кладёт 4k номеров мест в обзор: цифры 1…N — отдельный слой,
 * который у нас двоится с серой чашей и тормозит DOM (1.2MB SVG).
 * Подписи секторов/лож/трибун оставляем.
 */
export function stripNumericSvgSeatLabels(svgMarkup) {
  const src = String(svgMarkup || '');
  if (!src.includes('<text')) return src;
  let out = src.replace(/<text\b[\s\S]*?<\/text>/gi, (block) => {
    const tspans = [...block.matchAll(/<tspan\b[^>]*>([\s\S]*?)<\/tspan>/gi)]
      .map((m) => String(m[1]).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const labels = tspans.length
      ? tspans
      : [block.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()].filter(Boolean);
    if (labels.length > 0 && labels.every((t) => /^\d{1,3}$/.test(t))) return '';
    return block;
  });
  let prev = '';
  while (out !== prev) {
    prev = out;
    out = out.replace(/<g\b[^>]*>\s*<\/g>/gi, '');
  }
  return out;
}

/** pbilet coordinates содержат хвост за viewBox (~216%) — выкидываем, иначе чаша «съезжает». */
export function clipHallCoordinateCloud(cloud, maxPct = 102) {
  if (!Array.isArray(cloud)) return [];
  const out = [];
  for (const pt of cloud) {
    const xPct = Number(pt?.xPct ?? pt?.x);
    const yPct = Number(pt?.yPct ?? pt?.y);
    if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) continue;
    if (xPct < 0 || yPct < 0 || xPct > maxPct || yPct > maxPct) continue;
    out.push({ xPct, yPct });
  }
  return out;
}

function slimLabeledSeatsForClient(seats) {
  if (!Array.isArray(seats)) return [];
  return seats
    .map((s) => {
      if (!s || typeof s !== 'object') return null;
      const xPct = Number(s.xPct);
      const yPct = Number(s.yPct);
      if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) return null;
      return {
        sector: String(s.sector ?? ''),
        row: String(s.row ?? ''),
        seat: String(s.seat ?? ''),
        xPct,
        yPct,
        ...(s.geodesySource ? { geodesySource: s.geodesySource } : {}),
      };
    })
    .filter(Boolean);
}

function mergeGeodesySeats(primary, extra) {
  const seen = new Set();
  const out = [];
  for (const s of [...(primary || []), ...(extra || [])]) {
    const key = strictSeatKey(s.sector, s.row, s.seat);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

/**
 * Клиенту: без 44k allSeatCoordinates (3–4MB + canvas на каждый кадр зума).
 * Чаша = SVG + сектора; цветные точки = sellableSeats (~180).
 * @param {Record<string, unknown> | null | undefined} row
 */
export function slimLukoilArenaStageMapForClient(row) {
  if (!row) return row;
  const layout = parseLayoutJson(row);
  const sellableSeats = slimLabeledSeatsForClient(layout.sellableSeats);
  const { hallW, hallH } = lukoilArenaHallSize(layout, row.svg_markup);
  const pb = layout.pbilet && typeof layout.pbilet === 'object' ? { ...layout.pbilet } : {};
  if (!Number(pb.hallWidth)) pb.hallWidth = hallW;
  if (!Number(pb.hallHeight)) pb.hallHeight = hallH;
  const {
    allSeatCoordinates: _cloud,
    seats: _oldInventory,
    sellableSeats: _sellable,
    ...rest
  } = layout;
  return {
    ...row,
    svg_markup: stripNumericSvgSeatLabels(row.svg_markup),
    layout_json: {
      ...rest,
      pbilet: pb,
      ...(sellableSeats.length > 0 ? { seats: sellableSeats, sellableSeats } : { seats: [] }),
      stadiumMapKey: LUKOIL_ARENA_STAGE_MAP_KEY,
      luzhnikiStadiumCheckout: true,
      omitClientSeatCoordinateCloud: true,
      hallBackgroundRasterUrl: LUKOIL_ARENA_GRAY_BOWL_PNG,
      maxZoomMultiplier: 12,
      sectorFocusZoomMultiplier: 12,
    },
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 * @param {{ Sector?: string, Row?: string, SeatList?: string[] }[]} [offerRows]
 */
export function adaptLukoilArenaStageMapForLiveOffers(row, offerRows = []) {
  if (!row) return row;
  const layout = parseLayoutJson(row);
  const {
    sellableSeats: _seedSellable,
    offerSeatGeodesy: _seedMeta,
    pbiletCategoryCheckout: _oldCategory,
    maxZoomMultiplier: _editorZoom,
    sectorFocusZoomMultiplier: _editorFocusZoom,
    ...layoutForGeodesy
  } = layout;

  const { hallW, hallH } = lukoilArenaHallSize(layoutForGeodesy, row.svg_markup);
  const pb = layoutForGeodesy.pbilet && typeof layoutForGeodesy.pbilet === 'object'
    ? { ...layoutForGeodesy.pbilet, hallWidth: hallW, hallHeight: hallH }
    : { hallWidth: hallW, hallHeight: hallH };

  const base = footballStadiumCheckoutLayoutFlags(
    {
      ...layoutForGeodesy,
      pbilet: pb,
      grayHallWhenNoOffers: false,
      showUnavailableSeats: false,
      seatSelectionDisabled: false,
      hideSeatList: false,
      preferLayoutSeatPositions: true,
      omitClientSeatCoordinateCloud: true,
      hallBackgroundRasterUrl: LUKOIL_ARENA_GRAY_BOWL_PNG,
      maxZoomMultiplier: 12,
      sectorFocusZoomMultiplier: 12,
    },
    LUKOIL_ARENA_STAGE_MAP_KEY,
  );

  const offers = Array.isArray(offerRows) ? offerRows : [];
  if (offers.length < 1) {
    return {
      ...row,
      layout_json: { ...base, sellableSeats: [], sellableSeatsFromLiveOffers: true },
    };
  }

  const layoutSeats = Array.isArray(layoutForGeodesy.seats) ? layoutForGeodesy.seats : [];
  const cloud = clipHallCoordinateCloud(layoutForGeodesy.allSeatCoordinates);
  const sectorPaths = Array.isArray(layoutForGeodesy.sectorMode?.sectors)
    ? layoutForGeodesy.sectorMode.sectors
    : [];

  const zip = buildSellableSeatGeodesy(layoutSeats, offers, { allowRowZip: true });
  const dots = buildSellableSeatGeodesyWithDots(
    layoutSeats,
    cloud,
    sectorPaths,
    hallW,
    hallH,
    offers,
    row.svg_markup || '',
  );
  const seats = mergeGeodesySeats(zip.seats, dots.seats);

  return {
    ...row,
    layout_json: {
      ...base,
      allSeatCoordinates: cloud,
      sellableSeats: seats.map((seat) => ({
        ...seat,
        geodesySource: seat.geodesySource || 'layoutStrict',
      })),
      sellableSeatsFromLiveOffers: true,
      sellableGeodesyMode: 'layoutStrict+rowZip+sectorCloud',
      offerSeatGeodesy: {
        matched: seats.length,
        totalSellable: zip.totalSellable || dots.totalSellable,
        strictMatched: zip.strictMatched ?? zip.matched,
        rowZipMatched: zip.rowZipMatched ?? 0,
        cloudMatched: dots.cloudMatched ?? 0,
        dotMatched: dots.dotMatched ?? 0,
        unmatchedSamples: zip.unmatchedSamples,
      },
    },
  };
}
