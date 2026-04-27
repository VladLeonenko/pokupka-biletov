/**
 * Обогащение каталога rest_v2: категории, ручные медиа из ticket DB, шаблоны URL из env.
 */

import ticketPool from '../ticketDb.js';
import { restV2GetCategoryList } from './getbiletRestV2.js';
import { classifyEventTitle } from './eventTitleHeuristics.js';
import {
  extractParentVenueFromRow,
  getVenueLookupMaps,
  pickPlaceId,
} from './getbiletVenueLabels.js';
import { descPackFromStoredJson } from './eventDescriptionPackStored.js';

/** @type {{ at: number, map: Map<string, string> }} */
let categoryCache = { at: 0, map: new Map() };
const CAT_TTL_MS = 60 * 60 * 1000;

async function getCategoryIdToNameMap() {
  if (Date.now() - categoryCache.at < CAT_TTL_MS && categoryCache.map.size > 0) {
    return categoryCache.map;
  }
  const data = await restV2GetCategoryList();
  const map = new Map();
  for (const row of data.ResultData || []) {
    if (!row || typeof row !== 'object') continue;
    const id = /** @type {Record<string, unknown>} */ (row).Id ?? /** @type {Record<string, unknown>} */ (row).id;
    const name = /** @type {Record<string, unknown>} */ (row).Name ?? /** @type {Record<string, unknown>} */ (row).name;
    if (id != null && name != null) map.set(String(id), String(name));
  }
  categoryCache = { at: Date.now(), map };
  return map;
}

/**
 * Подстановка {repertoireId}, {id} в шаблон (CDN / статика).
 * @param {string | undefined} template
 * @param {string} repertoireId
 */
function expandMediaTemplate(template, repertoireId) {
  if (!template?.trim()) return null;
  return template
    .replaceAll('{repertoireId}', repertoireId)
    .replaceAll('{id}', repertoireId);
}

/** Текст для карточки афиши в JSON каталога */
function catalogCardDescription(s) {
  const t = String(s || '').trim();
  if (!t) return '';
  return t.length > 380 ? `${t.slice(0, 377).trimEnd()}…` : t;
}

/** Первое содержательное описание из сохранённого пакета для hero на главной. */
function firstDescriptionParagraphFromPack(raw) {
  const pack = descPackFromStoredJson(raw);
  const first = pack?.sections?.find((s) => Array.isArray(s.paragraphs) && s.paragraphs[0]?.trim());
  return first?.paragraphs?.[0]?.trim() || '';
}

/**
 * @returns {Promise<Map<string, { title_manual: string | null, poster_url_manual: string | null, poster_url_web: string | null, banner_url_manual: string | null, description_manual: string | null, description_pack_json?: unknown, is_published: boolean }>>}
 */
async function loadStorefrontOverrides() {
  const m = new Map();
  try {
    let r;
    try {
      r = await ticketPool.query(
        `SELECT getbilet_external_id, title_manual, poster_url_manual, poster_url_web, banner_url_manual, description_manual, description_pack_json, is_published
         FROM getbilet_events`,
      );
    } catch (e) {
      if (e && typeof e === 'object' && 'code' in e && e.code === '42703') {
        r = await ticketPool.query(
          `SELECT getbilet_external_id, title_manual, poster_url_manual, poster_url_web, banner_url_manual, description_manual, is_published
           FROM getbilet_events`,
        );
      } else {
        throw e;
      }
    }
    for (const row of r.rows) {
      m.set(row.getbilet_external_id, row);
    }
  } catch {
    /* ticket DB не настроена */
  }
  return m;
}

/**
 * Подписи сцен из админки — последний локальный fallback для площадки в карточках и hero.
 * @param {string[]} stageIds
 * @returns {Promise<Map<string, string>>}
 */
async function loadStageMapTitles(stageIds) {
  const ids = [...new Set(stageIds.map((x) => String(x || '').trim()).filter(Boolean))];
  const m = new Map();
  if (ids.length === 0) return m;
  try {
    const r = await ticketPool.query(
      `SELECT stage_external_id, title FROM getbilet_stage_maps WHERE stage_external_id = ANY($1::text[])`,
      [ids],
    );
    for (const row of r.rows) {
      if (row.stage_external_id && row.title && String(row.title).trim()) {
        m.set(String(row.stage_external_id), String(row.title).trim());
      }
    }
  } catch {
    /* таблица схем может отсутствовать */
  }
  return m;
}

