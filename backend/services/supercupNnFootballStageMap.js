import ticketPool from '../ticketDb.js';
import {
  buildLuzhnikiFootballStadiumPreview,
} from './pbiletLuzhnikiFootballPreview.js';
import { footballStadiumCheckoutLayoutFlags } from '../utils/footballStadiumCheckoutLayout.js';
import { buildSellableSeatGeodesy } from '../utils/hallSeatGeodesyMatch.js';
import { sanitizeStageMapLayoutJson } from '../utils/sanitizeStageMapLayoutJson.js';
import {
  SUPERKUP_NN_REPERTOIRE_ID,
  SUPERKUP_NN_STAGE_MAP_KEY,
  SUPERKUP_NN_PBILET_LAYOUT_ID,
  SUPERKUP_NN_PBILET_EVENT_SOURCE_ID,
  SUPERKUP_NN_PBILET_EVENT_DATE_ID,
  SUPERKUP_NN_PBILET_SOURCE_ID,
} from '../utils/footballStadiumRepertoires.js';

export { SUPERKUP_NN_STAGE_MAP_KEY };

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

export async function loadSupercupNnFootballStageMapRow() {
  const r = await ticketPool.query(
    `SELECT stage_external_id, place_external_id, title, svg_markup, layout_json, external_plan_url
     FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [SUPERKUP_NN_STAGE_MAP_KEY],
  );
  return r.rows[0] || null;
}

/** Клиенту: без layout.seats — серая чаша = allSeatCoordinates, sellable = sellableSeats. */
export function slimSupercupNnStageMapForClient(row) {
  if (!row) return row;
  const layout = parseLayoutJson(row);
  const { seats: _seats, seatPositions: _pos, ...slimLayout } = layout;
  return {
    ...row,
    layout_json: {
      ...slimLayout,
      stadiumMapKey: SUPERKUP_NN_STAGE_MAP_KEY,
      luzhnikiStadiumCheckout: true,
      omitClientSeatCoordinateCloud: false,
    },
  };
}

/**
 * Живые офферы GetBilet → sellableSeats по layout.seats (pbilet tickets, strict match).
 * @param {Record<string, unknown> | null | undefined} row
 * @param {{ Sector?: string, Row?: string, SeatList?: string[] }[]} [offerRows]
 */
export function adaptSupercupNnFootballStageMapForLiveOffers(row, offerRows = []) {
  if (!row) return row;
  const layout = parseLayoutJson(row);
  const {
    sellableSeats: _seedSellable,
    offerSeatGeodesy: _seedMeta,
    pbiletCategoryCheckout: _oldCategory,
    ...layoutForGeodesy
  } = layout;

  const base = footballStadiumCheckoutLayoutFlags(
    {
      ...layoutForGeodesy,
      seatSelectionDisabled: false,
      hideSeatList: false,
    },
    SUPERKUP_NN_STAGE_MAP_KEY,
  );

  const offers = Array.isArray(offerRows) ? offerRows : [];
  if (offers.length < 1) {
    return { ...row, layout_json: { ...base, sellableSeats: [], sellableSeatsFromLiveOffers: true } };
  }

  const layoutSeats = Array.isArray(layoutForGeodesy.seats) ? layoutForGeodesy.seats : [];
  const geodesy = buildSellableSeatGeodesy(layoutSeats, offers);

  return {
    ...row,
    layout_json: {
      ...base,
      sellableSeats: geodesy.seats.map((seat) => ({
        ...seat,
        geodesySource: seat.geodesySource || 'layoutStrict',
      })),
      sellableSeatsFromLiveOffers: true,
      sellableGeodesyMode: 'layoutStrict',
      offerSeatGeodesy: {
        matched: geodesy.matched,
        totalSellable: geodesy.totalSellable,
        strictMatched: geodesy.matched,
        unmatchedSamples: geodesy.unmatchedSamples,
      },
    },
  };
}

function mergeSeatCheckoutLayout(existing, previewLayout, stageMapKey) {
  const old = existing && typeof existing === 'object' ? existing : {};
  const next = previewLayout && typeof previewLayout === 'object' ? previewLayout : {};
  const oldSectors = Array.isArray(old.sectorMode?.sectors) ? old.sectorMode.sectors : [];
  const newSectors = Array.isArray(next.sectorMode?.sectors) ? next.sectorMode.sectors : [];
  const oldById = new Map(oldSectors.map((s) => [String(s.id), s]));

  const sectors = newSectors.map((s) => {
    const prev = oldById.get(String(s.id)) || {};
    return {
      ...s,
      previewImageUrl: prev.previewImageUrl ?? s.previewImageUrl ?? null,
    };
  });

  return footballStadiumCheckoutLayoutFlags(
    {
      ...next,
      hideSeatList: false,
      categoryCheckoutDefaults: old.categoryCheckoutDefaults ?? next.categoryCheckoutDefaults,
      sectorMode: {
        ...(next.sectorMode || {}),
        sectors,
      },
    },
    stageMapKey,
  );
}

function offersPayloadFromDemo(offers, placeName, placeAddress) {
  return {
    Success: true,
    Method: 'GetOfferListByRepertoireId',
    ResultData: (offers || []).map((o) => ({
      ...o,
      PlaceName: placeName || o.PlaceName,
      PlaceAddress: placeAddress || o.PlaceAddress,
    })),
  };
}

/**
 * Обновить layout_json (места pbilet) и кэш офферов из Portalbilet tickets.
 * @param {number} stageMapRowId
 * @param {{ repertoireId?: string }} [opts]
 */
export async function refreshSupercupNnFootballStageMap(stageMapRowId, opts = {}) {
  const cur = await ticketPool.query(`SELECT * FROM getbilet_stage_maps WHERE id = $1`, [stageMapRowId]);
  if (!cur.rows.length) throw new Error('Схема не найдена');
  const row = cur.rows[0];
  const layout = row.layout_json || {};
  if (String(row.stage_external_id || '') !== SUPERKUP_NN_STAGE_MAP_KEY) {
    throw new Error('Только для supercup-nn-football');
  }

  const pb = layout.pbilet && typeof layout.pbilet === 'object' ? layout.pbilet : {};
  const preview = await buildLuzhnikiFootballStadiumPreview({
    layoutId: String(pb.layoutId || SUPERKUP_NN_PBILET_LAYOUT_ID),
    sourceId: String(pb.sourceId || SUPERKUP_NN_PBILET_SOURCE_ID),
    eventSourceId: String(pb.eventSourceId || SUPERKUP_NN_PBILET_EVENT_SOURCE_ID),
    eventDateId: String(pb.eventDateId || SUPERKUP_NN_PBILET_EVENT_DATE_ID),
    demoEventIso: '2026-07-18T16:30:00.000Z',
  });

  if (!Array.isArray(preview.layout_json?.seats) || preview.layout_json.seats.length < 2) {
    throw new Error('pbilet tickets не вернули координаты мест — проверьте event_source_id / event_date_id');
  }

  const stageMapKey = String(row.stage_external_id || SUPERKUP_NN_STAGE_MAP_KEY);
  const mergedLayout = mergeSeatCheckoutLayout(layout, preview.layout_json, stageMapKey);
  const { layoutJson: layoutClean } = sanitizeStageMapLayoutJson(mergedLayout, row.svg_markup || '');

  await ticketPool.query(
    `UPDATE getbilet_stage_maps SET
       svg_markup = $2,
       layout_json = $3::jsonb,
       updated_at = NOW()
     WHERE id = $1`,
    [stageMapRowId, preview.svg_markup, JSON.stringify(layoutClean)],
  );

  const repertoireId = String(opts.repertoireId || SUPERKUP_NN_REPERTOIRE_ID).trim();
  let placeName = 'Совкомбанк Арена';
  let placeAddress = 'Нижний Новгород';
  const cat = await ticketPool.query(
    `SELECT payload_json FROM getbilet_catalog_cache WHERE repertoire_external_id = $1 LIMIT 1`,
    [repertoireId],
  );
  if (cat.rows[0]?.payload_json) {
    const p = cat.rows[0].payload_json;
    placeName = String(p.PlaceName || p.placeName || placeName);
    placeAddress = String(p.PlaceAddress || p.placeAddress || placeAddress);
  }

  const offersPayload = offersPayloadFromDemo(preview.demoOffers, placeName, placeAddress);
  await ticketPool.query(
    `INSERT INTO getbilet_repertoire_offers_cache (repertoire_external_id, payload_json, fetched_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (repertoire_external_id) DO UPDATE SET
       payload_json = EXCLUDED.payload_json,
       fetched_at = NOW()`,
    [repertoireId, JSON.stringify(offersPayload)],
  );

  const prices = new Set(
    (preview.demoOffers || [])
      .map((o) => Number(o.AgentPrice ?? o.NominalPrice))
      .filter((n) => Number.isFinite(n) && n > 0),
  );

  return {
    ok: true,
    mode: preview.meta?.mode,
    seatCount: preview.meta?.seatCount ?? preview.layout_json?.seats?.length ?? 0,
    offerCount: preview.demoOffers?.length ?? 0,
    priceTierCount: prices.size,
    layout_json: layoutClean,
    repertoireId,
  };
}

/** @deprecated используйте refreshSupercupNnFootballStageMap */
export async function refreshPbiletCategoryStageMap(stageMapRowId, opts = {}) {
  return refreshSupercupNnFootballStageMap(stageMapRowId, opts);
}
