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
 * Подсказка площадки из скобок в названии (гастроли, «… (театр …)»), если GetBilet не отдал PlaceName.
 * @param {string | null | undefined} title
 * @returns {string | null}
 */
export function hintVenueFromTitle(title) {
  if (!title || typeof title !== 'string' || !title.trim()) return null;
  const matches = [...title.matchAll(/\(([^)]+)\)/g)];
  if (matches.length === 0) return null;
  for (let i = matches.length - 1; i >= 0; i--) {
    const inner = (matches[i][1] ?? '').trim();
    if (!inner || inner.length < 4) continue;
    if (/^\d{1,2}\s*\+$/.test(inner.replace(/\s/g, ''))) continue;
    if (
      /гастрол|театр|арен[аы]|стадио|филармон|кремл|цирк|двор|зал[ае]?[мя]?|площад|музей|опер/i.test(
        inner,
      )
    ) {
      return inner;
    }
  }
  return null;
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

/** @type {{ at: number; byPlaceId: Map<string, string>; stageIdToParentVenue: Map<string, string> } | null} */
let venueLookupCache = null;
const VENUE_LOOKUP_TTL_MS = 45 * 60 * 1000;

/**
 * Один проход: GetPlaceList + GetStageListByPlaceId.
 * placeId → имя из списка площадок (театр/стадион), иначе первый Name в списке сцен.
 * Каждая сцена → то же родительское имя (не «Малая сцена» / «Стадион» как отдельная сущность).
 * @returns {Promise<{ byPlaceId: Map<string, string>; stageIdToParentVenue: Map<string, string> }>}
 */
export async function getVenueLookupMaps() {
  const now = Date.now();
  if (
    venueLookupCache &&
    now - venueLookupCache.at < VENUE_LOOKUP_TTL &&
    (venueLookupCache.byPlaceId.size > 0 || venueLookupCache.stageIdToParentVenue.size > 0)
  ) {
    return {
      byPlaceId: venueLookupCache.byPlaceId,
      stageIdToParentVenue: venueLookupCache.stageIdToParentVenue,
    };
  }

  const placeListNames = await loadPlaceIdToNameFromPlaceList();
  /** Все имена из GetPlaceList — иначе byPlaceId заполнялся только для первых N площадок в цикле по сценам. */
  const byPlaceId = new Map(placeListNames);
  const stageIdToParentVenue = new Map();

  try {
    const placesData = await restV2GetPlaceList();
    const placeRows = Array.isArray(placesData.ResultData) ? placesData.ResultData : [];
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

            for (const st of rows) {
              if (!st || typeof st !== 'object') continue;
              const sid = pickMongoId(st);
              if (sid && cardVenue) stageIdToParentVenue.set(String(sid).trim(), cardVenue);
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

  venueLookupCache = { at: now, byPlaceId, stageIdToParentVenue };
  return { byPlaceId, stageIdToParentVenue };
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
