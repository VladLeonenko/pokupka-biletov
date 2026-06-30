import ticketPool from '../ticketDb.js';
import { buildPbiletCategoryStadiumPreview } from './pbiletLuzhnikiFootballPreview.js';
import { footballStadiumCheckoutLayoutFlags } from '../utils/footballStadiumCheckoutLayout.js';
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

export async function loadSupercupNnFootballStageMapRow() {
  const r = await ticketPool.query(
    `SELECT stage_external_id, place_external_id, title, svg_markup, layout_json, external_plan_url
     FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [SUPERKUP_NN_STAGE_MAP_KEY],
  );
  return r.rows[0] || null;
}

function mergeCategoryCheckoutLayout(existing, previewLayout, stageMapKey) {
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
      hideSeatList: old.hideSeatList === true,
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
 * Обновить layout_json (цены секторов) и кэш офферов из Portalbilet category_tickets.
 * @param {number} stageMapRowId
 * @param {{ repertoireId?: string }} [opts]
 */
export async function refreshPbiletCategoryStageMap(stageMapRowId, opts = {}) {
  const cur = await ticketPool.query(`SELECT * FROM getbilet_stage_maps WHERE id = $1`, [stageMapRowId]);
  if (!cur.rows.length) throw new Error('Схема не найдена');
  const row = cur.rows[0];
  const layout = row.layout_json || {};
  if (layout.pbiletCategoryCheckout !== true) {
    throw new Error('Только для pbiletCategoryCheckout (стадион по категориям)');
  }

  const pb = layout.pbilet && typeof layout.pbilet === 'object' ? layout.pbilet : {};
  const preview = await buildPbiletCategoryStadiumPreview({
    layoutId: String(pb.layoutId || SUPERKUP_NN_PBILET_LAYOUT_ID),
    sourceId: String(pb.sourceId || SUPERKUP_NN_PBILET_SOURCE_ID),
    eventSourceId: String(pb.eventSourceId || SUPERKUP_NN_PBILET_EVENT_SOURCE_ID),
    eventDateId: String(pb.eventDateId || SUPERKUP_NN_PBILET_EVENT_DATE_ID),
    demoEventIso: '2026-07-18T16:30:00.000Z',
  });

  const stageMapKey = String(row.stage_external_id || SUPERKUP_NN_STAGE_MAP_KEY);
  const mergedLayout = mergeCategoryCheckoutLayout(layout, preview.layout_json, stageMapKey);
  const { layoutJson: layoutClean } = sanitizeStageMapLayoutJson(mergedLayout, row.svg_markup || '');

  await ticketPool.query(
    `UPDATE getbilet_stage_maps SET layout_json = $2::jsonb, updated_at = NOW() WHERE id = $1`,
    [stageMapRowId, JSON.stringify(layoutClean)],
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
    offerCount: preview.demoOffers?.length ?? 0,
    priceTierCount: prices.size,
    layout_json: layoutClean,
    repertoireId,
  };
}
