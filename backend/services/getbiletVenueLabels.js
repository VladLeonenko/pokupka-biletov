/**
 * Подпись площадки для карточек: GetStageListByPlaceId (первый Name) → имя из GetPlaceList.
 * Кэш в памяти, чтобы не дергать GetBilet на каждый запрос /events.
 */

import { restV2GetPlaceList, restV2GetStageListByPlaceId } from './getbiletRestV2.js';
import { GetbiletUpstreamError } from './getbiletClient.js';

/** @type {Map<string, { label: string; at: number }>} */
const labelCache = new Map();
const TTL_MS = 24 * 60 * 60 * 1000;

/** @param {unknown} row */
function pickPlaceId(row) {
  if (!row || typeof row !== 'object') return null;
  const r = /** @type {Record<string, unknown>} */ (row);
  const keys = ['PlaceId', 'placeId', 'PlaceID', 'VenuePlaceId', 'venuePlaceId'];
  for (const k of keys) {
    const v = r[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

/** @param {unknown} row */
function pickMongoId(row) {
  if (!row || typeof row !== 'object') return null;
  const id = /** @type {Record<string, unknown>} */ (row).Id ?? /** @type {Record<string, unknown>} */ (row).id;
  return id != null && id !== '' ? String(id) : null;
}

/**
 * @returns {Promise<Map<string, string>>}
 */
async function loadPlaceIdToNameFromPlaceList() {
  const map = new Map();
  try {
    const data = await restV2GetPlaceList();
    for (const p of data.ResultData || []) {
      if (!p || typeof p !== 'object') continue;
      const id = pickMongoId(p);
      const nm = /** @type {Record<string, unknown>} */ (p).Name ?? /** @type {Record<string, unknown>} */ (p).name;
      if (id && nm != null && String(nm).trim()) map.set(id, String(nm).trim());
    }
  } catch {
    /* GetPlaceList недоступен */
  }
  return map;
}

/**
 * Подпись для PlaceId: сначала первый Name из GetStageListByPlaceId (как в кабинете GetBilet),
 * иначе имя площадки из GetPlaceList.
 * @param {string} placeId
 * @param {Map<string, string>} placeListNames
 * @returns {Promise<string>}
 */
export async function resolveVenueLabelForPlaceId(placeId, placeListNames) {
  const pid = typeof placeId === 'string' ? placeId.trim() : '';
  if (!pid) return '';

  const now = Date.now();
  const hit = labelCache.get(pid);
  if (hit && now - hit.at < TTL_MS) return hit.label;

  let label = '';
  try {
    const sd = await restV2GetStageListByPlaceId(pid);
    const rows = Array.isArray(sd.ResultData) ? sd.ResultData : [];
    const first = rows[0];
    if (first && typeof first === 'object') {
      const nm = /** @type {Record<string, unknown>} */ (first).Name ?? /** @type {Record<string, unknown>} */ (first).name;
      if (nm != null && String(nm).trim()) label = String(nm).trim();
    }
  } catch (e) {
    if (!(e instanceof GetbiletUpstreamError)) {
      console.error('[getbiletVenueLabels] GetStageListByPlaceId', pid, e instanceof Error ? e.message : e);
    }
  }
  if (!label) label = placeListNames.get(pid) || '';

  if (label) labelCache.set(pid, { label, at: now });
  return label;
}

/**
 * Для набора placeId — параллельно с ограничением.
 * @param {Iterable<string>} placeIds
 * @returns {Promise<Map<string, string>>}
 */
export async function resolveVenueLabelsForPlaceIds(placeIds) {
  const unique = [...new Set([...placeIds].map((id) => String(id || '').trim()).filter(Boolean))];
  const out = new Map();
  if (unique.length === 0) return out;

  const placeListNames = await loadPlaceIdToNameFromPlaceList();
  const conc = 6;
  for (let i = 0; i < unique.length; i += conc) {
    const chunk = unique.slice(i, i + conc);
    const parts = await Promise.all(
      chunk.map(async (pid) => {
        const label = await resolveVenueLabelForPlaceId(pid, placeListNames);
        return { pid, label };
      }),
    );
    for (const { pid, label } of parts) {
      if (label) out.set(pid, label);
    }
  }
  return out;
}

/**
 * @param {Record<string, unknown>[]} actions
 * @returns {string[]}
 */
export function collectPlaceIdsFromCatalogActions(actions) {
  const ids = [];
  for (const row of actions) {
    const pid = pickPlaceId(row);
    if (pid) ids.push(pid);
  }
  return ids;
}

export { pickPlaceId };
