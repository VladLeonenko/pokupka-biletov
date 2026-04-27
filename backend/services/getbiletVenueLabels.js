/**
 * Подписи площадки для карточек: строка репертуара (вложенные Place/Venue),
 * плюс справочники по GetPlaceList + GetStageListByPlaceId (placeId и stageId → Name).
 * Кэш в памяти, чтобы не дергать GetBilet на каждый запрос /events.
 */

import { restV2GetPlaceList, restV2GetStageListByPlaceId } from './getbiletRestV2.js';
import { GetbiletUpstreamError } from './getbiletClient.js';

/** @param {unknown} row */
function pickMongoId(row) {
  if (!row || typeof row !== 'object') return null;
  const id = /** @type {Record<string, unknown>} */ (row).Id ?? /** @type {Record<string, unknown>} */ (row).id;
  return id != null && id !== '' ? String(id) : null;
}

/**
 * Имя **родительской** площадки (театр / стадион), без подписи конкретной сцены («Малая сцена», «Стадион»).
 * @param {unknown} row
 * @returns {string}
 */
export function extractParentVenueFromRow(row) {
  if (!row || typeof row !== 'object') return '';
  const r = /** @type {Record<string, unknown>} */ (row);
  const flatKeys = [
    'PlaceName',
    'placeName',
    'venueName',
    'VenueName',
    'HallName',
    'hallName',
    'PlaceTitle',
    'placeTitle',
    'BuildingName',
    'buildingName',
    'LocationName',
    'locationName',
  ];
  for (const k of flatKeys) {
    const v = r[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  const nested = [r.Place, r.place, r.Venue, r.venue, r.Building, r.building, r.Location, r.location];
  for (const o of nested) {
    if (!o || typeof o !== 'object') continue;
    const orec = /** @type {Record<string, unknown>} */ (o);
    const nm = orec.Name ?? orec.name ?? orec.Title ?? orec.title;
    if (typeof nm === 'string' && nm.trim()) return nm.trim();
  }
  return '';
}

/**
 * Адрес площадки из репертуара/оффера (GetBilet) или пусто.
 * @param {unknown} row
 * @returns {string}
 */
export function extractAddressFromRow(row) {
  if (!row || typeof row !== 'object') return '';
  const r = /** @type {Record<string, unknown>} */ (row);
  const flat = ['PlaceAddress', 'placeAddress', 'Address', 'address', 'VenueAddress', 'venueAddress', 'locationAddress', 'LocationAddress'];
  for (const k of flat) {
    const v = r[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  for (const key of ['Place', 'place', 'Venue', 'venue', 'Location', 'location']) {
    const o = r[key];
    if (!o || typeof o !== 'object') continue;
    const orec = /** @type {Record<string, unknown>} */ (o);
    const a = orec.Address ?? orec.address;
    if (typeof a === 'string' && a.trim()) return a.trim();
  }
  return '';
}

/**
 * @param {unknown} row
 * @returns {string | null}
 */
export function pickPlaceId(row) {
  if (!row || typeof row !== 'object') return null;
  const r = /** @type {Record<string, unknown>} */ (row);
  const keys = [
    'PlaceId',
    'placeId',
    'PlaceID',
    'ParentPlaceId',
    'parentPlaceId',
    'VenuePlaceId',
    'venuePlaceId',
    'PlaceExternalId',
    'placeExternalId',
    'LocationId',
    'locationId',
  ];
  for (const k of keys) {
    const v = r[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  const nested = [r.Place, r.place, r.Venue, r.venue, r.Location, r.location];
  for (const o of nested) {
    if (!o || typeof o !== 'object') continue;
    const orec = /** @type {Record<string, unknown>} */ (o);
    const id = orec.Id ?? orec.id ?? orec.ID;
    if (id != null && String(id).trim()) return String(id).trim();
  }
  return null;
}

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

function clampInt(n, min, max, fallback) {
  const x = parseInt(String(n), 10);
  if (!Number.isFinite(x)) return fallback;
  return Math.min(max, Math.max(min, x));
}

/** @type {{ at: number; byPlaceId: Map<string, string>; stageIdToParentVenue: Map<string, string>; stageIdToAddress: Map<string, string>; placeIdToAddress: Map<string, string> } | null} */
let venueLookupCache = null;
const VENUE_LOOKUP_TTL_MS = 45 * 60 * 1000;

/**
 * Один проход: GetPlaceList + GetStageListByPlaceId.
 * placeId → имя из списка площадок (театр/стадион), иначе первый Name в списке сцен.
 * Каждая сцена → то же родительское имя (не «Малая сцена» / «Стадион» как отдельная сущность).
 * address: из строки сцены (ResultData) — Address, при отсутствии на сцене — с первой строки площадки.
 * @returns {Promise<{ byPlaceId: Map<string, string>; stageIdToParentVenue: Map<string, string>; stageIdToAddress: Map<string, string>; placeIdToAddress: Map<string, string> }>}
 */
export async function getVenueLookupMaps() {
  const now = Date.now();
  if (
    venueLookupCache &&
    now - venueLookupCache.at < VENUE_LOOKUP_TTL_MS &&
    (venueLookupCache.byPlaceId.size > 0 || venueLookupCache.stageIdToParentVenue.size > 0)
  ) {
    return {
      byPlaceId: venueLookupCache.byPlaceId,
      stageIdToParentVenue: venueLookupCache.stageIdToParentVenue,
      stageIdToAddress: venueLookupCache.stageIdToAddress,
      placeIdToAddress: venueLookupCache.placeIdToAddress,
    };
  }

  const placeListNames = await loadPlaceIdToNameFromPlaceList();
  /** Все имена из GetPlaceList — иначе byPlaceId заполнялся только для первых N площадок в цикле по сценам. */
  const byPlaceId = new Map(placeListNames);
  const stageIdToParentVenue = new Map();
  const stageIdToAddress = new Map();
  const placeIdToAddress = new Map();

  try {
    const placesData = await restV2GetPlaceList();
    const placeRows = Array.isArray(placesData.ResultData) ? placesData.ResultData : [];
    for (const p of placeRows) {
      if (!p || typeof p !== 'object') continue;
      const pid = pickMongoId(p);
      if (!pid) continue;
      const pre = /** @type {Record<string, unknown>} */ (p);
      const aPlace = pre.Address ?? pre.address;
      if (aPlace != null && String(aPlace).trim() && !placeIdToAddress.has(pid)) {
        placeIdToAddress.set(pid, String(aPlace).trim());
      }
    }
    const maxPlaces = clampInt(process.env.GETBILET_V2_CATALOG_MAX_PLACES || '200', 1, 400, 200);
    const slice = placeRows.slice(0, maxPlaces);
    const conc = 6;

    for (let i = 0; i < slice.length; i += conc) {
      const chunk = slice.slice(i, i + conc);
      await Promise.all(
        chunk.map(async (p) => {
          if (!p || typeof p !== 'object') return;
          const pid = pickMongoId(p);
          if (!pid) return;
          try {
            const sd = await restV2GetStageListByPlaceId(pid);
            const rows = Array.isArray(sd.ResultData) ? sd.ResultData : [];
            const official = (placeListNames.get(pid) || '').trim();
            let fromFirstStage = '';
            const first = rows[0];
            if (first && typeof first === 'object') {
              const nm =
                /** @type {Record<string, unknown>} */ (first).Name ??
                /** @type {Record<string, unknown>} */ (first).name;
              if (nm != null && String(nm).trim()) fromFirstStage = String(nm).trim();
            }
            const cardVenue = official || fromFirstStage;
            if (cardVenue) byPlaceId.set(pid, cardVenue);

            let fallbackAddr = placeIdToAddress.get(pid) || '';
            for (const st of rows) {
              if (!st || typeof st !== 'object') continue;
              const orec = /** @type {Record<string, unknown>} */ (st);
              const rawA = orec.Address ?? orec.address;
              const ad = rawA != null && String(rawA).trim() ? String(rawA).trim() : '';
              if (ad && !fallbackAddr) fallbackAddr = ad;
            }
            if (fallbackAddr) placeIdToAddress.set(pid, fallbackAddr);

            for (const st of rows) {
              if (!st || typeof st !== 'object') continue;
              const orec = /** @type {Record<string, unknown>} */ (st);
              const sid = pickMongoId(st);
              if (!sid) continue;
              if (cardVenue) stageIdToParentVenue.set(String(sid).trim(), cardVenue);
              const rawA = orec.Address ?? orec.address;
              const own = rawA != null && String(rawA).trim() ? String(rawA).trim() : '';
              const useAddr = own || fallbackAddr;
              if (useAddr) stageIdToAddress.set(String(sid).trim(), useAddr);
            }
          } catch (e) {
            if (!(e instanceof GetbiletUpstreamError)) {
              console.error('[getbiletVenueLabels] place', pid, e instanceof Error ? e.message : e);
            }
          }
        }),
      );
    }
  } catch (e) {
    console.error('[getbiletVenueLabels] warm maps:', e instanceof Error ? e.message : e);
  }

  venueLookupCache = { at: now, byPlaceId, stageIdToParentVenue, stageIdToAddress, placeIdToAddress };
  return { byPlaceId, stageIdToParentVenue, stageIdToAddress, placeIdToAddress };
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

/** @deprecated используйте getVenueLookupMaps — оставлено для совместимости */
export async function resolveVenueLabelsForPlaceIds(placeIds) {
  const { byPlaceId } = await getVenueLookupMaps();
  const out = new Map();
  for (const id of placeIds) {
    const k = String(id || '').trim();
    if (k && byPlaceId.has(k)) out.set(k, byPlaceId.get(k));
  }
  return out;
}
