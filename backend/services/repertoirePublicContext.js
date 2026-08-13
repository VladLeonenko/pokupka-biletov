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
import { isLuzhnikiFootballRepertoire } from '../utils/luzhnikiFootballRepertoires.js';
import {
  isLuzhnikiConcertRepertoire,
  LUZHNIKI_CONCERT_STAGE_MAP_KEY,
} from '../utils/luzhnikiConcertRepertoires.js';
import { isSupercupNnRepertoire } from '../utils/footballStadiumRepertoires.js';
import {
  adaptLuzhnikiStageMapForLiveOffers,
  loadLuzhnikiFootballStageMapRow,
  loadLuzhnikiStageMapRowByKey,
  LUZHNIKI_FOOTBALL_STAGE_MAP_KEY,
  shouldUseLuzhnikiFootballCanonicalMap,
} from './luzhnikiFootballStageMap.js';
import {
  adaptSupercupNnFootballStageMapForLiveOffers,
  loadSupercupNnFootballStageMapRow,
  slimSupercupNnStageMapForClient,
  SUPERKUP_NN_STAGE_MAP_KEY,
} from './supercupNnFootballStageMap.js';
import {
  loadVakhtangovMainStageMapRow,
  shouldUseVakhtangovMainStageCanonicalMap,
  VAKHTANGOV_MAIN_STAGE_MAP_KEY,
} from './vakhtangovMainStageMap.js';
import { slugify } from '../utils/eventSlug.js';
import {
  isFanIdRequiredForRepertoire,
  repertoireIdForTicketSlug,
} from '../utils/fanIdRequiredEvents.js';
import { isManualRepertoireKey } from '../utils/repertoireRouteKey.js';
import {
  assertRepertoireStorefrontAccess,
  getRepertoireStorefrontAccess,
  isBlockedRepertoireSlug,
} from './repertoireStorefrontAccess.js';
import {
  buildProgrammaticHeroLead,
  formatCatalogHintsSubline,
  kickerExtraFromTitle,
} from './eventTitleNarrative.js';

/** Основная сцена МХТ им. Чехова (GetBilet GetStageListByPlaceId). Старый id — алиас сида. */
const MHT_MAIN_STAGE_ID = process.env.MHT_STAGE_EXTERNAL_ID?.trim() || '603ad33813cd03003015d811';
const MHT_MAIN_STAGE_ID_ALIASES = new Set([
  MHT_MAIN_STAGE_ID,
  '603ad33813cd03003015d811',
  '639c4a4cd6cfc5004d20dcfb',
]);

function withShowSeatsAtOverview(row) {
  if (!row || typeof row !== 'object') return row;
  let layout = row.layout_json;
  if (typeof layout === 'string') {
    try {
      layout = JSON.parse(layout);
    } catch {
      layout = null;
    }
  }
  if (!layout || typeof layout !== 'object') {
    return { ...row, layout_json: { showSeatsAtOverview: true } };
  }
  return {
    ...row,
    layout_json: { ...layout, showSeatsAtOverview: true },
  };
}

function stageMapHasSvg(row) {
  return Boolean(row && String(row.svg_markup || '').trim());
}

/** @type {Map<string, { body: object, expiresAt: number }>} */
const fastContextMem = new Map();
const FAST_CTX_TTL_MS = parseInt(process.env.GETBILET_FAST_CONTEXT_CACHE_SEC || '120', 10) * 1000 || 120_000;

/** Сброс in-memory контекста /ticket после правок постера/описания в админке. */
export function invalidateRepertoirePublicContextCache(repertoireId) {
  const rid = String(repertoireId || '').trim();
  if (!rid) {
    fastContextMem.clear();
    return;
  }
  for (const key of fastContextMem.keys()) {
    if (key.startsWith(`${rid}|`)) fastContextMem.delete(key);
  }
}

function minimalDescriptionPack(title, manualText, catalogHints, kind, categoryLabel) {
  const t = String(title || '').trim() || 'Мероприятие';
  const manual = String(manualText || '').trim();
  const lead =
    manual.slice(0, 400) ||
    buildProgrammaticHeroLead(t, kind, categoryLabel) ||
    `Билеты на «${t}» — выбор мест и оплата онлайн.`;
  return {
    heroKicker: [categoryLabel, kickerExtraFromTitle(t)].filter(Boolean).join(' · ') || null,
    heroSubline: formatCatalogHintsSubline(catalogHints) || null,
    heroLead: lead,
    eventMeta: [],
    sections: [],
    totalChars: lead.length,
  };
}

