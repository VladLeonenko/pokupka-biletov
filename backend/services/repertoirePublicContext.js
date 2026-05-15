/**
 * Публичный контекст мероприятия по repertoire id: медиа из кэша/getbilet_events и схема зала.
 */

import ticketPool from '../ticketDb.js';
import { classifyEventTitle } from './eventTitleHeuristics.js';
import { buildEventDescriptionPackResolved } from './eventDescriptionAi.js';
import { descPackFromStoredJson } from './eventDescriptionPackStored.js';
import { resolveHeroSublineVenueFocused } from './eventTitleNarrative.js';
import {
  extractAddressFromRow,
  extractParentVenueFromRow,
  getVenueLookupMaps,
  pickPlaceId,
} from './getbiletVenueLabels.js';
import {
  adaptLuzhnikiStageMapForLiveOffers,
  loadLuzhnikiFootballStageMapRow,
  shouldUseLuzhnikiFootballCanonicalMap,
} from './luzhnikiFootballStageMap.js';

const MHT_MAIN_STAGE_ID = process.env.MHT_STAGE_EXTERNAL_ID?.trim() || '639c4a4cd6cfc5004d20dcfb';

async function hasLiveOffersInCache(repertoireId) {
  const rid = String(repertoireId || '').trim();
  if (!rid) return false;
  try {
    const r = await ticketPool.query(
      `SELECT payload_json FROM getbilet_repertoire_offers_cache WHERE repertoire_external_id = $1`,
      [rid],
    );
    const payload = r.rows[0]?.payload_json;
    const rows = payload?.ResultData;
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

function expandMediaTemplate(template, repertoireId) {
  if (!template?.trim()) return null;
  return template
    .replaceAll('{repertoireId}', repertoireId)
    .replaceAll('{id}', repertoireId);
}

function pickFirst(obj, keys) {
  if (!obj || typeof obj !== 'object') return null;
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

/** Только строка/число — иначе «Venue»-объект стал бы "[object Object]" и ломал извлечение площадки. */
function pickStringField(obj, keys) {
  if (!obj || typeof obj !== 'object') return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return null;
}

/**
 * GetPlaceList + GetStageListByPlaceId: подпись площадки и адрес (как в enrich каталога).
 * @param {Record<string, unknown>} payload
 * @param {string | null} stageId
 * @returns {Promise<{ venue: string | null; address: string | null }>}
 */
export async function resolvePlaceFromGetbiletMaps(payload, stageId) {
  try {
    const { byPlaceId, stageIdToParentVenue, stageIdToAddress, placeIdToAddress } = await getVenueLookupMaps();
    const sid = String(stageId || '').trim();
    const pid = pickPlaceId(payload);
    let venue = null;
    let address = null;
    if (sid && stageIdToParentVenue.has(sid)) venue = stageIdToParentVenue.get(sid) || null;
    if (!venue && pid && byPlaceId.has(pid)) venue = byPlaceId.get(pid) || null;
    if (sid && stageIdToAddress.has(sid)) address = stageIdToAddress.get(sid) || null;
    if (!address && pid && placeIdToAddress.has(pid)) address = placeIdToAddress.get(pid) || null;
    return { venue, address };
  } catch (e) {
    console.error('[repertoirePublicContext] resolvePlaceFromGetbiletMaps:', e instanceof Error ? e.message : e);
  }
  return { venue: null, address: null };
}

function looksUsefulMetaVenue(value) {
  const s = value != null ? String(value).trim() : '';
  if (!s) return '';
  if (/уточняйте/i.test(s)) return '';
  return s;
}

function pickVenueFromMeta(rows) {
  if (!Array.isArray(rows)) return null;
  const preferred = [/площад/i, /мест/i, /театр/i, /арен/i, /стадион/i];
  for (const rx of preferred) {
    const hit = rows.find((r) => r && typeof r === 'object' && rx.test(String(r.label ?? '')));
    const v = looksUsefulMetaVenue(hit?.value);
    if (v) return v;
  }
  return null;
}

function normVenueText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/Ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function looksLikeMhtChekhovVenue(...values) {
  const text = normVenueText(values.filter(Boolean).join(' '));
  if (!text) return false;
  const hasChekhov = text.includes('чехов') || text.includes('chekhov') || text.includes('chehov');
  const hasMht = text.includes('мхт') || text.includes('мхат') || text.includes('mxat');
  const hasArtTheatre = text.includes('художественн') && text.includes('театр');
  if (hasMht && !text.includes('горьк')) return true;
  return hasChekhov && (hasMht || hasArtTheatre);
}

async function loadMhtChekhovStageMapFallback() {
  const r = await ticketPool.query(
    `SELECT stage_external_id, place_external_id, title, svg_markup, layout_json, external_plan_url
     FROM getbilet_stage_maps
     WHERE stage_external_id = $1
        OR (
          lower(coalesce(title, '')) LIKE '%мхт%'
          AND lower(coalesce(title, '')) LIKE '%чехов%'
        )
        OR (
          lower(coalesce(title, '')) LIKE '%мхат%'
          AND lower(coalesce(title, '')) LIKE '%чехов%'
        )
     ORDER BY (stage_external_id = $1) DESC, id ASC
     LIMIT 1`,
    [MHT_MAIN_STAGE_ID],
  );
  return r.rows[0] || null;
}

/**
 * @param {string} repertoireId
 * @returns {Promise<{
 *   hasCatalogRow: boolean;
 *   title: string;
 *   venueFromPayload: string | null;
 *   addressFromPayload: string | null;
 *   descriptionFromPayload: string | null;
 *   genreFromPayload: string | null;
 *   catalogHints: { ageLimit: string | null; cityName: string | null; beginSample: string | null };
 *   descriptionManual: string | null;
 *   descriptionPackJson: unknown;
 *   eventRowId: number | null;
 *   stageId: string | null;
 *   payload: Record<string, unknown>;
 *   titleManual: string | null;
 *   posterManual: string | null;
 *   posterWeb: string | null;
 *   bannerManual: string | null;
 * }>}
 */
export async function loadRepertoireBase(repertoireId) {
  let stageId = null;
  /** @type {Record<string, unknown>} */
  let payload = {};
  let hasCatalogRow = false;

  try {
    const r = await ticketPool.query(
      `SELECT stage_id, payload_json FROM getbilet_catalog_cache WHERE repertoire_external_id = $1`,
      [repertoireId],
    );
    const row = r.rows[0];
    if (row) {
      hasCatalogRow = true;
      stageId = row.stage_id != null && String(row.stage_id).trim() ? String(row.stage_id).trim() : null;
      const p = row.payload_json;
      if (p && typeof p === 'object' && !Array.isArray(p)) payload = /** @type {Record<string, unknown>} */ (p);
    }
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && e.code === '42P01') {
      throw Object.assign(new Error('getbilet_catalog_cache missing'), { code: '42P01' });
    }
    throw e;
  }

  let titleManual = null;
  let posterManual = null;
  let posterWeb = null;
  let bannerManual = null;
  let descriptionManual = null;
  /** @type {unknown} */
  let descriptionPackJson = null;
  /** @type {number | null} */
  let eventRowId = null;

  /** @type {string | null} */
  let venueManual = null;
  /** @type {string | null} */
  let venueAddressManual = null;

  try {
    let er;
    try {
      er = await ticketPool.query(
        `SELECT id, title_manual, poster_url_manual, poster_url_web, banner_url_manual, description_manual, description_pack_json,
                venue_manual, venue_address_manual
         FROM getbilet_events WHERE getbilet_external_id = $1`,
        [repertoireId],
      );
    } catch (e) {
      if (e && typeof e === 'object' && 'code' in e && e.code === '42703') {
        try {
          er = await ticketPool.query(
            `SELECT id, title_manual, poster_url_manual, poster_url_web, banner_url_manual, description_manual, description_pack_json
             FROM getbilet_events WHERE getbilet_external_id = $1`,
            [repertoireId],
          );
        } catch (e2) {
          if (e2 && typeof e2 === 'object' && 'code' in e2 && e2.code === '42703') {
            er = await ticketPool.query(
              `SELECT id, title_manual, poster_url_manual, poster_url_web, banner_url_manual, description_manual
               FROM getbilet_events WHERE getbilet_external_id = $1`,
              [repertoireId],
            );
          } else {
            throw e2;
          }
        }
      } else {
        throw e;
      }
    }
    if (er.rows[0]) {
      eventRowId = Number(er.rows[0].id);
      titleManual = er.rows[0].title_manual;
      posterManual = er.rows[0].poster_url_manual;
      posterWeb = er.rows[0].poster_url_web;
      bannerManual = er.rows[0].banner_url_manual;
      descriptionManual = er.rows[0].description_manual;
      if ('description_pack_json' in er.rows[0]) {
        descriptionPackJson = er.rows[0].description_pack_json;
      }
      if ('venue_manual' in er.rows[0] && er.rows[0].venue_manual != null && String(er.rows[0].venue_manual).trim()) {
        venueManual = String(er.rows[0].venue_manual).trim();
      }
      if (
        'venue_address_manual' in er.rows[0] &&
        er.rows[0].venue_address_manual != null &&
        String(er.rows[0].venue_address_manual).trim()
      ) {
        venueAddressManual = String(er.rows[0].venue_address_manual).trim();
      }
    }
  } catch {
    /* нет ticket-схемы */
  }

  const payloadName =
    typeof payload.Name === 'string'
      ? payload.Name.trim()
      : typeof payload.name === 'string'
        ? payload.name.trim()
        : '';

  const title = (titleManual && String(titleManual).trim()) || payloadName || '';

  if (!stageId) {
    const sid = pickStringField(payload, ['stageId', 'StageId', 'stageID', 'StageID']);
    if (sid) stageId = String(sid).trim();
  }

  const fromStrings = pickStringField(payload, [
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
  ]);
  const venueNested = extractParentVenueFromRow(payload);
  const venueFromPayload = fromStrings || (venueNested && String(venueNested).trim()) || null;
  const addrFlat = extractAddressFromRow(payload);
  const addressFromPayload = addrFlat || null;
  const descriptionFromPayload = pickFirst(payload, [
    'Description',
    'description',
    'ShortDescription',
    'shortDescription',
    'SubjectDescription',
    'subjectDescription',
    'LongDescription',
    'longDescription',
  ]);
  const genreFromPayload = pickFirst(payload, [
    'GenreName',
    'genreName',
    'Genre',
    'genre',
    'CategoryName',
    'categoryName',
    'Category',
    'category',
  ]);
  const catalogHints = {
    ageLimit: pickFirst(payload, ['Age', 'age', 'AgeLimit', 'ageLimit', 'Restriction']),
    cityName: pickFirst(payload, ['CityName', 'cityName', 'City', 'city']),
    beginSample: pickFirst(payload, [
      'BeginDateTime',
      'beginDateTime',
      'StartDateTime',
      'startDateTime',
      'EventDateTime',
      'eventDateTime',
    ]),
  };

  return {
    hasCatalogRow,
    title,
    venueFromPayload,
    addressFromPayload,
    descriptionFromPayload,
    genreFromPayload,
    catalogHints,
    descriptionManual: descriptionManual != null ? String(descriptionManual) : null,
    descriptionPackJson,
    eventRowId: Number.isFinite(eventRowId) ? eventRowId : null,
    stageId,
    payload,
    titleManual,
    posterManual,
    posterWeb,
    bannerManual,
    venueManual,
    venueAddressManual,
  };
}

/**
 * Входы для OpenAI и скрипта backfill (есть строка getbilet_events и каталог).
 * @param {string} repertoireId
 */
export async function getRepertoireBackfillDescriptionInputs(repertoireId) {
  const base = await loadRepertoireBase(repertoireId);
  if (!base.hasCatalogRow) return null;
  const { kind, categoryLabel } = classifyEventTitle(base.title, {
    subtitle: base.descriptionFromPayload || '',
    genre: base.genreFromPayload || '',
  });
  const manualVenue =
    base.venueManual != null && String(base.venueManual).trim() ? String(base.venueManual).trim() : null;
  return {
    title: base.title,
    kind,
    categoryLabel,
    venueLabel: manualVenue || base.venueFromPayload,
    manualHint: base.descriptionManual != null ? String(base.descriptionManual).trim() || null : null,
    catalogHints: base.catalogHints,
    eventRowId: base.eventRowId,
    existingStoredPack: base.descriptionPackJson,
  };
}

/**
 * @param {string} repertoireId
 * @returns {Promise<{
 *   repertoireId: string;
 *   stageId: string | null;
 *   title: string;
 *   descriptionSnippet: string | null;
 *   heroKicker: string | null;
 *   heroSubline: string | null;
 *   heroLead: string | null;
 *   eventMeta: { label: string; value: string }[];
 *   descriptionSections: { id: string; title: string; paragraphs: string[] }[];
 *   posterUrl: string | null;
 *   bannerUrl: string | null;
 *   stageMap: null | {
 *     stage_external_id: string;
 *     place_external_id: string | null;
 *     title: string | null;
 *     svg_markup: string | null;
 *     layout_json: unknown;
 *   };
 * }>}
 */
export async function getRepertoirePublicContext(repertoireId) {
  const base = await loadRepertoireBase(repertoireId);

  const {
    payload,
    stageId,
    title,
    venueFromPayload,
    addressFromPayload,
    descriptionFromPayload,
    genreFromPayload,
    catalogHints,
    descriptionManual,
    descriptionPackJson,
  } = base;

  const imageFromPayload = pickFirst(payload, ['ImageUrl', 'imageUrl', 'Image', 'PosterUrl', 'posterUrl']);
  const bannerFromPayload = pickFirst(payload, ['BannerUrl', 'bannerUrl']);

  const posterTpl = process.env.GETBILET_POSTER_URL_TEMPLATE?.trim();
  const bannerTpl = process.env.GETBILET_BANNER_URL_TEMPLATE?.trim();

  const posterWebTrim = base.posterWeb != null && String(base.posterWeb).trim() ? String(base.posterWeb).trim() : '';

  const posterUrl =
    (base.posterManual && String(base.posterManual).trim()) ||
    expandMediaTemplate(posterTpl, repertoireId) ||
    imageFromPayload ||
    posterWebTrim ||
    null;

  const bannerUrl =
    (base.bannerManual && String(base.bannerManual).trim()) ||
    expandMediaTemplate(bannerTpl, repertoireId) ||
    bannerFromPayload ||
    null;

  let stageMap = null;
  if (stageId) {
    try {
      const mr = await ticketPool.query(
        `SELECT stage_external_id, place_external_id, title, svg_markup, layout_json, external_plan_url
         FROM getbilet_stage_maps WHERE stage_external_id = $1`,
        [stageId],
      );
      if (mr.rows[0]) stageMap = mr.rows[0];
    } catch {
      /* нет таблицы карт */
    }
  }

  const venueFromStageMap =
    stageMap && typeof stageMap.title === 'string' && stageMap.title.trim()
      ? stageMap.title.trim()
      : null;

  const placeFromMaps = await resolvePlaceFromGetbiletMaps(payload, stageId);
  const manualVenue =
    base.venueManual != null && String(base.venueManual).trim() ? String(base.venueManual).trim() : null;
  const manualAddress =
    base.venueAddressManual != null && String(base.venueAddressManual).trim()
      ? String(base.venueAddressManual).trim()
      : null;
  let venueFromCatalogOrMaps = venueFromPayload || placeFromMaps.venue;
  if (manualVenue) venueFromCatalogOrMaps = manualVenue;

  const stageHallLabel = pickFirst(payload, [
    'StageName',
    'stageName',
    'HallName',
    'hallName',
    'PlaceName',
    'placeName',
  ]);

  try {
    if (
      shouldUseLuzhnikiFootballCanonicalMap(
        {
          title,
          descriptionFromPayload,
          genreFromPayload,
          venueManual: manualVenue,
          venueFromPayload,
        },
        placeFromMaps.venue,
        stageHallLabel,
      )
    ) {
      const lzRow = await loadLuzhnikiFootballStageMapRow();
      if (lzRow) {
        stageMap = (await hasLiveOffersInCache(repertoireId))
          ? adaptLuzhnikiStageMapForLiveOffers(lzRow)
          : lzRow;
      }
    }
  } catch {
    /* таблицы схем может не быть */
  }

  if (
    !stageMap &&
    looksLikeMhtChekhovVenue(
      manualVenue,
      venueFromPayload,
      placeFromMaps.venue,
      title,
      pickFirst(payload, ['StageName', 'stageName', 'HallName', 'hallName', 'PlaceName', 'placeName']),
    )
  ) {
    try {
      stageMap = await loadMhtChekhovStageMapFallback();
    } catch {
      /* таблицы схем может не быть */
    }
  }
  const venueFromFallbackStageMap =
    stageMap && typeof stageMap.title === 'string' && stageMap.title.trim()
      ? stageMap.title.trim()
      : null;
  if (!venueFromCatalogOrMaps && venueFromFallbackStageMap) {
    venueFromCatalogOrMaps = venueFromFallbackStageMap;
  }
  const addressFromMaps = placeFromMaps.address;
  const venueForRichText = venueFromCatalogOrMaps || venueFromStageMap || null;
  const addressForUi =
    manualAddress ||
    (addressFromPayload && String(addressFromPayload).trim()) ||
    (addressFromMaps && String(addressFromMaps).trim()) ||
    null;

  const { kind, categoryLabel } = classifyEventTitle(title, {
    subtitle: descriptionFromPayload || '',
    genre: genreFromPayload || '',
  });

  let descPack = descPackFromStoredJson(descriptionPackJson);
  if (!descPack) {
    descPack = await buildEventDescriptionPackResolved({
      title,
      kind,
      categoryLabel,
      venueLabel: venueForRichText,
      manualText: descriptionManual,
      catalogHints,
    });
  }

  const leadPlain =
    (descPack.heroLead != null && String(descPack.heroLead).trim()) ||
    '';
  const descriptionSnippet = leadPlain ? leadPlain.slice(0, 400) : null;

  const venueFromMeta = pickVenueFromMeta(descPack.eventMeta);
  const venueResolved = venueForRichText || venueFromMeta || null;

  const heroSubline = resolveHeroSublineVenueFocused(
    descPack.heroSubline ?? null,
    catalogHints,
    venueResolved,
  );

  const externalPlanUrl =
    stageMap && typeof stageMap.external_plan_url === 'string' && stageMap.external_plan_url.trim()
      ? stageMap.external_plan_url.trim()
      : null;

  return {
    repertoireId,
    stageId,
    title,
    /** Площадка: каталог, вложенные поля, либо подпись схемы зала из админки. */
    venueLabel: venueResolved ?? null,
    /** Адрес площадки (GetStageListByPlaceId / GetPlaceList / payload). */
    venueAddress: addressForUi,
    descriptionSnippet,
    heroKicker: descPack.heroKicker ?? null,
    heroSubline,
    heroLead: descPack.heroLead ?? null,
    // Метаданные не выводим отдельной плашкой: важное (площадка) уже попадает в hero.
    eventMeta: [],
    descriptionSections: descPack.sections,
    descriptionTotalChars: descPack.totalChars,
    posterUrl,
    bannerUrl,
    stageMap,
    externalPlanUrl,
  };
}
