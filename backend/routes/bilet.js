import express from 'express';
import crypto from 'crypto';
import {
  bil24JsonCommand,
  getGetbiletConfig,
  getbiletHealthFetch,
  restGetJson,
  GetbiletConfigError,
  GetbiletUpstreamError,
  GetbiletValidationError,
} from '../services/getbiletClient.js';
import {
  restV2BuildEventsCatalog,
  getRestV2AccessToken,
  restV2CancelOrder,
  restV2GetAgentList,
  restV2GetCategoryList,
  restV2GetOfferById,
  restV2GetOfferIdBySeatInfo,
  restV2GetOfferListByEventInfo,
  restV2GetOfferListByRepertoireId,
  restV2GetPlaceList,
  restV2GetRepertoireListByStageId,
  restV2GetStageListByPlaceId,
  restV2MakeOrder,
} from '../services/getbiletRestV2.js';
import { enrichRestV2CatalogActions } from '../services/getbiletEnrich.js';
import {
  loadCatalogActionsFromDatabase,
  mergePinnedCatalogCacheIntoActions,
} from '../services/getbiletCatalogSync.js';
import { filterUpcomingCatalogActions } from '../services/getbiletPublicCatalogFilter.js';
import {
  getRepertoirePublicContext,
  getRepertoireDescriptionSections,
  resolveRepertoireSlug,
} from '../services/repertoirePublicContext.js';
import { RepertoireNotAvailableError } from '../services/repertoireStorefrontAccess.js';
import { resolveStageMapLookupExternalId } from '../services/stageMapLookup.js';
import { invalidateOffersCache } from '../services/getbiletOffersCache.js';
import { getPublicOffersForRepertoire } from '../services/getbiletOffersPublic.js';
import {
  applyGetbiletMarkupToOfferPayload,
  getGetbiletMarkupRuleForRepertoire,
} from '../services/getbiletMarkupPublic.js';
import {
  getGetbiletEventsHttpCache,
  setGetbiletEventsHttpCache,
} from '../services/getbiletEventsHttpCache.js';
import { slugify } from '../utils/eventSlug.js';
import ticketPool from '../ticketDb.js';
import { optionalAuth } from '../middleware/auth.js';
import { registerBiletTicketCheckoutRoutes } from './biletTicketCheckout.js';
import {
  buildLuzhnikiFootballStadiumInkscapePreview,
  buildLuzhnikiFootballStadiumPreview,
} from '../services/pbiletLuzhnikiFootballPreview.js';

const router = express.Router();

/**
 * @param {unknown} err
 * @param {import('express').Response} res
 */
function sendGetbiletError(err, res) {
  if (err instanceof RepertoireNotAvailableError) {
    return res.status(404).json({ error: 'not_found', message: err.message });
  }
  if (err instanceof GetbiletForbiddenError) {
    return res.status(403).json({ error: 'forbidden', message: err.message });
  }
  if (err instanceof GetbiletValidationError) {
    return res.status(400).json({ error: 'bad_request', message: err.message });
  }
  if (err instanceof GetbiletConfigError) {
    return res.status(503).json({ error: 'getbilet_not_configured', message: err.message });
  }
  if (err instanceof GetbiletUpstreamError) {
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 502;
    const payload = {
      error: 'getbilet_upstream_error',
      message: err.message,
    };
    if (err.body && typeof err.body === 'object') {
      Object.assign(payload, err.body);
    }
    return res.status(status).json(payload);
  }
  const pgCode = err && typeof err === 'object' && 'code' in err ? String(/** @type {{ code?: string }} */ (err).code) : '';
  if (pgCode === '42P01') {
    return res.status(503).json({
      error: 'catalog_cache_missing',
      message: 'Таблица getbilet_catalog_cache не создана — выполните миграции и POST /api/admin/getbilet/sync-catalog',
    });
  }
  if (pgCode === '42703') {
    return res.status(503).json({
      error: 'ticket_schema_outdated',
      message: 'Схема ticket DB устарела — на сервере: node scripts/apply-ticket-migrations.js && node scripts/ensure-getbilet-storefront-hidden-column.js',
    });
  }
  console.error('[getbilet] unexpected:', err instanceof Error ? err.message : err, pgCode || '');
  return res.status(500).json({ error: 'internal_error' });
}

/** @param {unknown} v @param {string} name */
function requireNonEmptyString(v, name) {
  const s = typeof v === 'string' ? v.trim() : v != null ? String(v).trim() : '';
  if (!s) throw new GetbiletValidationError(`${name} обязателен`);
  return s;
}

/**
 * Единый формат для фронта: SeatList — строки мест, как в MakeOrder.
 * @param {Record<string, unknown>} row
 */
