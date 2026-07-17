/**
 * Канонический ключ схемы Большого театра — Новая сцена в getbilet_stage_maps.
 */

export const BOLSHOI_NEW_STAGE_MAP_KEY =
  process.env.BOLSHOI_NEW_STAGE_EXTERNAL_ID?.trim() ||
  process.env.GETBILET_BOLSHOI_NEW_STAGE_MAP_KEY?.trim() ||
  'bolshoi-new-stage';

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
export function isBolshoiNewStageRepertoire(repertoireId) {
  const raw = process.env.GETBILET_BOLSHOI_NEW_STAGE_REPERTOIRE_IDS?.trim();
  if (!raw) return false;
  const id = String(repertoireId || '').trim().toLowerCase();
  if (!id) return false;
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(id);
}

export function looksLikeBolshoiVenue(...values) {
  const text = normText(values.filter(Boolean).join(' '));
  if (!text) return false;
  return text.includes('большой театр') || text.includes('bolshoi') || text.includes('габт');
}

export function looksLikeBolshoiNewStageHall(...values) {
  const text = normText(values.filter(Boolean).join(' '));
  if (!text) return false;
  if (/историческ|главн|основн|старая\s+сцен|historical\s+stage/.test(text)) return false;
  return text.includes('новая сцен') || text.includes('new stage');
}

/** @param {string | null | undefined} stageId */
export function isBolshoiNewStageId(stageId) {
  const sid = String(stageId || '').trim();
  if (!sid) return false;
  if (sid === BOLSHOI_NEW_STAGE_MAP_KEY) return true;
  const raw = process.env.GETBILET_BOLSHOI_NEW_STAGE_IDS?.trim();
  if (!raw) return false;
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(sid);
}

/** @param {string | null | undefined} repertoireId */
export function bolshoiNewStageMapKeyForRepertoire(repertoireId) {
  return isBolshoiNewStageRepertoire(repertoireId) ? BOLSHOI_NEW_STAGE_MAP_KEY : null;
}

/**
 * @param {{ title?: string; venueManual?: string | null; venueFromPayload?: string | null; repertoireId?: string | null; hall?: string | null; stageId?: string | null }} ctx
 * @param {string | null | undefined} placeFromMapsVenue
 * @param {string | null | undefined} hall
 */
export function shouldUseBolshoiNewStageCanonicalMap(ctx, placeFromMapsVenue, hall) {
  if (isBolshoiNewStageRepertoire(ctx?.repertoireId)) return true;
  if (isBolshoiNewStageId(ctx?.stageId)) return true;
  const hallText = hall || ctx?.hall || '';
  const venue = [ctx?.venueManual, ctx?.venueFromPayload, placeFromMapsVenue].filter(Boolean).join(' ');
  return looksLikeBolshoiNewStageHall(venue, hallText, ctx?.title);
}
