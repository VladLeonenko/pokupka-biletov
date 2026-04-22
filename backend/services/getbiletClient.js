/**
 * Клиент GetBilet / BIL24-совместимого API.
 * Протокол BIL24: HTTPS POST JSON, поля fid + token + command на каждый запрос (см. bil24.pro/api.html).
 */

const DEFAULT_BASE = 'https://api.getbilet.ru';
const DEFAULT_TIMEOUT_MS = 25_000;
const DEFAULT_JSON_PATH = '/json';

export class GetbiletConfigError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'GetbiletConfigError';
  }
}

export class GetbiletValidationError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'GetbiletValidationError';
  }
}

export class GetbiletUpstreamError extends Error {
  /**
   * @param {string} message
   * @param {number} [status]
   * @param {unknown} [body]
   */
  constructor(message, status, body) {
    super(message);
    this.name = 'GetbiletUpstreamError';
    this.status = status;
    this.body = body;
  }
}

/**
 * @returns {{ baseUrl: string, timeoutMs: number, protocol: 'bil24_json' | 'rest' | 'rest_v2', jsonPath: string, restPrefix: string, locale: string }}
 */
export function getGetbiletConfig() {
  const raw = process.env.GETBILET_API_BASE?.trim() || DEFAULT_BASE;
  const baseUrl = raw.replace(/\/+$/, '');
  const timeoutMs = clampInt(
    parseInt(process.env.GETBILET_API_TIMEOUT_MS || String(DEFAULT_TIMEOUT_MS), 10),
    1000,
    120_000,
    DEFAULT_TIMEOUT_MS,
  );
  const rawProto = (process.env.GETBILET_PROTOCOL || 'auto').toLowerCase().replace(/-/g, '_');
  /** rest_v2 — официальный REST GetBilet v2.2 (UserId/Hash → x-access-token). */
  let protocol = 'bil24_json';
  if (rawProto === 'auto') {
    const uid = process.env.GETBILET_USER_ID?.trim();
    const hash = process.env.GETBILET_HASH?.trim() || process.env.GETBILET_HASH_ID?.trim();
    protocol = uid && hash ? 'rest_v2' : 'bil24_json';
  } else if (rawProto === 'rest') protocol = 'rest';
  else if (rawProto === 'rest_v2' || rawProto === 'restv2') protocol = 'rest_v2';
  else if (rawProto === 'bil24' || rawProto === 'bil24_json') protocol = 'bil24_json';
  const jsonPath = normalizeJsonPath(process.env.GETBILET_JSON_PATH || DEFAULT_JSON_PATH);
  const restPrefix = (process.env.GETBILET_REST_PREFIX || '').replace(/\/+$/, '');
  const locale = process.env.GETBILET_LOCALE?.trim() || 'ru-RU';
  return { baseUrl, timeoutMs, protocol, jsonPath, restPrefix, locale };
}

/**
 * Заголовки для REST-режима (Bearer / Basic). Секреты в логи не попадают.
 * @returns {Record<string, string>}
 */
export function buildRestAuthHeaders() {
  const key = process.env.GETBILET_API_KEY?.trim();
  const secret = process.env.GETBILET_API_SECRET?.trim();
  const mode = (process.env.GETBILET_AUTH_MODE || 'auto').toLowerCase();

  if (!key && !secret) return {};

  if (mode === 'none') return {};

  if (mode === 'basic' || (mode === 'auto' && secret)) {
    const user = key || '';
    const pass = secret || '';
    const b64 = Buffer.from(`${user}:${pass}`, 'utf8').toString('base64');
    return { Authorization: `Basic ${b64}` };
  }

  if (mode === 'bearer' || mode === 'auto') {
    return { Authorization: `Bearer ${key}` };
  }

  return { Authorization: `Bearer ${key}` };
}

/**
 * Базовое тело BIL24: command, fid, token, locale.
 * @param {string} command
 * @param {Record<string, unknown>} [extra]
 * @returns {Record<string, unknown>}
 */
export function buildBil24Body(command, extra = {}) {
  const fidRaw = process.env.GETBILET_INTERFACE_FID?.trim();
  const token = process.env.GETBILET_API_KEY?.trim();
  const fid = fidRaw ? parseInt(fidRaw, 10) : NaN;

  if (!token) {
    throw new GetbiletConfigError('Задайте GETBILET_API_KEY (токен интерфейса BIL24).');
  }
  if (!Number.isFinite(fid) || fid <= 0) {
    throw new GetbiletConfigError('Задайте GETBILET_INTERFACE_FID (числовой fid интерфейса BIL24).');
  }

  const { locale } = getGetbiletConfig();
  return {
    command,
    fid,
    token,
    locale,
    ...extra,
  };
}