function normalizeGetbiletOfferRow(row) {
  if (!row || typeof row !== 'object') return row;
  const o = { ...row };
  if (Array.isArray(o.SeatList) && o.SeatList.length > 0) return o;
  const sl =
    o.SeatList ??
    o.seatList ??
    o.Seats ??
    o.seats ??
    o.SeatNumbers ??
    o.seatNumbers ??
    o.SeatNoList;
  if (Array.isArray(sl)) {
    o.SeatList = sl.map((x) => String(x));
    return o;
  }
  if (typeof sl === 'string' && sl.trim()) {
    o.SeatList = sl
      .split(/[,\s;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return o;
  }
  return o;
}

/** @param {unknown} data */
function normalizeGetbiletOfferListPayload(data) {
  if (!data || typeof data !== 'object') return data;
  const d = /** @type {Record<string, unknown>} */ (data);
  const rd = d.ResultData;
  if (!Array.isArray(rd)) return data;
  return {
    ...d,
    ResultData: rd.map((row) => {
      if (!row || typeof row !== 'object') return row;
      return normalizeGetbiletOfferRow(/** @type {Record<string, unknown>} */ (row));
    }),
  };
}

/** Ключ in-memory кэша афиши (протокол + режим каталога + cityId для BIL24 + версия формы ответа). */
function getbiletEventsCacheKey(req) {
  const { protocol } = getGetbiletConfig();
  const mode = (process.env.GETBILET_CATALOG_SOURCE || 'live').trim().toLowerCase();
  const cityId = req.query.cityId != null ? String(req.query.cityId) : '';
  return `v2|${protocol}|${mode}|${cityId}`;
}

/** Один общий loadEventsPayload на ключ: главная параллельно дергает /home и /events-lite. */
/** @type {Map<string, Promise<unknown>>} */
const loadEventsPayloadInflight = new Map();

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {unknown} payload
 */
function sendJsonWithEventsCache(req, res, payload) {
  const bypass = req.query.refresh === '1' || req.query.fresh === '1';
  if (!bypass) {
    setGetbiletEventsHttpCache(getbiletEventsCacheKey(req), payload);
    res.setHeader('X-Getbilet-Events-Cache', 'miss');
  } else {
    res.setHeader('X-Getbilet-Events-Cache', 'bypass');
  }
  return sendPublicJson(req, res, payload, { cacheSeconds: 120, staleSeconds: 600 });
}

function publicJsonEtag(body) {
  return `"${crypto.createHash('sha1').update(body).digest('base64url')}"`;
}

function sendPublicJson(req, res, payload, opts = {}) {
  const body = JSON.stringify(payload);
  const etag = publicJsonEtag(body);
  const maxAge = Number.isFinite(opts.cacheSeconds) ? opts.cacheSeconds : 60;
  const stale = Number.isFinite(opts.staleSeconds) ? opts.staleSeconds : 300;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (opts.noCache) {
    res.setHeader('Cache-Control', 'private, no-store, must-revalidate');
  } else {
    res.setHeader('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${stale}`);
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
  }
  return res.send(body);
}

/** @param {import('express').Response} res @param {{ markup_kind: string; markup_value: number } | null} markupRule */
function setMarkupResponseHeader(res, markupRule) {
  if (markupRule) {
    res.setHeader('X-Getbilet-Markup', `${markupRule.markup_kind}:${markupRule.markup_value}`);
  } else {
    res.setHeader('X-Getbilet-Markup', 'none');
  }
}

function pickPublicString(row, keys) {
  if (!row || typeof row !== 'object') return undefined;
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function compactGetbiletAction(row) {
  if (!row || typeof row !== 'object') return null;
  const id = pickPublicString(row, [
    'vitrineRowId',
    'VitrineRowId',
    'actionId',
    'id',
    'Id',
    'ID',
    'eventId',
    'EventId',
    'RepertoireId',
    'repertoireId',
  ]);
  const title = pickPublicString(row, [
    'actionName',
    'name',
    'Name',
    'title',
    'Title',
    'eventName',
    'subject',
  ]);
  if (!id && !title) return null;
  return {
    id: id || title,
    repertoireId: pickPublicString(row, ['RepertoireId', 'repertoireId', 'repertoireID']),
    title: title || 'Без названия',
    shortDescription: pickPublicString(row, ['shortDescription', 'ShortDescription', 'subtitle', 'Subtitle']),
    HeroDescription: pickPublicString(row, ['HeroDescription', 'heroDescription']),
    PlaceName: pickPublicString(row, ['PlaceName', 'placeName', 'venueName', 'VenueName', 'venue']),
    PlaceAddress: pickPublicString(row, ['PlaceAddress', 'placeAddress', 'venueAddress', 'VenueAddress']),
    genreName: pickPublicString(row, ['genreName', 'genre', 'Genre', 'categoryName', 'Category']),
    ageLimit: pickPublicString(row, ['age', 'ageLimit', 'Age', 'restriction', 'AgeLimit']),
    beginDateTime: pickPublicString(row, ['beginDateTime', 'beginDate', 'dateTime', 'date', 'Date']),
    startDateTime: pickPublicString(row, ['startDateTime', 'isoDate', 'BeginDateTime', 'EventDateTime']),
    posterUrl: pickPublicString(row, ['posterUrl', 'poster', 'Poster', 'imageUrl', 'ImageUrl', 'Image']),
    bannerUrl: pickPublicString(row, ['BannerUrl', 'bannerUrl', 'BannerURL']),
    stageId: pickPublicString(row, ['stageId', 'StageId']),
    authorName: pickPublicString(row, ['authorName', 'Author', 'author', 'AuthorName']),
    directorName: pickPublicString(row, ['directorName', 'director', 'Director', 'DirectorName']),
    isPremiere: row.isPremiere ?? row.premiere ?? row.IsPremiere,
  };
}

function compactActions(actions, limit = 120) {
  if (!Array.isArray(actions)) return [];
  const seen = new Set();
  const out = [];
  for (const action of actions) {
    const item = compactGetbiletAction(action);
    if (!item) continue;
    const key =
      item.id ||
      `${item.repertoireId || ''}|${item.startDateTime || item.beginDateTime || ''}` ||
      item.title;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

/** @param {unknown} data */
function buildCompactEventsPayload(data, limit = 500) {
  const all = Array.isArray(/** @type {{ actions?: unknown[] }} */ (data)?.actions)
    ? /** @type {{ actions: unknown[] }} */ (data).actions
    : [];
  const actions = compactActions(all, limit);
  return {
    actions,
    total: all.length,
    compact: true,
  };
}

function eventStartMsFromCompact(item) {
  const raw = item.startDateTime || item.beginDateTime;
  if (!raw) return 0;
  const t = Date.parse(String(raw));
  return Number.isFinite(t) ? t : 0;
}

/** @param {ReturnType<typeof compactGetbiletAction>} item @param {string} slug */
function compactItemMatchesSlug(item, slug) {
  if (!item || !slug) return false;
  const target = slug.toLowerCase();
  const title = String(item.title || '');
  if (slugify(title) === target) return true;
  const rep = String(item.repertoireId || '').trim();
  if (rep && rep.toLowerCase() === target) return true;
  const cardId = String(item.id || '').trim();
  if (cardId && cardId.toLowerCase() === target) return true;
  return false;
}

/** Публичная витрина: только сегодня и будущее (админка — полный каталог в БД). */
function finalizePublicStorefrontActions(actions) {
  return filterUpcomingCatalogActions(Array.isArray(actions) ? actions : []);
}

async function enrichAndMergePublicCatalog(actionsInput) {
  let actions = Array.isArray(actionsInput) ? actionsInput : [];
  try {
    actions = await enrichRestV2CatalogActions(actions);
  } catch (e) {
    console.error('[getbilet] enrich catalog:', e instanceof Error ? e.message : e);
  }
  try {
    actions = await mergePinnedCatalogCacheIntoActions(actions);
  } catch (e) {
    console.error('[getbilet] merge pinned catalog:', e instanceof Error ? e.message : e);
  }
  return finalizePublicStorefrontActions(actions);
}

/**
 * Тот же объект каталога, что в GET /api/bilet/events (полный payload.actions).
 * Главная и /events-lite раньше не читали in-memory слой: при сценарии «только главная»
 * кэш от /events не использовался и не заполнялся этими маршрутами.
 * @param {import('express').Request} req
 * @param {{ bypass?: boolean }} [opts]
 * @returns {Promise<{ data: unknown, fromCache: boolean }>}
 */
async function getOrLoadEventsPayloadForPublic(req, opts = {}) {
  const bypass =
    opts.bypass === true || req.query.refresh === '1' || req.query.fresh === '1';
  const cacheKey = getbiletEventsCacheKey(req);
  if (bypass) {
    const data = await loadEventsPayload(req);
    return { data, fromCache: false };
  }
  let inflight = loadEventsPayloadInflight.get(cacheKey);
  if (!inflight) {
    inflight = loadEventsPayload(req).finally(() => {
      if (loadEventsPayloadInflight.get(cacheKey) === inflight) {
        loadEventsPayloadInflight.delete(cacheKey);
      }
    });
    loadEventsPayloadInflight.set(cacheKey, inflight);
  }
  const data = await inflight;
  return { data, fromCache: false };
}

async function loadEventsPayload(req) {
  const { protocol } = getGetbiletConfig();
  if (protocol === 'rest_v2') {
    const mode = (process.env.GETBILET_CATALOG_SOURCE || 'live').trim().toLowerCase();

    if (mode === 'database') {
      try {
        const actions = finalizePublicStorefrontActions(await loadCatalogActionsFromDatabase());
        return { actions };
      } catch (e) {
        console.error('[getbilet] database catalog failed, fallback live:', e instanceof Error ? e.message : e);
        const data = await restV2BuildEventsCatalog();
        data.actions = await enrichAndMergePublicCatalog(data.actions);
        return { ...data, fromDatabaseFallback: true };
      }
    }

    if (mode === 'database_fallback') {
      try {
        const data = await restV2BuildEventsCatalog();
        const actions = await enrichAndMergePublicCatalog(data.actions);
        return { ...data, actions };
      } catch (e) {
        console.error('[getbilet] live catalog failed, using DB cache:', e instanceof Error ? e.message : e);
        const actions = finalizePublicStorefrontActions(await loadCatalogActionsFromDatabase());
        return { actions, fromDatabaseFallback: true };
      }
    }

    const data = await restV2BuildEventsCatalog();
    data.actions = await enrichAndMergePublicCatalog(data.actions);
    if (!Array.isArray(data.actions) || data.actions.length === 0) {
      try {
        const fromDb = await loadCatalogActionsFromDatabase();
        if (Array.isArray(fromDb) && fromDb.length > 0) {
          data.actions = finalizePublicStorefrontActions(fromDb);
          data.fromDatabaseBecauseLiveEmpty = true;
        }
      } catch (e) {
        if (e && typeof e === 'object' && 'code' in e && e.code === '42P01') {
          /* нет getbilet_catalog_cache */
        } else {
          console.error('[getbilet] live пуст, fallback БД не удался:', e instanceof Error ? e.message : e);
        }
      }
    }
    return data;
  }
  if (protocol === 'rest') {
    const path = process.env.GETBILET_REST_EVENTS_PATH || '/events';
    return restGetJson(path, /** @type {Record<string, string>} */ (req.query));
  }

  const cityId = parseQueryULong(req.query.cityId, 'cityId');
  return bil24JsonCommand('GET_ACTIONS_V2', { cityId });
}

/** Публично: протокол бэкенда — фронт подставляет cityId только для BIL24 */
router.get('/meta', (req, res) => {
  const { protocol } = getGetbiletConfig();
  res.json({
    protocol,
    cityIdRequired: protocol === 'bil24_json',
    restV2: protocol === 'rest_v2',
  });
});

/**
 * Без секретов: сводка env и (опц.) проверка Auth/GetToken.
 * `GET /api/bilet/status?probe=1` — дернуть GetBilet (только rest_v2: получение x-access-token).
 */
router.get('/status', async (req, res) => {
  try {
    const { protocol, baseUrl } = getGetbiletConfig();
    const catalogSource = (process.env.GETBILET_CATALOG_SOURCE || 'live').trim().toLowerCase();
    const v2Stages = process.env.GETBILET_V2_STAGE_IDS?.trim();
    const payload = {
      protocol,
      baseUrl,
      catalogSource,
      v2StageIds: v2Stages ? 'explicit' : 'auto',
      hasBil24: {
        apiKey: Boolean(process.env.GETBILET_API_KEY?.trim()),
        interfaceFid: Boolean(process.env.GETBILET_INTERFACE_FID?.trim()),
      },
      hasRestV2: {
        userId: Boolean(process.env.GETBILET_USER_ID?.trim()),
        hash: Boolean(
          (process.env.GETBILET_HASH || process.env.GETBILET_HASH_ID || '').trim(),
        ),
      },
    };
    if (req.query.probe === '1' && protocol === 'rest_v2') {
      try {
        await getRestV2AccessToken();
        payload.restV2AuthOk = true;
      } catch (e) {
        payload.restV2AuthOk = false;
        payload.restV2AuthError = e instanceof Error ? e.message : String(e);
      }
    } else if (req.query.probe === '1' && protocol === 'bil24_json') {
      payload.probeNote =
        'bil24_json: probe не вызывает upstream; проверяйте GET /api/bilet/events?refresh=1 вручную.';
    }
    return res.json(payload);
  } catch (err) {
    return sendGetbiletError(err, res);
  }
});

/** Подсказки для фронта: включены ли шаблоны URL постеров/баннеров (без раскрытия шаблона) */
router.get('/media-config', (req, res) => {
  res.json({
    posterTemplateEnabled: Boolean(process.env.GETBILET_POSTER_URL_TEMPLATE?.trim()),
    bannerTemplateEnabled: Boolean(process.env.GETBILET_BANNER_URL_TEMPLATE?.trim()),
  });
});

/** Превью схемы Лужники (футбол): публичный pbilet + демо-офферы (или реальные места при eventSourceId/eventDateId в query или env). */
router.get('/preview/luzhniki-football-stadium', async (req, res) => {
  try {
    const rawSource = typeof req.query.source === 'string' ? req.query.source.trim().toLowerCase() : '';
    const demoEventIso =
      typeof req.query.demoEventIso === 'string' && req.query.demoEventIso.trim()
        ? req.query.demoEventIso.trim()
        : '2026-05-24T15:00:00.000Z';

    if (rawSource === 'inkscape') {
      const data = await buildLuzhnikiFootballStadiumInkscapePreview({ demoEventIso });
      return res.json(data);
    }

    const layoutId = typeof req.query.layoutId === 'string' ? req.query.layoutId : undefined;
    const qSrc = typeof req.query.eventSourceId === 'string' ? req.query.eventSourceId.trim() : '';
    const qDate = typeof req.query.eventDateId === 'string' ? req.query.eventDateId.trim() : '';
    const envSrc = process.env.PBILET_LUZHNIKI_PREVIEW_EVENT_SOURCE_ID?.trim() || '';
    const envDate = process.env.PBILET_LUZHNIKI_PREVIEW_EVENT_DATE_ID?.trim() || '';
    const eventSourceId = qSrc || envSrc || null;
    const eventDateId = qDate || envDate || null;
    const data = await buildLuzhnikiFootballStadiumPreview({
      layoutId,
      eventSourceId,
      eventDateId,
      demoEventIso,
    });
    return res.json(data);
  } catch (err) {
    console.error('[bilet] preview/luzhniki-football-stadium', err);
    return res.status(502).json({
      error: 'pbilet_preview_failed',
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

/** SVG/JSON схемы зала по StageId (из GetStageListByPlaceId) */
router.get('/stage/:stageId/map', async (req, res) => {
  try {
    const stageId = requireNonEmptyString(req.params.stageId, 'stageId');
    const repertoireId =
      typeof req.query.repertoireId === 'string' ? req.query.repertoireId.trim() : '';
    const lookupKey = await resolveStageMapLookupExternalId(stageId, repertoireId);
    const r = await ticketPool.query(
      `SELECT id, stage_external_id, place_external_id, title, svg_markup, layout_json, external_plan_url, updated_at
       FROM getbilet_stage_maps WHERE stage_external_id = $1`,
      [lookupKey]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'not_found' });
    return sendPublicJson(req, res, r.rows[0], { cacheSeconds: 300, staleSeconds: 600 });
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '42P01') {
      return res.status(503).json({ error: 'schema', message: 'Таблица getbilet_stage_maps не создана — выполните миграции' });
    }
    return sendGetbiletError(err, res);
  }
});

/** Контекст + офферы одним запросом (страница /ticket). SVG схемы — отдельно GET /stage/:id/map. */
router.get('/repertoire/:repertoireId/page', async (req, res) => {
  try {
    const { protocol } = getGetbiletConfig();
    if (protocol !== 'rest_v2') {
      return res.status(501).json({ error: 'only_rest_v2', message: 'Нужен GETBILET_PROTOCOL=rest_v2' });
    }
    const repertoireId = requireNonEmptyString(req.params.repertoireId, 'repertoireId');
    const forceRefresh = req.query.refresh === '1' || req.query.fresh === '1';
    const [context, offersResult] = await Promise.all([
      getRepertoirePublicContext(repertoireId, { omitStageSvgMarkup: true, fastPath: true }),
      getPublicOffersForRepertoire(repertoireId, { forceRefresh }).catch((e) => {
        console.error('[getbilet] page offers:', repertoireId, e instanceof Error ? e.message : e);
        return {
          payload: { Success: true, Method: 'GetOfferListByRepertoireId', ResultData: [] },
          meta: { cache: 'error' },
          markupRule: null,
        };
      }),
    ]);
    if (offersResult.meta?.cache) {
      res.setHeader('X-Getbilet-Offers-Cache', offersResult.meta.cache);
    }
    setMarkupResponseHeader(res, offersResult.markupRule);
    return sendPublicJson(
      req,
      res,
      {
        context,
        offers: normalizeGetbiletOfferListPayload(offersResult.payload),
      },
      { noCache: true },
    );
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '42P01') {
      return res.status(503).json({
        error: 'schema',
        message: 'Таблица getbilet_catalog_cache не создана — выполните миграции и синхронизацию каталога',
      });
    }
    return sendGetbiletError(err, res);
  }
});

/** Контекст для страницы бронирования: постер, баннер, stageId, SVG схемы (из кэша + getbilet_events) */
router.get('/repertoire/:repertoireId/context', async (req, res) => {
  try {
    const repertoireId = requireNonEmptyString(req.params.repertoireId, 'repertoireId');
    const full = req.query.full === '1';
    const ctx = await getRepertoirePublicContext(repertoireId, {
      fastPath: !full,
      omitStageSvgMarkup: !full,
      includeDescriptionSections: full,
    });
    return sendPublicJson(req, res, ctx, { cacheSeconds: 60, staleSeconds: 180 });
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '42P01') {
      return res.status(503).json({
        error: 'schema',
        message: 'Таблица getbilet_catalog_cache не создана — выполните миграции и синхронизацию каталога',
      });
    }
    return sendGetbiletError(err, res);
  }
});

/** Длинное описание «О событии» — после быстрого shell (/context или /page). */
router.get('/repertoire/:repertoireId/description-sections', async (req, res) => {
  try {
    const repertoireId = requireNonEmptyString(req.params.repertoireId, 'repertoireId');
    const payload = await getRepertoireDescriptionSections(repertoireId);
    return sendPublicJson(req, res, payload, { cacheSeconds: 300, staleSeconds: 600 });
  } catch (err) {
    return sendGetbiletError(err, res);
  }
});

/** Офферы по репертуару (дата/сектор/ряд/места/цены) — для страницы бронирования; кэш PostgreSQL + SWR */
router.get('/repertoire/:repertoireId/offers', async (req, res) => {
  try {
    const { protocol } = getGetbiletConfig();
    if (protocol !== 'rest_v2') {
      return res.status(501).json({ error: 'only_rest_v2', message: 'Нужен GETBILET_PROTOCOL=rest_v2 или auto с UserId+Hash' });
    }
    const repertoireId = requireNonEmptyString(req.params.repertoireId, 'repertoireId');
    const forceRefresh = req.query.refresh === '1' || req.query.fresh === '1';
    const { payload, meta, markupRule } = await getPublicOffersForRepertoire(repertoireId, {
      forceRefresh,
    });
    if (meta.cache) {
      res.setHeader('X-Getbilet-Offers-Cache', meta.cache);
    }
    setMarkupResponseHeader(res, markupRule);
    return sendPublicJson(req, res, normalizeGetbiletOfferListPayload(payload), { noCache: true });
  } catch (err) {
    return sendGetbiletError(err, res);
  }
});

/** Бронирование (MakeOrder) через бэкенд — секрет GetBilet не уходит на фронт */
router.post('/reserve', async (req, res) => {
  try {
    const { protocol } = getGetbiletConfig();
    if (protocol !== 'rest_v2') {
      return res.status(501).json({ error: 'only_rest_v2' });
    }
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    const offerId = requireNonEmptyString(b.offerId ?? b.OfferId, 'offerId');
    const rawSeats = b.seats ?? b.SeatList;
    if (rawSeats == null) throw new GetbiletValidationError('seats обязателен');
    const repRaw = b.repertoireId ?? b.RepertoireId;
    const repertoireIdForCache =
      typeof repRaw === 'string' && repRaw.trim() ? repRaw.trim() : typeof repRaw === 'number' ? String(repRaw) : '';
    const data = await restV2MakeOrder(
      offerId,
      Array.isArray(rawSeats) ? rawSeats : String(rawSeats).split(/[,\s]+/).filter(Boolean),
    );
    if (repertoireIdForCache) {
      invalidateOffersCache(repertoireIdForCache).catch(() => {});
    }
    return res.json(data);
  } catch (err) {
    return sendGetbiletError(err, res);
  }
});

/** Компактный payload для главной: меньше JSON и меньше CPU на слабых устройствах. */
router.get('/home', async (req, res) => {
  try {
    const bypass = req.query.refresh === '1' || req.query.fresh === '1';
    const { data } = await getOrLoadEventsPayloadForPublic(req, { bypass });
    const actions = compactActions(data?.actions, Number(process.env.GETBILET_HOME_EVENTS_LIMIT || 120));
    return sendPublicJson(req, res, {
      actions,
      total: Array.isArray(data?.actions) ? data.actions.length : actions.length,
      compact: true,
    }, { cacheSeconds: 120, staleSeconds: 600 });
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '42P01') {
      return res.status(503).json({
        error: 'catalog_cache_missing',
        message: 'Таблица getbilet_catalog_cache не создана — выполните миграции и POST /api/admin/getbilet/sync-catalog',
      });
    }
    return sendGetbiletError(err, res);
  }
});

/** Лёгкий список для перелинковки/SEO-блоков и будущих виджетов. */
router.get('/events-lite', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '200'), 10) || 200, 1), 500);
    const bypass = req.query.refresh === '1' || req.query.fresh === '1';
    const { data } = await getOrLoadEventsPayloadForPublic(req, { bypass });
    const actions = compactActions(data?.actions, limit);
    return sendPublicJson(req, res, {
      actions,
      total: Array.isArray(data?.actions) ? data.actions.length : actions.length,
      compact: true,
    }, { cacheSeconds: 120, staleSeconds: 600 });
  } catch (err) {
    return sendGetbiletError(err, res);
  }
});

