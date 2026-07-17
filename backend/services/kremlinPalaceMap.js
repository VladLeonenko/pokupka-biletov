/**
 * Канонический ключ схемы Государственного Кремлёвского дворца в getbilet_stage_maps.
 */

export const KREMLIN_PALACE_MAP_KEY =
  process.env.KREMLIN_PALACE_EXTERNAL_ID?.trim() ||
  process.env.GETBILET_KREMLIN_PALACE_MAP_KEY?.trim() ||
  'kremlin-palace';

/** GetBilet StageId «Большой зал» (есть дубликат в каталоге). */
export const KREMLIN_PALACE_GETBILET_STAGE_IDS = [
  '5e81e2f2930af7003040129e',
  '6048e9be13cd03003015dc8d',
];

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
export function isKremlinPalaceRepertoire(repertoireId) {
  const raw = process.env.GETBILET_KREMLIN_PALACE_REPERTOIRE_IDS?.trim();
  if (!raw) return false;
  const id = String(repertoireId || '').trim().toLowerCase();
  if (!id) return false;
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(id);
}

export function looksLikeKremlinPalaceVenue(...values) {
  const text = normText(values.filter(Boolean).join(' '));
  if (!text) return false;
  return (
    text.includes('кремлевск') ||
    text.includes('kremlin palace') ||
    text.includes('гкд')
  );
}

export function looksLikeKremlinPalaceHall(...values) {
  const text = normText(values.filter(Boolean).join(' '));
  if (!text) return false;
  if (/малый|малая|концертный|выставочн/.test(text)) return false;
  return (
    text.includes('большой зал') ||
    text.includes('государственный кремлевский') ||
    looksLikeKremlinPalaceVenue(text)
  );
}

/** @param {string | null | undefined} stageId */
export function isKremlinPalaceId(stageId) {
  const sid = String(stageId || '').trim();
  if (!sid) return false;
  if (sid === KREMLIN_PALACE_MAP_KEY) return true;
  const raw = process.env.GETBILET_KREMLIN_PALACE_IDS?.trim();
  const ids = raw
    ? raw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean)
    : KREMLIN_PALACE_GETBILET_STAGE_IDS;
  return ids.includes(sid);
}

/** @param {string | null | undefined} repertoireId */
export function kremlinPalaceMapKeyForRepertoire(repertoireId) {
  return isKremlinPalaceRepertoire(repertoireId) ? KREMLIN_PALACE_MAP_KEY : null;
}

/**
 * @param {{ title?: string; venueManual?: string | null; venueFromPayload?: string | null; repertoireId?: string | null; hall?: string | null; stageId?: string | null }} ctx
 * @param {string | null | undefined} placeFromMapsVenue
 * @param {string | null | undefined} hall
 */
export function shouldUseKremlinPalaceCanonicalMap(ctx, placeFromMapsVenue, hall) {
  if (isKremlinPalaceRepertoire(ctx?.repertoireId)) return true;
  if (isKremlinPalaceId(ctx?.stageId)) return true;
  const hallText = hall || ctx?.hall || '';
  const venue = [ctx?.venueManual, ctx?.venueFromPayload, placeFromMapsVenue].filter(Boolean).join(' ');
  if (!looksLikeKremlinPalaceVenue(venue, ctx?.title) && !looksLikeKremlinPalaceVenue(hallText)) {
    return false;
  }
  return looksLikeKremlinPalaceHall(venue, hallText, ctx?.title) || !hallText.trim();
}
