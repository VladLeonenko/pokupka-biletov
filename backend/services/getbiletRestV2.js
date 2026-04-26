/**
 * GetBilet REST API v2.2 (31-10-2025): Auth/GetToken + x-access-token.
 * @see партнёрская спецификация GetBilet.ru
 */

import {
  getGetbiletConfig,
  GetbiletConfigError,
  GetbiletUpstreamError,
} from './getbiletClient.js';

/** @type {{ token: string | null, expMs: number }} */
const tokenCache = { token: null, expMs: 0 };

function joinUrl(baseUrl, path) {
  const b = baseUrl.replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
}

/**
 * @param {string} token
 * @returns {number | null} exp в ms
 */
export function jwtExpMs(token) {
  try {
    const parts = String(token).split('.');
    if (parts.length !== 3) return null;
    let payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = payloadB64.length % 4;
    if (pad) payloadB64 += '='.repeat(4 - pad);
    const json = Buffer.from(payloadB64, 'base64').toString('utf8');
    const payload = JSON.parse(json);
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} expiresIn - ISO datetime из ответа GetToken
 */
function parseExpiresInMs(expiresIn) {
  if (!expiresIn || typeof expiresIn !== 'string') return null;
  const t = Date.parse(expiresIn);
  return Number.isFinite(t) ? t : null;
}

function getRestV2Credentials() {
  const userId = process.env.GETBILET_USER_ID?.trim();
  const hash = process.env.GETBILET_HASH?.trim() || process.env.GETBILET_HASH_ID?.trim();
  if (!userId || !hash) {
    throw new GetbiletConfigError(
      'Режим rest_v2: задайте GETBILET_USER_ID и GETBILET_HASH (или GETBILET_HASH_ID) из личного кабинета GetBilet.',
    );
  }
  return { userId, hash };
}

/**
 * Сброс кэша токена (тесты / принудительное обновление).
 */
export function clearRestV2TokenCache() {
  tokenCache.token = null;
  tokenCache.expMs = 0;
}

/**
 * Получить валидный access token (кэш ~2ч, обновление за 2 мин до истечения).
 * @returns {Promise<string>}
 */
export async function getRestV2AccessToken() {
  const skewMs = 120_000;
  const now = Date.now();
  if (tokenCache.token && tokenCache.expMs - skewMs > now) {
    return tokenCache.token;
  }

  const { baseUrl, timeoutMs } = getGetbiletConfig();
  const prefix = (process.env.GETBILET_REST_V2_PATH_PREFIX || '').replace(/\/+$/, '');
  const path = prefix ? `${prefix}/Auth/GetToken` : 'Auth/GetToken';
  const url = joinUrl(baseUrl, path);
  const { userId, hash } = getRestV2Credentials();

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
      },
      body: JSON.stringify({ UserId: userId, Hash: hash }),
      signal: ac.signal,
    });
  } catch (e) {
    const name = e && typeof e === 'object' && 'name' in e ? e.name : '';
    if (name === 'AbortError') {
      throw new GetbiletUpstreamError('Превышен таймаут GetBilet Auth/GetToken', 504, null);
    }
    throw new GetbiletUpstreamError(e instanceof Error ? e.message : 'Ошибка сети', 502, null);
  } finally {
    clearTimeout(t);
  }

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new GetbiletUpstreamError('Ответ Auth/GetToken не JSON', res.status, { snippet: text.slice(0, 200) });
  }

  if (!res.ok) {
    throw new GetbiletUpstreamError(`HTTP ${res.status} от Auth/GetToken`, res.status, data);
  }

  if (!data || typeof data !== 'object') {
    throw new GetbiletUpstreamError('Пустой ответ Auth/GetToken', 502, data);
  }

  const sc = data.StatusCode;
  const scn = sc === undefined ? undefined : Number(sc);
  if (sc !== undefined && scn !== 200) {
    throw new GetbiletUpstreamError(
      typeof data.Message === 'string' ? data.Message : `Auth/GetToken StatusCode ${sc}`,
      502,
      data,
    );
  }

  const token = typeof data.Token === 'string' ? data.Token : null;
  if (!token) {
    throw new GetbiletUpstreamError('В ответе Auth/GetToken нет поля Token', 502, data);
  }

  let expMs = jwtExpMs(token);
  if (expMs == null) {
    expMs = parseExpiresInMs(data.ExpiresIn);
  }
  if (expMs == null) {
    expMs = now + 7200_000;
  }

  tokenCache.token = token;
  tokenCache.expMs = expMs;
  return token;
}

/**
 * @param {unknown} data
 * @param {string} methodLabel
 */