/** Разрешение ЧПУ /ticket/:slug без загрузки полного каталога на клиент. */
router.get('/resolve-slug/:slug', async (req, res) => {
  try {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    if (!slug) {
      return res.status(400).json({ error: 'slug_required' });
    }
    const { data } = await getOrLoadEventsPayloadForPublic(req);
    const actions = compactActions(data?.actions, 500);
    const hit = await resolveRepertoireSlug(slug, actions);
    if (!hit) {
      return res.status(404).json({ error: 'not_found' });
    }
    return sendPublicJson(req, res, hit, { cacheSeconds: 120, staleSeconds: 600 });
  } catch (err) {
    return sendGetbiletError(err, res);
  }
});

/** Список мероприятий: compact JSON (как events-lite, до 500 строк). */
router.get('/events', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '500'), 10) || 500, 1), 500);
    const bypass = req.query.refresh === '1' || req.query.fresh === '1';
    if (!bypass) {
      const hit = getGetbiletEventsHttpCache(getbiletEventsCacheKey(req));
      if (hit) {
        const etag = publicJsonEtag(hit);
        res.setHeader('X-Getbilet-Events-Cache', 'hit');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
        res.setHeader('ETag', etag);
        if (req.headers['if-none-match'] === etag) {
          return res.status(304).end();
        }
        return res.send(hit);
      }
    }
    const { data } = await getOrLoadEventsPayloadForPublic(req, { bypass });
    const payload = buildCompactEventsPayload(data, limit);
    return sendJsonWithEventsCache(req, res, payload);
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '42P01') {
      return res.status(503).json({
        error: 'catalog_cache_missing',
        message: 'Таблица getbilet_catalog_cache не создана — выполните миграции и POST /api/admin/getbilet/sync-catalog',
      });
    }
    return sendGetbiletError(err, res);
  }
});

