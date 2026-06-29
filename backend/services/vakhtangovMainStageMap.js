/**
 * Каноническая схема основной сцены Театра им. Вахтангова (getbilet_stage_maps).
 */

import ticketPool from '../ticketDb.js';

export const VAKHTANGOV_MAIN_STAGE_MAP_KEY =
  process.env.VAKHTANGOV_STAGE_EXTERNAL_ID?.trim() ||
  process.env.GETBILET_VAKHTANGOV_MAIN_STAGE_MAP_KEY?.trim() ||
  '5f3dedaa08192a003157dc6d';

const DEFAULT_VAKHTANGOV_MAIN_STAGE_IDS = new Set([
  VAKHTANGOV_MAIN_STAGE_MAP_KEY,
  '5f3dee4f08192a003157dc71',
]);

function parseEnvVakhtangovStageIds() {
  const raw = process.env.GETBILET_VAKHTANGOV_MAIN_STAGE_IDS?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function normText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/Ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function looksLikeVakhtangovVenue(...values) {
  const text = normText(values.filter(Boolean).join(' '));
  if (!text) return false;
  return text.includes('вахтанг') || text.includes('vakhtangov');
}

export function looksLikeVakhtangovMainStageHall(...values) {
  const text = normText(values.filter(Boolean).join(' '));
  if (!text) return false;
  if (!looksLikeVakhtangovVenue(text)) return false;
  if (/малый|малый зал|камерн|новая сцен|репетиц/.test(text)) return false;
  return true;
}

/** @param {string | null | undefined} stageId */
export function isVakhtangovMainStageId(stageId) {
  const sid = String(stageId || '').trim();
  if (!sid) return false;
  if (DEFAULT_VAKHTANGOV_MAIN_STAGE_IDS.has(sid)) return true;
  return parseEnvVakhtangovStageIds().has(sid);
}

/** @param {string | null | undefined} repertoireId */
export function vakhtangovMainStageMapKeyForRepertoire(repertoireId) {
  const raw = process.env.GETBILET_VAKHTANGOV_MAIN_REPERTOIRE_IDS?.trim();
  if (!raw) return null;
  const id = String(repertoireId || '').trim().toLowerCase();
  if (!id) return null;
  const hit = raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(id);
  return hit ? VAKHTANGOV_MAIN_STAGE_MAP_KEY : null;
}

/**
 * @param {{ title?: string; venueManual?: string | null; venueFromPayload?: string | null; repertoireId?: string | null; hall?: string | null; stageId?: string | null }} ctx
 * @param {string | null | undefined} placeFromMapsVenue
 * @param {string | null | undefined} hall
 */
export function shouldUseVakhtangovMainStageCanonicalMap(ctx, placeFromMapsVenue, hall) {
  if (vakhtangovMainStageMapKeyForRepertoire(ctx?.repertoireId)) return true;
  if (isVakhtangovMainStageId(ctx?.stageId)) return true;
  const hallText = hall || ctx?.hall || '';
  const venue = [ctx?.venueManual, ctx?.venueFromPayload, placeFromMapsVenue].filter(Boolean).join(' ');
  return looksLikeVakhtangovMainStageHall(venue, hallText, ctx?.title);
}

export async function loadVakhtangovMainStageMapRow() {
  const r = await ticketPool.query(
    `SELECT stage_external_id, place_external_id, title, svg_markup, layout_json, external_plan_url
     FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [VAKHTANGOV_MAIN_STAGE_MAP_KEY],
  );
  return r.rows[0] || null;
}