/**
 * POST BIL24 JSON на upstream.
 * @param {string} command
 * @param {Record<string, unknown>} [fields]
 * @returns {Promise<Record<string, unknown>>}
 */
export async function bil24JsonCommand(command, fields = {}) {
  const { baseUrl, jsonPath, timeoutMs } = getGetbiletConfig();
  const url = joinUrl(baseUrl, jsonPath);
  const body = buildBil24Body(command, fields);

  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
      },
      body: JSON.stringify(body),
    },
    timeoutMs,
  );

  return parseJsonResponse(res, command);
}

/**
 * REST GET с опциональной авторизацией.
 * @param {string} path — путь относительно base + restPrefix, например "/events"
 * @param {Record<string, string | string[] | undefined>} [query]
 */
export async function restGetJson(path, query = {}) {
  const { baseUrl, restPrefix, timeoutMs } = getGetbiletConfig();
  const rel = path.startsWith('/') ? path : `/${path}`;
  const prefix = restPrefix ? (restPrefix.startsWith('/') ? restPrefix : `/${restPrefix}`) : '';
  const u = new URL(joinUrl(baseUrl, `${prefix}${rel}`));
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach((x) => u.searchParams.append(k, String(x)));
    else u.searchParams.set(k, String(v));
  }

  const headers = {
    Accept: 'application/json',
    ...buildRestAuthHeaders(),
  };

  const res = await fetchWithTimeout(u.toString(), { method: 'GET', headers }, timeoutMs);
  return parseJsonResponse(res, 'REST');
}

/**
 * Проверка доступности upstream (GET корня или указанного пути).
 * @param {string} [path]
 */
export async function getbiletHealthFetch(path = '/') {
  const { baseUrl, timeoutMs } = getGetbiletConfig();
  const url = joinUrl(baseUrl, path.startsWith('/') ? path : `/${path}`);
  const res = await fetchWithTimeout(
    url,
    { method: 'GET', headers: { Accept: 'application/json', ...buildRestAuthHeaders() } },
    Math.min(timeoutMs, 10_000),
  );
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 500) };
  }
  if (!res.ok) {
    throw new GetbiletUpstreamError(`Upstream HTTP ${res.status}`, res.status, data);
  }
  return data;
}

// --- internals ---

/**
 * @param {string} baseUrl
 * @param {string} path
 */
function joinUrl(baseUrl, path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl.replace(/\/+$/, '')}${p}`;
}

/** @param {string} raw */
function normalizeJsonPath(raw) {
  const t = raw.trim() || DEFAULT_JSON_PATH;
  return t.startsWith('/') ? t : `/${t}`;
}

/**
 * @param {number} n
 * @param {number} min
 * @param {number} max
 * @param {number} fallback
 */
function clampInt(n, min, max, fallback) {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * @param {string} url
 * @param {RequestInit} init
 * @param {number} timeoutMs
 */
async function fetchWithTimeout(url, init, timeoutMs) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } catch (e) {
    const name = e && typeof e === 'object' && 'name' in e ? e.name : '';
    if (name === 'AbortError') {
      throw new GetbiletUpstreamError('Превышен таймаут запроса к GetBilet', 504, null);
    }
    throw new GetbiletUpstreamError(e instanceof Error ? e.message : 'Ошибка сети', 502, null);
  } finally {
    clearTimeout(t);
  }
}

/**
 * @param {Response} res
 * @param {string} label
 */
async function parseJsonResponse(res, label) {
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new GetbiletUpstreamError('Ответ GetBilet не JSON', res.status, { snippet: text.slice(0, 200) });
  }

  if (!res.ok) {
    throw new GetbiletUpstreamError(`HTTP ${res.status} от GetBilet`, res.status, data);
  }

  if (data && typeof data === 'object' && 'resultCode' in data) {
    const rc = data.resultCode;
    if (rc !== 0 && rc !== undefined) {
      const desc = typeof data.description === 'string' ? data.description : 'ошибка протокола';
      throw new GetbiletUpstreamError(`GetBilet: ${desc}`, 502, {
        resultCode: rc,
        command: data.command,
        cause: data.cause,
      });
    }
  }

  return data;
}