/** Детали мероприятия (BIL24 / REST). В rest_v2 нет аналога одного «actionId» — используйте GetOffer* по репертуару. */
router.get('/events/:actionId', async (req, res) => {
  try {
    const { protocol } = getGetbiletConfig();
    if (protocol === 'rest_v2') {
      return res.status(501).json({
        error: 'not_supported_in_rest_v2',
        message:
          'В режиме GETBILET_PROTOCOL=rest_v2 нет GET /events/:id. Используйте POST /api/bilet/v2/GetOfferListByRepertoireId и др.',
      });
    }

    const actionId = parseParamULong(req.params.actionId, 'actionId');

    if (protocol === 'rest') {
      const basePath = process.env.GETBILET_REST_EVENTS_PATH || '/events';
      const path = `${basePath.replace(/\/+$/, '')}/${actionId}`;
      const q = { ...req.query };
      const data = await restGetJson(path, /** @type {Record<string, string>} */ (q));
      return res.json(data);
    }

    const cityId = parseQueryULong(req.query.cityId, 'cityId');
    const userId =
      req.query.userId !== undefined ? parseQueryULong(req.query.userId, 'userId') : undefined;
    const fields = { cityId, actionId };
    if (userId !== undefined) fields.userId = userId;
    const data = await bil24JsonCommand('GET_ACTION_EXT', fields);
    return res.json(data);
  } catch (err) {
    return sendGetbiletError(err, res);
  }
});