function assertRestV2Ok(data, methodLabel) {
  if (!data || typeof data !== 'object') return;
  const sc = data.StatusCode;
  const scn = sc === undefined ? undefined : Number(sc);
  if (sc !== undefined && scn !== 200) {
    const msg =
      typeof data.Message === 'string'
        ? data.Message
        : `${methodLabel}: StatusCode ${sc}`;
    throw new GetbiletUpstreamError(msg, 502, data);
  }
}

/**
 * @param {string} relativePath — например "GetPlaceList" или "Auth/GetToken"
 * @param {'POST' | 'PUT' | 'DELETE'} httpMethod
 * @param {Record<string, unknown>} [body]
 * @param {Record<string, string | undefined>} [query] — для DELETE
 */
export async function restV2Request(relativePath, httpMethod, body = undefined, query = undefined) {
  const { baseUrl, timeoutMs } = getGetbiletConfig();
  const prefix = (process.env.GETBILET_REST_V2_PATH_PREFIX || '').replace(/\/+$/, '');
  const rel = relativePath.replace(/^\/+/, '');
  const path = prefix ? `${prefix}/${rel}` : rel;
  let url = joinUrl(baseUrl, path);

  if (query && httpMethod === 'DELETE') {
    const u = new URL(url);
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
    }
    url = u.toString();
  }

  const headers = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip',
  };

  const token = await getRestV2AccessToken();
  headers['x-access-token'] = token;

  const init = {
    method: httpMethod,
    headers,
    signal: undefined,
  };

  if (httpMethod === 'POST' || httpMethod === 'PUT') {
    headers['Content-Type'] = 'application/json; charset=utf-8';
    init.body = JSON.stringify(body ?? {});
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  init.signal = ac.signal;

  let res;
  try {
    res = await fetch(url, init);
  } catch (e) {
    const name = e && typeof e === 'object' && 'name' in e ? e.name : '';
    if (name === 'AbortError') {
      throw new GetbiletUpstreamError(`Превышен таймаут GetBilet ${rel}`, 504, null);
    }
    throw new GetbiletUpstreamError(e instanceof Error ? e.message : 'Ошибка сети', 502, null);
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new GetbiletUpstreamError(`Ответ GetBilet ${rel} не JSON`, res.status, { snippet: text.slice(0, 200) });
  }

  if (!res.ok) {
    throw new GetbiletUpstreamError(`HTTP ${res.status} от GetBilet ${rel}`, res.status, data);
  }

  assertRestV2Ok(data, rel);
  return data;
}

// --- Обертки по спецификации v2.2 ---

export async function restV2GetPlaceList() {
  return restV2Request('GetPlaceList', 'POST', {});
}

export async function restV2GetStageListByPlaceId(placeId) {
  return restV2Request('GetStageListByPlaceId', 'POST', { PlaceId: placeId });
}

export async function restV2GetCategoryList() {
  return restV2Request('GetCategoryList', 'POST', {});
}

export async function restV2GetAgentList() {
  return restV2Request('GetAgentList', 'POST', {});
}

export async function restV2GetRepertoireListByStageId(stageId) {
  return restV2Request('GetRepertoireListByStageId', 'POST', { StageId: stageId });
}

export async function restV2GetOfferListByRepertoireId(repertoireId) {
  try {
    return await restV2Request('GetOfferListByRepertoireId', 'POST', { RepertoireId: repertoireId });
  } catch (e) {
    // Upstream: HTTP 404 или тело StatusCode 404 / «Null Result» — нет офферов по репертуару (сеанс снят, пустая выборка).
    if (e instanceof GetbiletUpstreamError && isSkippableEmptyCatalogError(e)) {
      console.warn(
        '[getbilet] GetOfferListByRepertoireId: пустой результат upstream, отдаём пустой ResultData:',
        repertoireId,
      );
      return { StatusCode: 200, ResultData: [] };
    }
    throw e;
  }
}

export async function restV2GetOfferListByEventInfo(repertoireId, eventDateTime) {
  return restV2Request('GetOfferListByEventInfo', 'POST', {
    RepertoireId: repertoireId,
    EventDateTime: eventDateTime,
  });
}

export async function restV2GetOfferById(offerId) {
  return restV2Request('GetOfferById', 'POST', { OfferId: offerId });
}

export async function restV2GetOfferIdBySeatInfo(fields) {
  return restV2Request('GetOfferIdBySeatInfo', 'POST', fields);
}

/**
 * @param {string} offerId
 * @param {string[] | string} seatList — массив мест или строка "1,2"
 */
export async function restV2MakeOrder(offerId, seatList) {
  const seats =
    Array.isArray(seatList) ? seatList.map(String).join(',') : String(seatList ?? '');
  return restV2Request('MakeOrder', 'PUT', { OfferId: offerId, SeatList: seats });
}

