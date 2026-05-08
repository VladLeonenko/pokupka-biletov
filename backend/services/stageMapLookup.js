/**
 * Разрешение stage_external_id для выборки строки getbilet_stage_maps (алиасы по репертуару).
 */

import {
  loadRepertoireBase,
  resolvePlaceFromGetbiletMaps,
} from './repertoirePublicContext.js';
import {
  LUZHNIKI_FOOTBALL_STAGE_MAP_KEY,
  shouldUseLuzhnikiFootballCanonicalMap,
} from './luzhnikiFootballStageMap.js';

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
  } catch (e) {
    console.warn('[stageMapLookup] resolveStageMapLookupExternalId:', e instanceof Error ? e.message : e);
  }
  return sid;
}