/** Площадки: BIL24 GET_VENUES | REST | rest_v2 GetPlaceList */
router.get('/venues', async (req, res) => {
  try {
    const { protocol } = getGetbiletConfig();
    if (protocol === 'rest_v2') {
      const data = await restV2GetPlaceList();
      return res.json(data);
    }
    if (protocol === 'rest') {
      const path = process.env.GETBILET_REST_VENUES_PATH || '/venues';
      const data = await restGetJson(path, /** @type {Record<string, string>} */ (req.query));
      return res.json(data);
    }

    const fields = {};
    if (req.query.countryId !== undefined) fields.countryId = parseQueryULong(req.query.countryId, 'countryId');
    if (req.query.cityId !== undefined) fields.cityId = parseQueryULong(req.query.cityId, 'cityId');
    if (req.query.venueTypeId !== undefined) {
      fields.venueTypeId = parseQueryULong(req.query.venueTypeId, 'venueTypeId');
    }
    const data = await bil24JsonCommand('GET_VENUES', fields);
    return res.json(data);
  } catch (err) {
    return sendGetbiletError(err, res);
  }
});

/** Города (только BIL24 / произвольный REST). В спецификации rest_v2.2 нет списка городов. */
router.get('/cities', async (req, res) => {
  try {
    const { protocol } = getGetbiletConfig();
    if (protocol === 'rest_v2') {
      return res.status(501).json({
        error: 'not_in_rest_v2',
        message: 'Метода списка городов нет в GetBilet REST v2.2. Используйте GetPlaceList / GetStageListByPlaceId.',
      });
    }
    if (protocol === 'rest') {
      const path = process.env.GETBILET_REST_CITIES_PATH || '/cities';
      const data = await restGetJson(path, /** @type {Record<string, string>} */ (req.query));
      return res.json(data);
    }

    const fields = {};
    if (req.query.countryId !== undefined) fields.countryId = parseQueryULong(req.query.countryId, 'countryId');
    const data = await bil24JsonCommand('GET_CITIES', fields);
    return res.json(data);
  } catch (err) {
    return sendGetbiletError(err, res);
  }
});