export async function restV2CancelOrder(orderId) {
  return restV2Request('CancelOrder', 'DELETE', undefined, { orderId });
}

/**
 * @param {unknown} row
 * @returns {string | null}
 */
function pickMongoId(row) {
  if (!row || typeof row !== 'object') return null;
  const id = /** @type {Record<string, unknown>} */ (row).Id ?? /** @type {Record<string, unknown>} */ (row).id;
  return id != null && id !== '' ? String(id) : null;
}

/**
 * @param {number} n
 * @param {number} min
 * @param {number} max
 * @param {number} fallback
 */
function clampIntLocal(n, min, max, fallback) {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * Upstream иногда отвечает HTTP 500 с телом StatusCode 404 / «Null Result» на пустой репертуар сцены.
 * @param {unknown} err
 */
function isSkippableEmptyCatalogError(err) {
  if (!(err instanceof GetbiletUpstreamError)) return false;
  const body = err.body;
  if (!body || typeof body !== 'object') return false;
  const b = /** @type {Record<string, unknown>} */ (body);
  const sc = b.StatusCode;
  const msg = typeof b.Message === 'string' ? b.Message : '';
  if (sc === 404 || sc === '404') return true;
  if (msg.includes('Null Result')) return true;
  return false;
}

/**
 * Без GETBILET_V2_STAGE_IDS: GetPlaceList → GetStageListByPlaceId → собираем id сцен.
 * Ограничения — чтобы не упираться в таймаут при сотнях площадок.
 * @returns {Promise<string[]>}
 */
export async function restV2DiscoverStageIdsForCatalog() {
  const maxPlaces = clampIntLocal(
    parseInt(process.env.GETBILET_V2_CATALOG_MAX_PLACES || '50', 10),
    1,
    500,
    50,
  );
  const maxStages = clampIntLocal(
    parseInt(process.env.GETBILET_V2_CATALOG_MAX_STAGES || '300', 10),
    1,
    5000,
    300,
  );
  const placeAllow = process.env.GETBILET_V2_CATALOG_PLACE_IDS?.trim()
    ? new Set(
        process.env.GETBILET_V2_CATALOG_PLACE_IDS.split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      )
    : null;

  const placesData = await restV2GetPlaceList();
  let placeRows = Array.isArray(placesData.ResultData) ? placesData.ResultData : [];
  let placeIds = placeRows.map((p) => pickMongoId(p)).filter(Boolean);
  if (placeAllow?.size) {
    placeIds = placeIds.filter((id) => placeAllow.has(id));
  }
  placeIds = placeIds.slice(0, maxPlaces);

  const stageIds = [];
  for (const placeId of placeIds) {
    try {
      const sd = await restV2GetStageListByPlaceId(placeId);
      const stages = Array.isArray(sd.ResultData) ? sd.ResultData : [];
      for (const st of stages) {
        const sid = pickMongoId(st);
        if (sid) stageIds.push(sid);
        if (stageIds.length >= maxStages) return stageIds;
      }
    } catch (e) {
      if (e instanceof GetbiletUpstreamError) continue;
      throw e;
    }
  }
  return stageIds;
}

/**
 * Каталог для витрины: репертуар по сценам.
 * Приоритет: GETBILET_V2_STAGE_IDS; иначе автообход площадок/сцен (все города в одной ленте).
 * @returns {Promise<{ actions: Record<string, unknown>[] }>}
 */
export async function restV2BuildEventsCatalog() {
  const raw = process.env.GETBILET_V2_STAGE_IDS?.trim();
  let stageIds = raw
    ? [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))]
    : [];

  if (!stageIds.length) {
    stageIds = await restV2DiscoverStageIdsForCatalog();
  }

  if (!stageIds.length) {
    throw new GetbiletConfigError(
      'Каталог пуст: нет сцен или репертуара. Проверьте ключи GetBilet и при необходимости GETBILET_V2_STAGE_IDS / GETBILET_V2_CATALOG_PLACE_IDS.',
    );
  }

  const seenRep = new Set();
  const actions = [];

  for (const stageId of stageIds) {
    try {
      const data = await restV2GetRepertoireListByStageId(stageId);
      const rows = Array.isArray(data.ResultData) ? data.ResultData : [];
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const rid = pickMongoId(row);
        if (rid) {
          if (seenRep.has(rid)) continue;
          seenRep.add(rid);
        }
        actions.push({
          ...row,
          stageId,
          actionId: /** @type {Record<string, unknown>} */ (row).Id ?? /** @type {Record<string, unknown>} */ (row).id,
          actionName: /** @type {Record<string, unknown>} */ (row).Name ?? /** @type {Record<string, unknown>} */ (row).name,
        });
      }
    } catch (e) {
      if (isSkippableEmptyCatalogError(e)) continue;
      throw e;
    }
  }

  const built = await expandCatalogActionsWithOfferSessions(actions);
  return { actions: built };
}