/** @param {unknown} raw */
function parseCheckoutSettingsFromPack(raw) {
  if (!raw || typeof raw !== 'object') return { hideSeatList: false };
  const co = /** @type {Record<string, unknown>} */ (raw).checkout;
  if (!co || typeof co !== 'object') return { hideSeatList: false };
  return { hideSeatList: /** @type {Record<string, unknown>} */ (co).hideSeatList === true };
}

async function loadCachedOfferRows(repertoireId) {
  const rid = String(repertoireId || '').trim();
  if (!rid) return [];
  try {
    const r = await ticketPool.query(
      `SELECT payload_json FROM getbilet_repertoire_offers_cache WHERE repertoire_external_id = $1`,
      [rid],
    );
    const payload = r.rows[0]?.payload_json;
    const rows = payload?.ResultData;
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

async function hasLiveOffersInCache(repertoireId) {
  const rows = await loadCachedOfferRows(repertoireId);
  return rows.length > 0;
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
     WHERE stage_external_id = ANY($1::text[])
        OR (
          lower(coalesce(title, '')) LIKE '%мхт%'
          AND lower(coalesce(title, '')) LIKE '%чехов%'
        )
        OR (
          lower(coalesce(title, '')) LIKE '%мхат%'
          AND lower(coalesce(title, '')) LIKE '%чехов%'
        )
     ORDER BY
       CASE stage_external_id
         WHEN $2 THEN 0
         WHEN '639c4a4cd6cfc5004d20dcfb' THEN 1
         ELSE 2
       END,
       id ASC
     LIMIT 1`,
    [[...MHT_MAIN_STAGE_ID_ALIASES], MHT_MAIN_STAGE_ID],
  );
  return r.rows[0] || null;
}

function isMhtChekhovMainStageId(stageId) {
  const sid = String(stageId || '').trim();
  return Boolean(sid && MHT_MAIN_STAGE_ID_ALIASES.has(sid));
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
/**
 * @param {string} repertoireId
 * @param {{ omitStageSvgMarkup?: boolean; fastPath?: boolean; includeDescriptionSections?: boolean; skipCache?: boolean }} [opts]
 */
export async function getRepertoirePublicContext(repertoireId, opts = {}) {
  await assertRepertoireStorefrontAccess(repertoireId);

  const fastPath = opts.fastPath !== false;
  const includeSections = opts.includeDescriptionSections === true;
  const skipCache = opts.skipCache === true;
  const cacheKey = `${repertoireId}|svg:${opts.omitStageSvgMarkup ? 1 : 0}|sec:${includeSections ? 1 : 0}`;
  if (fastPath && !skipCache) {
    const hit = fastContextMem.get(cacheKey);
    if (hit && Date.now() < hit.expiresAt) {
      return hit.body;
    }
  }

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

  const posterManualTrim =
    base.posterManual != null && String(base.posterManual).trim() ? String(base.posterManual).trim() : '';
  const bannerManualTrim =
    base.bannerManual != null && String(base.bannerManual).trim() ? String(base.bannerManual).trim() : '';

  const posterUrl =
    posterManualTrim ||
    expandMediaTemplate(posterTpl, repertoireId) ||
    imageFromPayload ||
    posterWebTrim ||
    null;

  /** Без ручного баннера не подставляем шаблон, если есть стабильный постер. */
  const bannerUrl =
    bannerManualTrim ||
    (posterManualTrim && !bannerManualTrim ? posterManualTrim : null) ||
    (posterWebTrim && !bannerManualTrim && !posterManualTrim ? posterWebTrim : null) ||
    (!posterManualTrim && !posterWebTrim ? expandMediaTemplate(bannerTpl, repertoireId) : null) ||
    bannerFromPayload ||
    null;

  const deferStageHeavyFields = opts.omitStageSvgMarkup === true;
  let stageMap = null;
  if (stageId) {
    try {
      const cols = deferStageHeavyFields
        ? 'stage_external_id, place_external_id, title, external_plan_url'
        : 'stage_external_id, place_external_id, title, svg_markup, layout_json, external_plan_url';
      const lookupIds = isMhtChekhovMainStageId(stageId)
        ? [...MHT_MAIN_STAGE_ID_ALIASES]
        : [stageId];
      const mr = await ticketPool.query(
        `SELECT ${cols} FROM getbilet_stage_maps
         WHERE stage_external_id = ANY($1::text[])
         ORDER BY CASE stage_external_id WHEN $2 THEN 0 ELSE 1 END, id ASC
         LIMIT 1`,
        [lookupIds, stageId],
      );
      if (mr.rows[0]) {
        stageMap = deferStageHeavyFields
          ? { ...mr.rows[0], svg_markup: null, layout_json: null, svg_markup_deferred: true }
          : mr.rows[0];
      }
    } catch {
      /* нет таблицы карт */
    }
  }

  const manualVenue =
    base.venueManual != null && String(base.venueManual).trim() ? String(base.venueManual).trim() : null;
  const manualAddress =
    base.venueAddressManual != null && String(base.venueAddressManual).trim()
      ? String(base.venueAddressManual).trim()
      : null;
  let placeFromMaps = { venue: null, address: null };
  if (!fastPath) {
    placeFromMaps = await resolvePlaceFromGetbiletMaps(payload, stageId);
  }

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
    if (isLuzhnikiConcertRepertoire(repertoireId)) {
      if (deferStageHeavyFields) {
        const peek = await loadLuzhnikiStageMapRowByKey(LUZHNIKI_CONCERT_STAGE_MAP_KEY);
        if (peek?.svg_markup) {
          stageMap = {
            stage_external_id: LUZHNIKI_CONCERT_STAGE_MAP_KEY,
            title: peek.title || 'Лужники — концерт',
            svg_markup: null,
            layout_json: null,
            svg_markup_deferred: true,
          };
        }
      } else {
        const row = await loadLuzhnikiStageMapRowByKey(LUZHNIKI_CONCERT_STAGE_MAP_KEY);
        if (row) stageMap = adaptLuzhnikiStageMapForLiveOffers(row);
      }
    } else if (
      isLuzhnikiFootballRepertoire(repertoireId) ||
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
      if (deferStageHeavyFields) {
        const lzPeek = await loadLuzhnikiFootballStageMapRow();
        if (lzPeek?.svg_markup) {
          stageMap = {
            stage_external_id: LUZHNIKI_FOOTBALL_STAGE_MAP_KEY,
            title: lzPeek.title || 'Стадион «Лужники»',
            svg_markup: null,
            layout_json: null,
            svg_markup_deferred: true,
          };
        }
      } else {
        const lzRow = await loadLuzhnikiFootballStageMapRow();
        if (lzRow) {
          stageMap = adaptLuzhnikiStageMapForLiveOffers(lzRow);
        }
      }
    }
  } catch {
    /* таблицы схем может не быть */
  }

  try {
    if (isSupercupNnRepertoire(repertoireId)) {
      if (deferStageHeavyFields) {
        const peek = await loadSupercupNnFootballStageMapRow();
        if (peek?.svg_markup) {
          stageMap = {
            stage_external_id: SUPERKUP_NN_STAGE_MAP_KEY,
            title: peek.title || 'Совкомбанк Арена',
            svg_markup: null,
            layout_json: null,
            svg_markup_deferred: true,
          };
        }
      } else {
        const row = await loadSupercupNnFootballStageMapRow();
        if (row) {
          stageMap = slimSupercupNnStageMapForClient(adaptSupercupNnFootballStageMapForLiveOffers(row));
        }
      }
    }
  } catch {
    /* таблицы схем может не быть */
  }

  try {
    if (
      shouldUseVakhtangovMainStageCanonicalMap(
        {
          title,
          repertoireId,
          stageId,
          venueManual: manualVenue,
          venueFromPayload,
          hall: stageHallLabel,
        },
        placeFromMaps.venue,
        stageHallLabel,
      )
    ) {
      if (deferStageHeavyFields) {
        const peek = await loadVakhtangovMainStageMapRow();
        if (peek?.svg_markup) {
          stageMap = {
            stage_external_id: VAKHTANGOV_MAIN_STAGE_MAP_KEY,
            title: peek.title || 'Театр им. Вахтангова',
            svg_markup: null,
            layout_json: null,
            svg_markup_deferred: true,
          };
        }
      } else {
        const row = await loadVakhtangovMainStageMapRow();
        if (row) stageMap = withShowSeatsAtOverview(row);
      }
    }
  } catch {
    /* таблицы схем может не быть */
  }

  const mhtVenueHint =
    isMhtChekhovMainStageId(stageId) ||
    looksLikeMhtChekhovVenue(
      manualVenue,
      venueFromPayload,
      placeFromMaps.venue,
      title,
      pickFirst(payload, ['StageName', 'stageName', 'HallName', 'hallName', 'PlaceName', 'placeName']),
    );
  const stageMapSvgMissing = !stageMap || (!deferStageHeavyFields && !stageMapHasSvg(stageMap));
  if (!deferStageHeavyFields && mhtVenueHint && stageMapSvgMissing) {
    try {
      const mhtRow = await loadMhtChekhovStageMapFallback();
      if (stageMapHasSvg(mhtRow)) stageMap = mhtRow;
    } catch {
      /* таблицы схем может не быть */
    }
  }
  const addressFromMaps = placeFromMaps.address;
  const venueForRichText = venueFromCatalogOrMaps || null;
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
    if (fastPath) {
      descPack = minimalDescriptionPack(title, descriptionManual, catalogHints, kind, categoryLabel);
    } else {
      descPack = await buildEventDescriptionPackResolved({
        title,
        kind,
        categoryLabel,
        venueLabel: venueForRichText,
        manualText: descriptionManual,
        catalogHints,
      });
    }
  } else if (fastPath && !includeSections) {
    descPack = {
      ...descPack,
      sections: [],
    };
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

  const omitSvg = opts.omitStageSvgMarkup === true;
  const stageMapForClient =
    omitSvg && stageMap && stageMap.svg_markup
      ? { ...stageMap, svg_markup: null, svg_markup_deferred: true }
      : stageMap;

  const checkoutFromPack = parseCheckoutSettingsFromPack(descriptionPackJson);

  const beginDateTime =
    pickFirst(payload, ['EventDateTime', 'beginDateTime', 'startDateTime', 'eventDateTime']) || null;

  const body = {
    repertoireId,
    stageId,
    title,
    venueLabel: venueResolved ?? null,
    venueAddress: addressForUi,
    beginDateTime,
    descriptionSnippet,
    heroKicker: descPack.heroKicker ?? null,
    heroSubline,
    heroLead: descPack.heroLead ?? null,
    eventMeta: [],
    descriptionSections: includeSections ? descPack.sections : [],
    descriptionTotalChars: includeSections ? descPack.totalChars : (descPack.heroLead?.length ?? 0),
    posterUrl,
    bannerUrl,
    checkoutHideSeatList: checkoutFromPack.hideSeatList === true,
    stageMap: stageMapForClient,
    externalPlanUrl,
    requiresFanId: isFanIdRequiredForRepertoire(repertoireId),
  };

  if (fastPath && FAST_CTX_TTL_MS > 0) {
    fastContextMem.set(cacheKey, { body, expiresAt: Date.now() + FAST_CTX_TTL_MS });
  }

  return body;
}

/** Полные секции «О событии» — отдельным запросом после shell. */
export async function getRepertoireDescriptionSections(repertoireId) {
  const base = await loadRepertoireBase(repertoireId);
  const { title, descriptionManual, descriptionPackJson, genreFromPayload, catalogHints } = base;
  const venueFromPayload = extractParentVenueFromRow(base.payload) ?? null;
  const { kind, categoryLabel } = classifyEventTitle(title, {
    subtitle: descriptionManual || '',
    genre: genreFromPayload || '',
  });
  let descPack = descPackFromStoredJson(descriptionPackJson);
  if (!descPack) {
    descPack = await buildEventDescriptionPackResolved({
      title,
      kind,
      categoryLabel,
      venueLabel: venueFromPayload,
      manualText: descriptionManual,
      catalogHints,
    });
  }
  return {
    sections: descPack.sections ?? [],
    totalChars: descPack.totalChars ?? 0,
  };
}

/**
 * @param {string} repertoireId
 */
export async function buildResolveHitFromRepertoireId(repertoireId) {
  const access = await getRepertoireStorefrontAccess(repertoireId);
  if (!access.allowed) return null;
  const base = await loadRepertoireBase(repertoireId);
  const title =
    (base.titleManual && String(base.titleManual).trim()) ||
    pickFirst(base.payload, ['Name', 'name', 'actionName', 'title']) ||
    repertoireId;
  return {
    repertoireId,
    title,
    stageId: base.stageId,
    posterUrl:
      (base.posterManual && String(base.posterManual).trim()) ||
      (base.posterWeb && String(base.posterWeb).trim()) ||
      null,
    bannerUrl: (base.bannerManual && String(base.bannerManual).trim()) || null,
    beginDateTime: pickFirst(base.payload, ['EventDateTime', 'beginDateTime', 'startDateTime']),
  };
}

/**
 * ЧПУ или manual-key → repertoireId для /ticket/:slug.
 * @param {string} slug
 * @param {Record<string, unknown>[]} catalogCompact — из compactActions
 */
export async function resolveRepertoireSlug(slug, catalogCompact = []) {
  const target = String(slug || '').trim().toLowerCase();
  if (!target) return null;
  if (isBlockedRepertoireSlug(target)) return null;

  const aliasRep = repertoireIdForTicketSlug(target);
  if (aliasRep) {
    const aliasHit = await buildResolveHitFromRepertoireId(aliasRep);
    if (aliasHit) return aliasHit;
  }

  /** Только если slug совпадает с реальным manual repertoire id (seed), не с ЧПУ из названия. */
  if (isManualRepertoireKey(target)) {
    try {
      const base = await loadRepertoireBase(target);
      if (base.hasCatalogRow || base.eventRowId != null) {
        const access = await getRepertoireStorefrontAccess(target);
        if (!access.allowed) return null;
        const title =
          (base.titleManual && String(base.titleManual).trim()) ||
          pickFirst(base.payload, ['Name', 'name', 'actionName', 'title']) ||
          target;
        return {
          repertoireId: target,
          title,
          stageId: base.stageId,
          posterUrl:
            (base.posterManual && String(base.posterManual).trim()) ||
            (base.posterWeb && String(base.posterWeb).trim()) ||
            null,
          bannerUrl: (base.bannerManual && String(base.bannerManual).trim()) || null,
          beginDateTime: pickFirst(base.payload, ['EventDateTime', 'beginDateTime', 'startDateTime']),
        };
      }
    } catch {
      /* нет каталога */
    }
  }

  const matches = catalogCompact.filter((item) => {
    if (!item) return false;
    const title = String(item.title || '');
    if (slugify(title) === target) return true;
    const rep = String(item.repertoireId || '').trim();
    if (rep && rep.toLowerCase() === target) return true;
    const cardId = String(item.id || '').trim();
    if (cardId && cardId.toLowerCase() === target) return true;
    return false;
  });
  if (matches.length === 0) return null;
  let hit = matches[0];
  if (matches.length > 1) {
    const now = Date.now();
    const sorted = [...matches].sort((a, b) => {
      const ta = Date.parse(String(a.startDateTime || a.beginDateTime || ''));
      const tb = Date.parse(String(b.startDateTime || b.beginDateTime || ''));
      return (Number.isFinite(ta) ? ta : 0) - (Number.isFinite(tb) ? tb : 0);
    });
    hit = sorted.find((ev) => {
      const t = Date.parse(String(ev.startDateTime || ev.beginDateTime || ''));
      return Number.isFinite(t) && t >= now;
    }) || sorted[0];
  }
  const resolvedRepId = String(hit.repertoireId || hit.id || '').trim();
  const access = await getRepertoireStorefrontAccess(resolvedRepId);
  if (!access.allowed) return null;
  return {
    repertoireId: resolvedRepId,
    title: hit.title,
    stageId: hit.stageId || null,
    posterUrl: hit.posterUrl || null,
    bannerUrl: hit.bannerUrl || null,
    beginDateTime: hit.beginDateTime || hit.startDateTime || null,
  };
}