/** Проверка связи: корень API или GetPlaceList в rest_v2 */
router.get('/health', async (req, res) => {
  try {
    const { protocol } = getGetbiletConfig();
    if (protocol === 'rest_v2') {
      await getRestV2AccessToken();
      const places = await restV2GetPlaceList();
      return res.json({ ok: true, protocol: 'rest_v2', sample: { method: places.Method, resultCount: places.ResultCount } });
    }
    const path = process.env.GETBILET_HEALTH_PATH || '/';
    const data = await getbiletHealthFetch(path);
    return res.json({ ok: true, upstream: data });
  } catch (err) {
    return sendGetbiletError(err, res);
  }
});

// --- GetBilet REST API v2.2: прокси (тело как в документации) ---

router.post('/v2/GetPlaceList', async (req, res) => {
  try {
    assertRestV2();
    const data = await restV2GetPlaceList();
    return res.json(data);
  } catch (err) {
    return sendGetbiletError(err, res);
  }
});

router.post('/v2/GetStageListByPlaceId', async (req, res) => {
  try {
    assertRestV2();
    const placeId = requireNonEmptyString(req.body?.PlaceId ?? req.body?.placeId, 'PlaceId');
    const data = await restV2GetStageListByPlaceId(placeId);
    return res.json(data);
  } catch (err) {
    return sendGetbiletError(err, res);
  }
});

