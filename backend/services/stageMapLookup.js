/**
 * Разрешение stage_external_id для выборки строки getbilet_stage_maps (алиасы по репертуару).
 */

import {
  loadRepertoireBase,
  resolvePlaceFromGetbiletMaps,
} from './repertoirePublicContext.js';
import { footballStadiumStageMapKeyForRepertoire } from '../utils/footballStadiumRepertoires.js';
import {
  LUZHNIKI_FOOTBALL_STAGE_MAP_KEY,
  shouldUseLuzhnikiFootballCanonicalMap,
} from './luzhnikiFootballStageMap.js';
import {
  RAMT_BIG_STAGE_MAP_KEY,
  ramtBigStageMapKeyForRepertoire,
  shouldUseRamtBigStageCanonicalMap,
} from './ramtBigStageMap.js';
import {
  VAKHTANGOV_MAIN_STAGE_MAP_KEY,
  isVakhtangovMainStageId,
  vakhtangovMainStageMapKeyForRepertoire,
  shouldUseVakhtangovMainStageCanonicalMap,
} from './vakhtangovMainStageMap.js';
import {
  BOLSHOI_NEW_STAGE_MAP_KEY,
  bolshoiNewStageMapKeyForRepertoire,
  isBolshoiNewStageId,
  shouldUseBolshoiNewStageCanonicalMap,
} from './bolshoiNewStageMap.js';
import {
  KREMLIN_PALACE_MAP_KEY,
  isKremlinPalaceId,
  kremlinPalaceMapKeyForRepertoire,
  shouldUseKremlinPalaceCanonicalMap,
} from './kremlinPalaceMap.js';

/** Основная сцена МХТ: канон + legacy seed id. */
const MHT_MAIN_STAGE_MAP_KEY =
  process.env.MHT_STAGE_EXTERNAL_ID?.trim() || '603ad33813cd03003015d811';
const MHT_MAIN_STAGE_ALIASES = new Set([
  MHT_MAIN_STAGE_MAP_KEY,
  '603ad33813cd03003015d811',
  '639c4a4cd6cfc5004d20dcfb',
]);

function isMhtChekhovMainStageId(stageId) {
  const sid = String(stageId || '').trim();
  return Boolean(sid && MHT_MAIN_STAGE_ALIASES.has(sid));
}

/** Порядок lookup SVG МХТ: канон → legacy seed. */
export function mhtChekhovStageMapLookupIds(stageId) {
  const sid = String(stageId || '').trim();
  if (!isMhtChekhovMainStageId(sid) && sid !== MHT_MAIN_STAGE_MAP_KEY) {
    return sid ? [sid] : [];
  }
  return [...MHT_MAIN_STAGE_ALIASES];
}

function pickHallLabelFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  for (const k of ['StageName', 'stageName', 'HallName', 'hallName', 'PlaceName', 'placeName']) {
    const v = payload[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

/**
 * @param {string} stageId — Mongo StageId из URL (может не совпадать с каноническим ключом схемы)
 * @param {string} [repertoireId] — при совпадении эвристики Лужники+футбол подставляется канонический ключ
 * @returns {Promise<string>}
 */
export async function resolveStageMapLookupExternalId(stageId, repertoireId) {
  const sid = String(stageId || '').trim();
  const rid = String(repertoireId || '').trim();

  const forcedFootballStadium = footballStadiumStageMapKeyForRepertoire(rid);
  if (forcedFootballStadium) return forcedFootballStadium;

  const forcedRamt = ramtBigStageMapKeyForRepertoire(rid);
  if (forcedRamt) return forcedRamt;

  const forcedVakhtangov = vakhtangovMainStageMapKeyForRepertoire(rid);
  if (forcedVakhtangov) return forcedVakhtangov;

  const forcedBolshoiNew = bolshoiNewStageMapKeyForRepertoire(rid);
  if (forcedBolshoiNew) return forcedBolshoiNew;

  const forcedKremlin = kremlinPalaceMapKeyForRepertoire(rid);
  if (forcedKremlin) return forcedKremlin;

  if (isVakhtangovMainStageId(sid)) return VAKHTANGOV_MAIN_STAGE_MAP_KEY;
  if (isMhtChekhovMainStageId(sid)) return MHT_MAIN_STAGE_MAP_KEY;
  if (isBolshoiNewStageId(sid)) return BOLSHOI_NEW_STAGE_MAP_KEY;
  if (isKremlinPalaceId(sid)) return KREMLIN_PALACE_MAP_KEY;

  if (!rid || !sid) return sid;

  try {
    const base = await loadRepertoireBase(rid);
    const placeFromMaps = await resolvePlaceFromGetbiletMaps(base.payload, base.stageId);
    const hall = pickHallLabelFromPayload(base.payload);
    const manualVenue =
      base.venueManual != null && String(base.venueManual).trim() ? String(base.venueManual).trim() : null;
    if (
      shouldUseLuzhnikiFootballCanonicalMap(
        {
          title: base.title,
          descriptionFromPayload: base.descriptionFromPayload,
          genreFromPayload: base.genreFromPayload,
          venueManual: manualVenue,
          venueFromPayload: base.venueFromPayload,
        },
        placeFromMaps.venue,
        hall,
      )
    ) {
      return LUZHNIKI_FOOTBALL_STAGE_MAP_KEY;
    }
    if (
      shouldUseRamtBigStageCanonicalMap(
        {
          title: base.title,
          repertoireId: rid,
          venueManual: manualVenue,
          venueFromPayload: base.venueFromPayload,
          hall,
        },
        placeFromMaps.venue,
        hall,
      )
    ) {
      return RAMT_BIG_STAGE_MAP_KEY;
    }
    if (
      shouldUseVakhtangovMainStageCanonicalMap(
        {
          title: base.title,
          repertoireId: rid,
          stageId: sid,
          venueManual: manualVenue,
          venueFromPayload: base.venueFromPayload,
          hall,
        },
        placeFromMaps.venue,
        hall,
      )
    ) {
      return VAKHTANGOV_MAIN_STAGE_MAP_KEY;
    }
    if (
      shouldUseBolshoiNewStageCanonicalMap(
        {
          title: base.title,
          repertoireId: rid,
          stageId: sid,
          venueManual: manualVenue,
          venueFromPayload: base.venueFromPayload,
          hall,
        },
        placeFromMaps.venue,
        hall,
      )
    ) {
      return BOLSHOI_NEW_STAGE_MAP_KEY;
    }
    if (
      shouldUseKremlinPalaceCanonicalMap(
        {
          title: base.title,
          repertoireId: rid,
          stageId: sid,
          venueManual: manualVenue,
          venueFromPayload: base.venueFromPayload,
          hall,
        },
        placeFromMaps.venue,
        hall,
      )
    ) {
      return KREMLIN_PALACE_MAP_KEY;
    }
  } catch (e) {
    console.warn('[stageMapLookup] resolveStageMapLookupExternalId:', e instanceof Error ? e.message : e);
  }
  return sid;
}