/**
 * @param {Record<string, unknown>[]} actions
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function enrichRestV2CatalogActions(actions) {
  let catMap = new Map();
  try {
    catMap = await getCategoryIdToNameMap();
  } catch {
    /* GetCategoryList недоступен */
  }
  const overrides = await loadStorefrontOverrides();

  /** @type {Map<string, boolean>} */
  let publicationByRep = new Map();
  try {
    const pr = await ticketPool.query(`SELECT getbilet_external_id, is_published FROM getbilet_events`);
    for (const row of pr.rows) {
      publicationByRep.set(row.getbilet_external_id, row.is_published === true);
    }
  } catch {
    publicationByRep = new Map();
  }

  const posterTpl = process.env.GETBILET_POSTER_URL_TEMPLATE?.trim();
  const bannerTpl = process.env.GETBILET_BANNER_URL_TEMPLATE?.trim();

  /** Площадки: вложенные поля репертуара + справочник placeId / stageId из GetPlaceList + GetStageListByPlaceId */
  let byPlaceId = new Map();
  let stageIdToParentVenue = new Map();
  try {
    const maps = await getVenueLookupMaps();
    byPlaceId = maps.byPlaceId;
    stageIdToParentVenue = maps.stageIdToParentVenue;
  } catch (e) {
    console.error('[getbilet enrich] venue lookup:', e instanceof Error ? e.message : e);
  }

  const stageMapTitles = await loadStageMapTitles(
    actions.map((row) => String(row.stageId ?? row.StageId ?? '').trim()),
  );

  const mapped = actions.map((row) => {
    const repId = String(row.Id ?? row.id ?? '');
    const o = overrides.get(repId);
    const out = { ...row };
    const sid = String(out.stageId ?? out.StageId ?? row.stageId ?? row.StageId ?? '').trim();
    let venueLabel = extractParentVenueFromRow(out);
    if (!venueLabel) {
      const pid = pickPlaceId(out);
      if (pid && byPlaceId.has(pid)) venueLabel = byPlaceId.get(pid) || '';
    }
    if (!venueLabel) {
      if (sid && stageIdToParentVenue.has(sid)) venueLabel = stageIdToParentVenue.get(sid) || '';
    }
    if (!venueLabel && sid && stageMapTitles.has(sid)) {
      venueLabel = stageMapTitles.get(sid) || '';
    }
    if (venueLabel && !String(out.PlaceName ?? out.placeName ?? '').trim()) {
      out.PlaceName = venueLabel;
    }
    if (o?.title_manual?.trim() && o.is_published === true) {
      out.Name = o.title_manual.trim();
    }
    const titleForHeur = String(out.Name ?? out.name ?? '').trim();
    if (o?.poster_url_manual?.trim()) {
      out.ImageUrl = o.poster_url_manual.trim();
    } else if (!out.ImageUrl && posterTpl) {
      const u = expandMediaTemplate(posterTpl, repId);
      if (u) out.ImageUrl = u;
    } else if (!out.ImageUrl && o?.poster_url_web?.trim()) {
      out.ImageUrl = o.poster_url_web.trim();
    }
    if (o?.banner_url_manual?.trim()) {
      out.BannerUrl = o.banner_url_manual.trim();
    } else if (bannerTpl) {
      const u = expandMediaTemplate(bannerTpl, repId);
      if (u) out.BannerUrl = u;
    }
    if (o?.description_manual?.trim() && o.is_published === true) {
      const d = o.description_manual.trim();
      const short = catalogCardDescription(d);
      out.shortDescription = short;
      out.description = short;
      out.Description = short;
    }
    const firstPackParagraph = firstDescriptionParagraphFromPack(o?.description_pack_json);
    if (firstPackParagraph) {
      out.HeroDescription = catalogCardDescription(firstPackParagraph);
      out.heroDescription = out.HeroDescription;
      if (!String(out.shortDescription ?? '').trim()) {
        out.shortDescription = out.HeroDescription;
        out.description = out.HeroDescription;
        out.Description = out.HeroDescription;
      }
    }
    if (!String(out.shortDescription ?? '').trim() && titleForHeur) {
      const apiDesc = [
        row.shortDescription,
        row.ShortDescription,
        row.description,
        row.Description,
        row.Subtitle,
        row.subtitle,
      ]
        .map((x) => (x != null ? String(x).trim() : ''))
        .find((s) => s.length > 3);
      if (apiDesc) {
        const short = catalogCardDescription(apiDesc);
        out.shortDescription = short;
        out.description = short;
        out.Description = short;
      }
    }
    const venueForCard = String(out.PlaceName ?? out.placeName ?? '').trim();
    if (!String(out.shortDescription ?? '').trim() && titleForHeur && !venueForCard) {
      const { descriptionBlurb } = classifyEventTitle(titleForHeur);
      out.shortDescription = descriptionBlurb;
      out.description = descriptionBlurb;
      out.Description = descriptionBlurb;
    }
    const cat = row.Category;
    if (cat != null && /^[a-f0-9]{24}$/i.test(String(cat).trim())) {
      const name = catMap.get(String(cat));
      if (name) out.Category = name;
      else delete out.Category;
    }
    const catStr =
      out.Category != null && typeof out.Category !== 'object' ? String(out.Category).trim() : '';
    const catBad = !catStr || /^[a-f0-9]{24}$/i.test(catStr);
    if (titleForHeur && catBad) {
      const { categoryLabel } = classifyEventTitle(titleForHeur);
      out.Category = categoryLabel;
    }
    return out;
  });

  return mapped.filter((row) => {
    const repId = String(row.Id ?? row.id ?? '');
    if (!repId) return false;
    if (!publicationByRep.has(repId)) return true;
    return publicationByRep.get(repId) === true;
  });
}