router.post('/v2/GetCategoryList', async (req, res) => {
  try {
    assertRestV2();
    const data = await restV2GetCategoryList();
    return res.json(data);
  } catch (err) {
    return sendGetbiletError(err, res);
  }
});

router.post('/v2/GetAgentList', async (req, res) => {
  try {
    assertRestV2();
    const data = await restV2GetAgentList();
    return res.json(data);
  } catch (err) {
    return sendGetbiletError(err, res);
  }
});

router.post('/v2/GetRepertoireListByStageId', async (req, res) => {
  try {
    assertRestV2();
    const stageId = requireNonEmptyString(req.body?.StageId ?? req.body?.stageId, 'StageId');
    const data = await restV2GetRepertoireListByStageId(stageId);
    return res.json(data);
  } catch (err) {
    return sendGetbiletError(err, res);
  }
});

router.post('/v2/GetOfferListByRepertoireId', async (req, res) => {
  try {
    assertRestV2();
    const rid = requireNonEmptyString(req.body?.RepertoireId ?? req.body?.repertoireId, 'RepertoireId');
    const { payload, markupRule } = await getPublicOffersForRepertoire(rid, { forceRefresh: true });
    setMarkupResponseHeader(res, markupRule);
    return res.json(payload);
  } catch (err) {
    return sendGetbiletError(err, res);
  }
});