/**
 * GETBILET_V2_CATALOG_EXPAND_SESSIONS: не "0"/"false" — разворачивать репертуар в отдельные карточки сеансов
 * (как в кабинете GetBilet: одна карточка = одна дата/время). Иначе в витрине одна строка на спектакль.
 * @returns {boolean}
 */
export function shouldExpandCatalogSessions() {
  const v = (process.env.GETBILET_V2_CATALOG_EXPAND_SESSIONS || '1').trim().toLowerCase();
  return v !== '0' && v !== 'false' && v !== 'no' && v !== 'off';
}

const _sessionListCache = new Map();
const SESSION_LIST_TTL_MS = 4 * 60 * 1000;

function sessionListCacheGet(repertoireId) {
  const e = _sessionListCache.get(repertoireId);
  if (e && Date.now() - e.at < SESSION_LIST_TTL_MS) return e.data;
  return null;
}

function sessionListCacheSet(repertoireId, data) {
  _sessionListCache.set(repertoireId, { at: Date.now(), data });
}

/**
 * Один репертуар → N карточек (по уникальным EventDateTime из GetOfferListByRepertoireId).
 * @param {Record<string, unknown>} repertoireRow
 * @returns {Promise<Record<string, unknown>[]>}
 */
async function expandOneRepertoireToSessions(repertoireRow) {
  const rid = pickMongoId(repertoireRow);
  if (!rid) return [repertoireRow];

  const cached = sessionListCacheGet(rid);
  let data = cached;
  if (!data) {
    try {
      data = await restV2GetOfferListByRepertoireId(rid);
      sessionListCacheSet(rid, data);
    } catch (e) {
      if (e instanceof GetbiletUpstreamError) {
        if (isSkippableEmptyCatalogError(e)) return [repertoireRow];
        // прочие ошибки офферов — оставляем одну карточку репертуара
        return [repertoireRow];
      }
      return [repertoireRow];
    }
  }

  const offers = Array.isArray(data.ResultData) ? data.ResultData : [];
  /** @type {Map<string, Record<string, unknown>>} */
  const byDt = new Map();
  for (const o of offers) {
    if (!o || typeof o !== 'object') continue;
    const offer = /** @type {Record<string, unknown>} */ (o);
    const dtRaw = offer.EventDateTime ?? offer.eventDateTime ?? offer.BeginDateTime ?? offer.beginDateTime;
    if (dtRaw == null || String(dtRaw).trim() === '') continue;
    const dt = String(dtRaw).trim();
    if (!byDt.has(dt)) byDt.set(dt, offer);
  }

  if (byDt.size === 0) return [repertoireRow];

  const rows = [];
  const safeSlug = (s) =>
    String(s)
      .replace(/[^\w\u0400-\u04FF+\-:.]/g, '_')
      .slice(0, 120);
  for (const [dt, sampleOffer] of byDt) {
    const placeFromOffer =
      typeof sampleOffer.PlaceName === 'string'
        ? sampleOffer.PlaceName
        : typeof sampleOffer.StageName === 'string'
          ? sampleOffer.StageName
          : undefined;
    const vitrineRowId = `${rid}::${safeSlug(dt)}`;
    rows.push({
      ...repertoireRow,
      RepertoireId: rid,
      Id: rid,
      vitrineRowId,
      EventDateTime: dt,
      beginDateTime: dt,
      beginDateTimeISO: dt,
      /** Подстраховка: площадка из оффера, если в репертуаре пусто */
      ...(placeFromOffer &&
      !/** @type {Record<string, unknown>} */ (repertoireRow).PlaceName &&
      !/** @type {Record<string, unknown>} */ (repertoireRow).placeName
        ? { PlaceName: placeFromOffer }
        : {}),
    });
  }
  return rows;
}

/**
 * Развёртка каталога: одна запись репертуара → несколько карточек (сеансы).
 * Параллелизм ограничен (много запросов к GetBilet).
 * @param {Record<string, unknown>[]} actions
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function expandCatalogActionsWithOfferSessions(actions) {
  if (!shouldExpandCatalogSessions()) return actions;
  const conc = clampIntLocal(parseInt(process.env.GETBILET_V2_CATALOG_EXPAND_CONCURRENCY || '6', 10), 1, 24, 6);
  const out = [];
  for (let i = 0; i < actions.length; i += conc) {
    const chunk = actions.slice(i, i + conc);
    const parts = await Promise.all(chunk.map((row) => expandOneRepertoireToSessions(row)));
    for (const r of parts) out.push(...r);
  }
  return out;
}
