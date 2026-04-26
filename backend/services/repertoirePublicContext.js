/**
 * Публичный контекст мероприятия по repertoire id: медиа из кэша/getbilet_events и схема зала.
 */

import ticketPool from '../ticketDb.js';
import { classifyEventTitle } from './eventTitleHeuristics.js';
import { buildEventDescriptionPackResolved } from './eventDescriptionAi.js';
import { descPackFromStoredJson } from './eventDescriptionPackStored.js';
import { resolveHeroSublineVenueFocused } from './eventTitleNarrative.js';
import { extractParentVenueFromRow } from './getbiletVenueLabels.js';

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

/**
 * @param {string} repertoireId
 * @returns {Promise<{
 *   hasCatalogRow: boolean;
 *   title: string;
 *   venueFromPayload: string | null;
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
async function loadRepertoireBase(repertoireId) {
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
      stageId = row.stage_id || null;
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

  try {
    let er;
    try {
      er = await ticketPool.query(
        `SELECT id, title_manual, poster_url_manual, poster_url_web, banner_url_manual, description_manual, description_pack_json
         FROM getbilet_events WHERE getbilet_external_id = $1`,
        [repertoireId],
      );
    } catch (e) {
      if (e && typeof e === 'object' && 'code' in e && e.code === '42703') {
        er = await ticketPool.query(
          `SELECT id, title_manual, poster_url_manual, poster_url_web, banner_url_manual, description_manual
           FROM getbilet_events WHERE getbilet_external_id = $1`,
          [repertoireId],
        );
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

  const venueFlat = pickFirst(payload, ['PlaceName', 'placeName', 'Venue', 'venue', 'Place', 'place']);
  const venueNested = extractParentVenueFromRow(payload);
  const venueFromPayload =
    (venueFlat && String(venueFlat).trim()) || (venueNested && String(venueNested).trim()) || null;
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
  return {
    title: base.title,
    kind,
    categoryLabel,
    venueLabel: base.venueFromPayload,
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

  const { payload, stageId, title, venueFromPayload, descriptionFromPayload, genreFromPayload, catalogHints, descriptionManual, descriptionPackJson } =
    base;

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
      venueLabel: venueFromPayload,
      manualText: descriptionManual,
      catalogHints,
    });
  }

  const leadPlain =
    (descPack.heroLead != null && String(descPack.heroLead).trim()) ||
    '';
  const descriptionSnippet = leadPlain ? leadPlain.slice(0, 400) : null;

  const venueFromStageMap =
    stageMap && typeof stageMap.title === 'string' && stageMap.title.trim()
      ? stageMap.title.trim()
      : null;
  const venueResolved = venueFromPayload || venueFromStageMap || null;

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
    descriptionSnippet,
    heroKicker: descPack.heroKicker ?? null,
    heroSubline,
    heroLead: descPack.heroLead ?? null,
    eventMeta: Array.isArray(descPack.eventMeta) ? descPack.eventMeta : [],
    descriptionSections: descPack.sections,
    descriptionTotalChars: descPack.totalChars,
    posterUrl,
    bannerUrl,
    stageMap,
    externalPlanUrl,
  };
}