router.post('/v2/GetOfferListByEventInfo', async (req, res) => {
  try {
    assertRestV2();
    const rid = requireNonEmptyString(req.body?.RepertoireId ?? req.body?.repertoireId, 'RepertoireId');
    const dt = requireNonEmptyString(req.body?.EventDateTime ?? req.body?.eventDateTime, 'EventDateTime');
    const data = await restV2GetOfferListByEventInfo(rid, dt);
    return res.json(data);
  } catch (err) {
    return sendGetbiletError(err, res);
  }
});

router.post('/v2/GetOfferById', async (req, res) => {
  try {
    assertRestV2();
    const oid = requireNonEmptyString(req.body?.OfferId ?? req.body?.offerId, 'OfferId');
    const repRaw = req.body?.RepertoireId ?? req.body?.repertoireId;
    const data = await restV2GetOfferById(oid);
    const repertoireId =
      typeof repRaw === 'string' && repRaw.trim()
        ? repRaw.trim()
        : typeof data?.ResultData === 'object' && data.ResultData && !Array.isArray(data.ResultData)
          ? String(data.ResultData.RepertoireId ?? data.ResultData.repertoireId ?? '').trim()
          : Array.isArray(data?.ResultData) && data.ResultData[0]
            ? String(data.ResultData[0].RepertoireId ?? data.ResultData[0].repertoireId ?? '').trim()
            : '';
    const markupRule = repertoireId ? await getGetbiletMarkupRuleForRepertoire(repertoireId) : null;
    const withMarkup = applyGetbiletMarkupToOfferPayload(data, markupRule);
    setMarkupResponseHeader(res, markupRule);
    return res.json(withMarkup);
  } catch (err) {
    return sendGetbiletError(err, res);
  }
});

router.post('/v2/GetOfferIdBySeatInfo', async (req, res) => {
  try {
    assertRestV2();
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    const data = await restV2GetOfferIdBySeatInfo({
      RepertoireId: requireNonEmptyString(b.RepertoireId ?? b.repertoireId, 'RepertoireId'),
      Sector: requireNonEmptyString(b.Sector ?? b.sector, 'Sector'),
      EventDateTime: requireNonEmptyString(b.EventDateTime ?? b.eventDateTime, 'EventDateTime'),
      Row: requireNonEmptyString(b.Row ?? b.row, 'Row'),
      Seat: requireNonEmptyString(b.Seat ?? b.seat, 'Seat'),
    });
    return res.json(data);
  } catch (err) {
    return sendGetbiletError(err, res);
  }
});

class GetbiletForbiddenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GetbiletForbiddenError';
  }
}

function assertRestV2WriteAllowed(req) {
  const secret = process.env.GETBILET_V2_WRITE_SECRET?.trim();
  if (!secret) return;
  const h = req.headers['x-getbilet-write-secret'];
  if (h !== secret) {
    throw new GetbiletForbiddenError('Нужен заголовок x-getbilet-write-secret (см. GETBILET_V2_WRITE_SECRET в .env)');
  }
}

router.put('/v2/MakeOrder', async (req, res) => {
  try {
    assertRestV2();
    assertRestV2WriteAllowed(req);
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    const offerId = requireNonEmptyString(b.OfferId ?? b.offerId, 'OfferId');
    const seatList = b.SeatList ?? b.seatList;
    if (seatList == null) throw new GetbiletValidationError('SeatList обязателен');
    const data = await restV2MakeOrder(offerId, seatList);
    return res.json(data);
  } catch (err) {
    return sendGetbiletError(err, res);
  }
});

router.delete('/v2/CancelOrder', async (req, res) => {
  try {
    assertRestV2();
    assertRestV2WriteAllowed(req);
    const orderId = requireNonEmptyString(req.query.orderId ?? req.query.OrderId, 'orderId');
    const data = await restV2CancelOrder(orderId);
    return res.json(data);
  } catch (err) {
    return sendGetbiletError(err, res);
  }
});

function assertRestV2() {
  const { protocol } = getGetbiletConfig();
  if (protocol !== 'rest_v2') {
    throw new GetbiletConfigError(
      'Эндпоинты /api/bilet/v2/* доступны только при GETBILET_PROTOCOL=rest_v2',
    );
  }
}

/** @param {unknown} raw @param {string} name */
function parseParamULong(raw, name) {
  const n = typeof raw === 'string' ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n) || n < 0) {
    throw new GetbiletValidationError(`Некорректный ${name}`);
  }
  return n;
}

/** @param {unknown} raw @param {string} name */
function parseQueryULong(raw, name) {
  if (raw === undefined || raw === null || raw === '') {
    throw new GetbiletValidationError(`Параметр запроса ${name} обязателен`);
  }
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = typeof s === 'string' ? parseInt(s, 10) : NaN;
  if (!Number.isFinite(n) || n < 0) {
    throw new GetbiletValidationError(`Некорректный ${name}`);
  }
  return n;
}

registerBiletTicketCheckoutRoutes(router, { optionalAuth });

export default router;
