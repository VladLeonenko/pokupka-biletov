/**
 * Канонический ключ схемы РАМТ — Большая сцена в getbilet_stage_maps.
 */

export const RAMT_BIG_STAGE_MAP_KEY =
  process.env.RAMT_BIG_STAGE_EXTERNAL_ID?.trim() ||
  process.env.GETBILET_RAMT_BIG_STAGE_MAP_KEY?.trim() ||
  'ramt-big-stage';

function normText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/Ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** @param {string | null | undefined} repertoireId */
export function isRamtBigStageRepertoire(repertoireId) {
  const raw = process.env.GETBILET_RAMT_BIG_STAGE_REPERTOIRE_IDS?.trim();
  if (!raw) return false;
  const id = String(repertoireId || '').trim().toLowerCase();
  if (!id) return false;
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(id);
}

export function looksLikeRamtVenue(...values) {
  const text = normText(values.filter(Boolean).join(' '));
  if (!text) return false;
  return text.includes('рамт') || /российск\w*\s+академ\w*\s+молод/.test(text) || /молод[её]жн\w*\s+театр/.test(text);
}

export function looksLikeRamtBigStageHall(...values) {
  const text = normText(values.filter(Boolean).join(' '));
  if (!text) return false;
  if (!looksLikeRamtVenue(text)) return false;
  if (/мал(ая|енькая)\s+сцен/.test(text)) return false;
  if (/бел(ая|ой)\s+комнат/.test(text)) return false;
  if (/ч[её]рн(ая|ой)\s+комнат/.test(text)) return false;
  if (/на\s+сцене/.test(text)) return false;
  if (/театральн\w*\s+двор/.test(text)) return false;
  return /больш(ая|ой)\s+сцен/.test(text) || text === 'рамт' || text.includes('основн');
}

/**
 * @param {string | null | undefined} repertoireId
 * @returns {string | null}
 */
export function ramtBigStageMapKeyForRepertoire(repertoireId) {
  return isRamtBigStageRepertoire(repertoireId) ? RAMT_BIG_STAGE_MAP_KEY : null;
}

/**
 * @param {{ title?: string; venueManual?: string | null; venueFromPayload?: string | null; repertoireId?: string | null; hall?: string | null }} ctx
 * @param {string | null | undefined} placeFromMapsVenue
 * @param {string | null | undefined} hall
 */
export function shouldUseRamtBigStageCanonicalMap(ctx, placeFromMapsVenue, hall) {
  if (isRamtBigStageRepertoire(ctx?.repertoireId)) return true;
  const hallText = hall || ctx?.hall || '';
  const venue = [ctx?.venueManual, ctx?.venueFromPayload, placeFromMapsVenue].filter(Boolean).join(' ');
  return looksLikeRamtBigStageHall(venue, hallText, ctx?.title);
}
