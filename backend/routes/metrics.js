import express from 'express';
import pool from '../db.js';

const router = express.Router();

const DEFAULT_YANDEX_COUNTER = process.env.YANDEX_COUNTER_ID || '109119282';

function yandexOAuthApp() {
  return {
    clientId: process.env.YANDEX_CLIENT_ID || process.env.YANDEX_DIRECT_CLIENT_ID || '',
    clientSecret: process.env.YANDEX_CLIENT_SECRET || process.env.YANDEX_DIRECT_CLIENT_SECRET || '',
  };
}

/** Кэш отчётов Metrika: API даёт всего 3 параллельных запроса на user_login */
const YANDEX_CACHE_TTL_MS = Number(process.env.YANDEX_CACHE_TTL_MS || 120_000);
const yandexReportCache = new Map(); // key -> { expires, value, inflight? }

function yandexCacheKey(counter, date1, date2, period) {
  return `${counter}|${date1}|${date2}|${period || ''}`;
}

function getYandexCache(key) {
  const hit = yandexReportCache.get(key);
  if (!hit) return null;
  if (hit.expires > Date.now() && hit.value !== undefined) return hit.value;
  return null;
}

function setYandexCache(key, value) {
  yandexReportCache.set(key, { expires: Date.now() + YANDEX_CACHE_TTL_MS, value });
  // не раздуваем Map
  if (yandexReportCache.size > 40) {
    const first = yandexReportCache.keys().next().value;
    yandexReportCache.delete(first);
  }
}

async function getYandexMetrikaCredentials() {
  try {
    const { rows } = await pool.query('SELECT * FROM yandex_metrika_config WHERE id = 1');
    const row = rows[0];
    if (row?.access_token) {
      return {
        token: row.access_token,
        counter: row.counter_id || DEFAULT_YANDEX_COUNTER,
        source: 'db',
      };
    }
  } catch (e) {
    console.warn('[metrics] yandex_metrika_config read:', e?.message || e);
  }
  if (process.env.YANDEX_TOKEN) {
    return {
      token: process.env.YANDEX_TOKEN,
      counter: DEFAULT_YANDEX_COUNTER,
      source: 'env',
    };
  }
  return { token: null, counter: DEFAULT_YANDEX_COUNTER, source: 'none' };
}

async function saveYandexTokens({ access_token, refresh_token, expires_in, counter_id }) {
  const expiresAt =
    expires_in != null ? new Date(Date.now() + Number(expires_in) * 1000).toISOString() : null;
  await pool.query(
    `INSERT INTO yandex_metrika_config (id, counter_id, access_token, refresh_token, expires_at, updated_at)
     VALUES (1, $1, $2, $3, $4, NOW())
     ON CONFLICT (id) DO UPDATE SET
       counter_id = COALESCE(EXCLUDED.counter_id, yandex_metrika_config.counter_id),
       access_token = EXCLUDED.access_token,
       refresh_token = COALESCE(EXCLUDED.refresh_token, yandex_metrika_config.refresh_token),
       expires_at = EXCLUDED.expires_at,
       updated_at = NOW()`,
    [counter_id || DEFAULT_YANDEX_COUNTER, access_token, refresh_token || null, expiresAt]
  );
}

/** Реальные бизнес-метрики из БД */
async function fetchBusinessStats() {
  try {
    const [
      ordersRes,
      ordersMonthRes,
      clientsRes,
      clientsMonthRes,
      formsRes,
      formsNewRes,
      viewsRes,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) as cnt, COALESCE(SUM(total_cents), 0) as revenue FROM orders WHERE status != 'cancelled'`),
      pool.query(`SELECT COUNT(*) as cnt, COALESCE(SUM(total_cents), 0) as revenue FROM orders WHERE status != 'cancelled' AND created_at > NOW() - INTERVAL '30 days'`),
      pool.query(`SELECT COUNT(*) as cnt FROM clients`),
      pool.query(`SELECT COUNT(*) as cnt FROM clients WHERE created_at > NOW() - INTERVAL '30 days'`),
      pool.query(`SELECT COUNT(*) as cnt FROM form_submissions`),
      pool.query(`SELECT COUNT(*) as cnt FROM form_submissions WHERE status = 'new'`),
      pool.query(`SELECT COUNT(*) as cnt FROM product_analytics WHERE event_type = 'view' AND created_at > NOW() - INTERVAL '30 days'`),
    ]);
    return {
      ordersTotal: parseInt(ordersRes.rows[0]?.cnt || 0),
      revenueTotalCents: parseInt(ordersRes.rows[0]?.revenue || 0),
      ordersMonth: parseInt(ordersMonthRes.rows[0]?.cnt || 0),
      revenueMonthCents: parseInt(ordersMonthRes.rows[0]?.revenue || 0),
      clientsTotal: parseInt(clientsRes.rows[0]?.cnt || 0),
      clientsMonth: parseInt(clientsMonthRes.rows[0]?.cnt || 0),
      formSubmissionsTotal: parseInt(formsRes.rows[0]?.cnt || 0),
      formSubmissionsNew: parseInt(formsNewRes.rows[0]?.cnt || 0),
      productViewsMonth: parseInt(viewsRes.rows[0]?.cnt || 0),
    };
  } catch (e) {
    console.warn('[metrics] fetchBusinessStats error:', e.message);
    return null;
  }
}

function rangeDays(n) {
  const arr = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    arr.push(d.toISOString().slice(0, 10));
  }
  return arr;
}

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Разбор дат Метрики (today / Nd daysAgo / YYYY-MM-DD) → Date */
function parseMetrikaDate(value) {
  const today = startOfDay(new Date());
  const v = String(value || '');
  if (v === 'today') return today;
  if (v === 'yesterday') {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d;
  }
  const ago = /^(\d+)daysAgo$/.exec(v);
  if (ago) {
    const d = new Date(today);
    d.setDate(d.getDate() - Number(ago[1]));
    return d;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return startOfDay(new Date(`${v}T00:00:00`));
  return today;
}

/** Предыдущий период той же длины */
function resolvePreviousRange(date1, date2) {
  const start = parseMetrikaDate(date1);
  const end = parseMetrikaDate(date2);
  const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - days + 1);
  return { date1: ymd(prevStart), date2: ymd(prevEnd) };
}

function pctChange(current, previous) {
  const c = Number(current);
  const p = Number(previous);
  if (!Number.isFinite(c) || !Number.isFinite(p)) return null;
  if (p === 0) return c === 0 ? 0 : null;
  return ((c - p) / p) * 100;
}

/** period: today|yesterday|7d|14d|30d|90d|month|lastMonth|custom + date1/date2 */
function resolveMetrikaDates({ period = '30d', date1, date2 } = {}) {
  if (date1 && date2) {
    return { date1: String(date1), date2: String(date2), period: String(period || 'custom') };
  }
  const p = String(period || '30d');
  const now = new Date();
  const presets = {
    today: ['today', 'today'],
    yesterday: ['yesterday', 'yesterday'],
    '7d': ['7daysAgo', 'today'],
    '14d': ['14daysAgo', 'today'],
    '30d': ['30daysAgo', 'today'],
    '90d': ['90daysAgo', 'today'],
  };
  if (presets[p]) {
    return { date1: presets[p][0], date2: presets[p][1], period: p };
  }
  if (p === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { date1: ymd(start), date2: 'today', period: p };
  }
  if (p === 'lastMonth') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { date1: ymd(start), date2: ymd(end), period: p };
  }
  return { date1: '30daysAgo', date2: 'today', period: '30d' };
}

function mapNamedRows(data, { nameMap } = {}) {
  if (!Array.isArray(data)) return [];
  return data
    .map((row) => {
      const raw = row.dimensions?.[0]?.name || '—';
      const key = String(raw).toLowerCase();
      return {
        name: (nameMap && (nameMap[key] || nameMap[raw])) || raw,
        users: row.metrics?.[0] || 0,
      };
    })
    .filter((r) => r.name && r.name !== 'null' && r.name !== 'undefined');
}

function isMetrikaQuotaError(status, detail) {
  const d = String(detail || '').toLowerCase();
  return status === 429 || d.includes('quota exceeded') || d.includes('parallel user requests');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function metrikaGet(base, headers, params, { retries = 2 } = {}) {
  const qs = new URLSearchParams(params);
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${base}?${qs}`, { headers });
    if (res.ok) {
      try {
        return await res.json();
      } catch {
        return null;
      }
    }
    let detail = '';
    try {
      const errJson = await res.json();
      detail =
        errJson?.errors?.[0]?.message ||
        errJson?.message ||
        errJson?.error_description ||
        errJson?.error ||
        '';
    } catch {
      try {
        detail = (await res.text()).slice(0, 200);
      } catch {
        detail = '';
      }
    }
    const quota = isMetrikaQuotaError(res.status, detail);
    if (quota && attempt < retries) {
      await sleep(400 * (attempt + 1));
      continue;
    }
    console.warn(
      '[metrics]',
      `Metrika HTTP ${res.status}${detail ? `: ${detail}` : ''}`,
      Object.fromEntries(Object.entries(params).slice(0, 4)),
    );
    return null;
  }
  return null;
}

/** Статус: Management API (не ест квоту stat) + опционально лёгкий stat */
async function probeYandexMetrika(token, counter) {
  const headers = { Authorization: `OAuth ${token}` };
  const mgmtRes = await fetch(
    `https://api-metrika.yandex.net/management/v1/counter/${counter}`,
    { headers },
  );
  const mgmtText = await mgmtRes.text();
  let mgmtJson = null;
  try {
    mgmtJson = JSON.parse(mgmtText);
  } catch {
    /* ignore */
  }
  const mgmtDetail =
    mgmtJson?.errors?.[0]?.message ||
    mgmtJson?.message ||
    mgmtJson?.error_description ||
    mgmtJson?.error ||
    (!mgmtRes.ok ? mgmtText.slice(0, 300) : null);

  if (!mgmtRes.ok) {
    // квота / временный отказ — токен есть, OAuth переподключать не нужно
    if (isMetrikaQuotaError(mgmtRes.status, mgmtDetail)) {
      return {
        ok: true,
        status: mgmtRes.status,
        warning: mgmtDetail,
        totals: null,
        visits: null,
        users: null,
        pageviews: null,
      };
    }
    return {
      ok: false,
      status: mgmtRes.status,
      error: mgmtDetail || `HTTP ${mgmtRes.status}`,
      totals: null,
    };
  }

  // stat — best effort, не валит connected
  const url = new URL('https://api-metrika.yandex.net/stat/v1/data');
  url.searchParams.set('ids', String(counter));
  url.searchParams.set('metrics', 'ym:s:visits,ym:s:users,ym:s:pageviews');
  url.searchParams.set('date1', '30daysAgo');
  url.searchParams.set('date2', 'today');
  const res = await fetch(url, { headers });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    const detail =
      json?.errors?.[0]?.message ||
      json?.message ||
      json?.error_description ||
      json?.error ||
      text.slice(0, 300);
    return {
      ok: true,
      status: res.status,
      warning: isMetrikaQuotaError(res.status, detail)
        ? detail
        : detail || `stat HTTP ${res.status}`,
      totals: null,
      visits: null,
      users: null,
      pageviews: null,
      counterName: mgmtJson?.counter?.name || null,
    };
  }
  const totalsRow = Array.isArray(json?.totals)
    ? Array.isArray(json.totals[0])
      ? json.totals[0]
      : json.totals
    : null;
  return {
    ok: true,
    status: res.status,
    error: null,
    warning: null,
    totals: totalsRow,
    visits: totalsRow?.[0] ?? null,
    users: totalsRow?.[1] ?? null,
    pageviews: totalsRow?.[2] ?? null,
    counterName: mgmtJson?.counter?.name || null,
  };
}

async function fetchYandex(options = {}) {
  try {
    const creds = await getYandexMetrikaCredentials();
    const token = creds.token;
    const counter = creds.counter;
    if (!token || !counter) return null;

    // backward compat: fetchYandex(1) / fetchYandex(30)
    const opts = typeof options === 'number'
      ? { period: options <= 1 ? 'today' : options <= 7 ? '7d' : '30d' }
      : options;
    const { date1, date2, period } = resolveMetrikaDates(opts);

    const cacheKey = yandexCacheKey(counter, date1, date2, period);
    const cached = getYandexCache(cacheKey);
    if (cached) return cached;

    // один inflight на ключ — два админа не удвоят параллелизм
    const existing = yandexReportCache.get(cacheKey);
    if (existing?.inflight) return existing.inflight;

    const inflight = fetchYandexUncached({ token, counter, date1, date2, period })
      .then((value) => {
        if (value) setYandexCache(cacheKey, value);
        else yandexReportCache.delete(cacheKey);
        return value;
      })
      .catch((e) => {
        yandexReportCache.delete(cacheKey);
        throw e;
      });
    yandexReportCache.set(cacheKey, { expires: Date.now() + YANDEX_CACHE_TTL_MS, inflight });
    return inflight;
  } catch {
    return null;
  }
}

async function fetchYandexUncached({ token, counter, date1, date2, period }) {
  try {
    const base = 'https://api-metrika.yandex.net/stat/v1/data';
    const headers = { Authorization: `OAuth ${token}` };
    const common = { ids: String(counter), date1, date2 };

    const prev = resolvePreviousRange(date1, date2);
    const prevCommon = { ids: String(counter), date1: prev.date1, date2: prev.date2 };

    const deviceLabels = { desktop: 'Компьютер', tablet: 'Планшет', touch: 'Смартфон', mobile: 'Смартфон' };
    const newUserLabels = { yes: 'Новые', no: 'Вернувшиеся', true: 'Новые', false: 'Вернувшиеся' };
    const genderLabels = {
      male: 'Мужчины',
      female: 'Женщины',
      мужской: 'Мужчины',
      женский: 'Женщины',
    };

    const managementGoalsUrl = `https://api-metrika.yandex.net/management/v1/counter/${counter}/goals`;

    // Не больше ~5 параллельных — иначе Metrika часто отдаёт 429 и весь overview валится в null
    async function mapPool(items, concurrency, fn) {
      const results = new Array(items.length);
      let i = 0;
      async function worker() {
        while (i < items.length) {
          const idx = i++;
          results[idx] = await fn(items[idx], idx);
        }
      }
      await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
      return results;
    }

    const jobs = [
      () => metrikaGet(base, headers, { ...common, metrics: 'ym:s:users', dimensions: 'ym:s:date', group: 'Day' }),
      () => metrikaGet(base, headers, { ...common, metrics: 'ym:s:avgVisitDurationSeconds', dimensions: 'ym:s:date', group: 'Day' }),
      () => metrikaGet(base, headers, {
        ...common,
        metrics: 'ym:pv:pageviews',
        dimensions: 'ym:pv:URL,ym:pv:title',
        sort: '-ym:pv:pageviews',
        limit: '15',
      }),
      () => metrikaGet(base, headers, {
        ...common,
        metrics: 'ym:s:users,ym:s:visits,ym:s:pageviews,ym:s:bounceRate,ym:s:avgVisitDurationSeconds,ym:s:avgPageViews',
      }),
      () => metrikaGet(base, headers, {
        ...prevCommon,
        metrics: 'ym:s:users,ym:s:visits,ym:s:pageviews,ym:s:bounceRate,ym:s:avgVisitDurationSeconds,ym:s:avgPageViews',
      }),
      () => metrikaGet(base, headers, { ...common, metrics: 'ym:s:users', dimensions: 'ym:s:trafficSource', sort: '-ym:s:users', limit: '10' }),
      () => metrikaGet(base, headers, { ...common, metrics: 'ym:s:users', dimensions: 'ym:s:deviceCategory', sort: '-ym:s:users', limit: '5' }),
      () => metrikaGet(base, headers, { ...common, metrics: 'ym:s:bounceRate', dimensions: 'ym:s:date', group: 'Day' }),
      () => metrikaGet(base, headers, { ...common, metrics: 'ym:s:users', dimensions: 'ym:s:searchPhrase', sort: '-ym:s:users', limit: '20' }),
      () => metrikaGet(base, headers, { ...common, metrics: 'ym:s:users', dimensions: 'ym:s:regionCity', sort: '-ym:s:users', limit: '15' }),
      () => metrikaGet(base, headers, { ...common, metrics: 'ym:s:users', dimensions: 'ym:s:searchEngineRoot', sort: '-ym:s:users', limit: '10' }),
      () => metrikaGet(base, headers, { ...common, metrics: 'ym:s:users', dimensions: 'ym:s:browser', sort: '-ym:s:users', limit: '10' }),
      () => metrikaGet(base, headers, { ...common, metrics: 'ym:s:users', dimensions: 'ym:s:operatingSystemRoot', sort: '-ym:s:users', limit: '10' }),
      () => metrikaGet(base, headers, { ...common, metrics: 'ym:s:users', dimensions: 'ym:s:regionCountry', sort: '-ym:s:users', limit: '12' }),
      () => metrikaGet(base, headers, { ...common, metrics: 'ym:s:users', dimensions: 'ym:s:isNewUser', sort: '-ym:s:users', limit: '5' }),
      () => metrikaGet(base, headers, { ...common, metrics: 'ym:s:users', dimensions: 'ym:s:startURL', sort: '-ym:s:users', limit: '12' }),
      () => metrikaGet(base, headers, { ...common, metrics: 'ym:s:users', dimensions: 'ym:s:endURL', sort: '-ym:s:users', limit: '12' }),
      () => metrikaGet(base, headers, { ...common, metrics: 'ym:s:users', dimensions: 'ym:s:referer', sort: '-ym:s:users', limit: '12' }),
      () => metrikaGet(base, headers, { ...common, metrics: 'ym:s:users', dimensions: 'ym:s:socialNetwork', sort: '-ym:s:users', limit: '10' }),
      () => metrikaGet(base, headers, { ...common, metrics: 'ym:s:users', dimensions: 'ym:s:hour', sort: 'ym:s:hour', limit: '24' }),
      () => metrikaGet(base, headers, { ...common, metrics: 'ym:s:avgPageViews', dimensions: 'ym:s:date', group: 'Day' }),
      () => metrikaGet(base, headers, { ...common, metrics: 'ym:s:users', dimensions: 'ym:s:UTMSource', sort: '-ym:s:users', limit: '15' }),
      () => metrikaGet(base, headers, { ...common, metrics: 'ym:s:users', dimensions: 'ym:s:UTMMedium', sort: '-ym:s:users', limit: '15' }),
      () => metrikaGet(base, headers, { ...common, metrics: 'ym:s:users', dimensions: 'ym:s:UTMCampaign', sort: '-ym:s:users', limit: '15' }),
      () => metrikaGet(base, headers, { ...common, metrics: 'ym:s:users', dimensions: 'ym:s:gender', sort: '-ym:s:users', limit: '5' }),
      () => metrikaGet(base, headers, { ...common, metrics: 'ym:s:users', dimensions: 'ym:s:ageInterval', sort: '-ym:s:users', limit: '10' }),
      () => metrikaGet(base, headers, { ...common, metrics: 'ym:s:sumGoalReachesAny' }),
      () => fetch(managementGoalsUrl, { headers }).then(async (r) => (r.ok ? r.json() : null)).catch(() => null),
      () => metrikaGet(base, headers, { ...common, metrics: 'ym:s:newUsers' }),
      () => metrikaGet(base, headers, { ...prevCommon, metrics: 'ym:s:newUsers' }),
    ];

    const [
      usersJson,
      avgJson,
      topJson,
      sumJson,
      prevSumJson,
      srcJson,
      devJson,
      bounceJson,
      phraseJson,
      regionJson,
      engJson,
      browserJson,
      osJson,
      countryJson,
      newJson,
      entryJson,
      exitJson,
      refererJson,
      socialJson,
      hourJson,
      depthJson,
      utmSourceJson,
      utmMediumJson,
      utmCampaignJson,
      genderJson,
      ageJson,
      goalsAnyJson,
      goalsListRes,
      nuJson,
      prevNuJson,
    ] = await mapPool(jobs, 2, (job) => job());

    // Критичен summary; дневной ряд может отвалиться по квоте — не валим весь overview
    const sumOk = Array.isArray(sumJson?.totals) && sumJson.totals.length > 0;
    if (!sumOk && !Array.isArray(usersJson?.data)) return null;

    const visitors = Array.isArray(usersJson?.data)
      ? usersJson.data.map((row) => ({
          date: row.dimensions?.[0]?.name,
          users: row.metrics?.[0],
        }))
      : [];
    const avgSessionSec = Array.isArray(avgJson?.data)
      ? avgJson.data.map((row) => ({ date: row.dimensions?.[0]?.name, seconds: row.metrics?.[0] }))
      : [];
    const topPages = Array.isArray(topJson?.data)
      ? topJson.data.map((row) => ({
          path: row.dimensions?.[0]?.name,
          title: row.dimensions?.[1]?.name || '',
          views: row.metrics?.[0],
        }))
      : [];

    const totalsRow = (json) => {
      const t = json?.totals;
      if (!Array.isArray(t) || !t.length) return [];
      // Metrika: totals — number[][] ИЛИ плоский number[]
      return Array.isArray(t[0]) ? t[0] : t;
    };
    const scalarTotal = (json) => {
      const row = totalsRow(json);
      return row.length ? row[0] : null;
    };

    let summary = null;
    const m = totalsRow(sumJson);
    if (m.length >= 6) {
      summary = {
        users: m[0],
        visits: m[1],
        pageviews: m[2],
        bounceRate: m[3],
        avgVisitDurationSeconds: m[4],
        avgPageViews: m[5],
        newUsers: scalarTotal(nuJson),
        goalReaches: scalarTotal(goalsAnyJson),
      };
    }

    let previousSummary = null;
    const pm = totalsRow(prevSumJson);
    if (pm.length >= 6) {
      previousSummary = {
        users: pm[0],
        visits: pm[1],
        pageviews: pm[2],
        bounceRate: pm[3],
        avgVisitDurationSeconds: pm[4],
        avgPageViews: pm[5],
        newUsers: scalarTotal(prevNuJson),
      };
    }

    const comparison = summary && previousSummary
      ? {
          users: pctChange(summary.users, previousSummary.users),
          visits: pctChange(summary.visits, previousSummary.visits),
          pageviews: pctChange(summary.pageviews, previousSummary.pageviews),
          bounceRate: pctChange(summary.bounceRate, previousSummary.bounceRate),
          avgVisitDurationSeconds: pctChange(
            summary.avgVisitDurationSeconds,
            previousSummary.avgVisitDurationSeconds,
          ),
          avgPageViews: pctChange(summary.avgPageViews, previousSummary.avgPageViews),
          newUsers: pctChange(summary.newUsers, previousSummary.newUsers),
        }
      : null;

    const bounceRate = Array.isArray(bounceJson?.data)
      ? bounceJson.data.map((row) => ({ date: row.dimensions?.[0]?.name, rate: row.metrics?.[0] }))
      : [];

    const pageDepth = Array.isArray(depthJson?.data)
      ? depthJson.data.map((row) => ({ date: row.dimensions?.[0]?.name, depth: row.metrics?.[0] }))
      : [];

    const byHour = Array.isArray(hourJson?.data)
      ? hourJson.data
          .map((row) => ({
            hour: String(row.dimensions?.[0]?.name ?? row.dimensions?.[0]?.id ?? ''),
            users: row.metrics?.[0] || 0,
          }))
          .sort((a, b) => Number(a.hour) - Number(b.hour))
      : [];

    // Цели из Management API → reaches / conversionRate
    const goalDefs = Array.isArray(goalsListRes?.goals) ? goalsListRes.goals : [];
    const activeGoals = goalDefs.filter((g) => g?.id != null).slice(0, 10);

    let goals = [];
    if (activeGoals.length) {
      const metrics = activeGoals
        .map((g) => `ym:s:goal${g.id}reaches,ym:s:goal${g.id}conversionRate`)
        .join(',');
      const goalsStat = await metrikaGet(base, headers, { ...common, metrics });
      const gTotals = totalsRow(goalsStat);
      goals = activeGoals.map((g, i) => ({
        id: g.id,
        name: g.name || `Цель ${g.id}`,
        reaches: gTotals[i * 2] ?? 0,
        conversionRate: gTotals[i * 2 + 1] ?? 0,
      }));
    }

    return {
      period,
      date1,
      date2,
      previousPeriod: prev,
      visitors,
      avgSessionSec,
      topPages,
      summary,
      previousSummary,
      comparison,
      trafficSources: mapNamedRows(srcJson?.data),
      devices: mapNamedRows(devJson?.data, { nameMap: deviceLabels }),
      bounceRate,
      searchPhrases: mapNamedRows(phraseJson?.data),
      regions: mapNamedRows(regionJson?.data),
      searchEngines: mapNamedRows(engJson?.data),
      browsers: mapNamedRows(browserJson?.data),
      operatingSystems: mapNamedRows(osJson?.data),
      countries: mapNamedRows(countryJson?.data),
      newVsReturning: mapNamedRows(newJson?.data, { nameMap: newUserLabels }),
      entryPages: mapNamedRows(entryJson?.data),
      exitPages: mapNamedRows(exitJson?.data),
      referers: mapNamedRows(refererJson?.data),
      socialNetworks: mapNamedRows(socialJson?.data),
      byHour,
      pageDepth,
      utmSource: mapNamedRows(utmSourceJson?.data),
      utmMedium: mapNamedRows(utmMediumJson?.data),
      utmCampaign: mapNamedRows(utmCampaignJson?.data),
      gender: mapNamedRows(genderJson?.data, { nameMap: genderLabels }),
      age: mapNamedRows(ageJson?.data),
      goals,
    };
  } catch {
    return null;
  }
}

import jwt from 'jsonwebtoken';
async function fetchGoogle() {
  try {
    const propertyId = process.env.GA_PROPERTY_ID;
    const clientEmail = process.env.GA_CLIENT_EMAIL;
    let privateKey = process.env.GA_PRIVATE_KEY;
    if (!propertyId || !clientEmail || !privateKey) return null;
    privateKey = privateKey.replace(/\\n/g, '\n');
    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/analytics.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }, privateKey, { algorithm: 'RS256' });
    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: token }).toString(),
    });
    if (!resp.ok) return null;
    const { access_token } = await resp.json();
    if (!access_token) return null;
    const reportBody = {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'totalUsers' }, { name: 'averageSessionDuration' }],
    };
    const rep = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` }, body: JSON.stringify(reportBody),
    });
    if (!rep.ok) return null;
    const data = await rep.json();
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    if (!rows.length) return null;
    const visitors = rows.map(r => ({ date: r.dimensionValues?.[0]?.value, users: Number(r.metricValues?.[0]?.value || 0) }));
    const avgSessionSec = rows.map(r => ({ date: r.dimensionValues?.[0]?.value, seconds: Number(r.metricValues?.[1]?.value || 0) }));
    // Top pages
    const topBody = {
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 5,
    };
    const topRes = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` }, body: JSON.stringify(topBody),
    });
    if (!topRes.ok) return { visitors, avgSessionSec, topPages: [] };
    const topJson = await topRes.json();
    const topRows = Array.isArray(topJson?.rows) ? topJson.rows : [];
    const topPages = topRows.map(r => ({ path: r.dimensionValues?.[0]?.value, title: r.dimensionValues?.[1]?.value || '', views: Number(r.metricValues?.[0]?.value || 0) }));
    return { visitors, avgSessionSec, topPages };
  } catch { return null; }
}

/** Проверка подключения к Яндекс.Метрике — экспортируется для публичного роута */
export async function checkYandexConnection() {
  const creds = await getYandexMetrikaCredentials();
  if (!creds.token) {
    return {
      connected: false,
      error: 'YANDEX_TOKEN не задан (env или OAuth через /api/metrics/yandex/exchange)',
      counterId: creds.counter || null,
      source: creds.source,
    };
  }
  try {
    const probe = await probeYandexMetrika(creds.token, creds.counter);
    if (!probe.ok) {
      return {
        connected: false,
        error: probe.error,
        httpStatus: probe.status,
        counterId: creds.counter,
        source: creds.source,
      };
    }
    return {
      connected: true,
      counterId: creds.counter,
      counterName: probe.counterName || null,
      source: creds.source,
      warning: probe.warning || undefined,
      visits30d: probe.visits,
      users30d: probe.users,
      pageviews30d: probe.pageviews,
    };
  } catch (e) {
    // токен в БД есть — не заставляем заново проходить OAuth из-за сети/квоты
    return {
      connected: true,
      warning: e?.message || String(e),
      counterId: creds.counter,
      source: creds.source,
    };
  }
}

router.get('/yandex-test', async (_req, res) => {
  try {
    const result = await checkYandexConnection();
    res.json(result);
  } catch (e) {
    res.json({ connected: false, error: e.message });
  }
});

router.get('/yandex/status', async (_req, res) => {
  try {
    res.json(await checkYandexConnection());
  } catch (e) {
    res.json({ connected: false, error: e.message });
  }
});

router.get('/yandex/auth-url', async (_req, res) => {
  const { clientId } = yandexOAuthApp();
  if (!clientId) {
    return res.status(400).json({ error: 'YANDEX_CLIENT_ID не задан в .env' });
  }
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    force_confirm: 'yes',
    scope: 'metrika:read',
  });
  res.json({
    url: `https://oauth.yandex.ru/authorize?${params.toString()}`,
    redirectHint: 'https://oauth.yandex.ru/verification_code',
    counterId: DEFAULT_YANDEX_COUNTER,
  });
});

router.post('/yandex/exchange', async (req, res) => {
  try {
    const code = String(req.body?.code || '').trim();
    if (!code) return res.status(400).json({ error: 'code required' });
    const { clientId, clientSecret } = yandexOAuthApp();
    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: 'YANDEX_CLIENT_ID / YANDEX_CLIENT_SECRET не заданы' });
    }
    const tokenRes = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      return res.status(400).json({ error: tokenJson.error_description || tokenJson.error || 'OAuth failed' });
    }
    await saveYandexTokens({
      access_token: tokenJson.access_token,
      refresh_token: tokenJson.refresh_token,
      expires_in: tokenJson.expires_in,
      counter_id: req.body?.counter_id || DEFAULT_YANDEX_COUNTER,
    });
    res.json(await checkYandexConnection());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/campaign-traffic', async (req, res) => {
  try {
    const pathFilter = String(req.query.path || '').trim();
    if (!pathFilter) return res.status(400).json({ error: 'path required' });
    const creds = await getYandexMetrikaCredentials();
    if (!creds.token) return res.status(503).json({ error: 'Metrika not connected' });

    const date1 = String(req.query.date1 || '30daysAgo');
    const date2 = String(req.query.date2 || 'today');
    const safePath = pathFilter.replace(/'/g, "\\'");
    const filterExpr = encodeURIComponent(`ym:pv:URLPath=@'${safePath}'`);
    const metrics = [
      'ym:pv:pageviews',
      'ym:pv:users',
      'ym:pv:bounceRate',
      'ym:pv:avgVisitDurationSeconds',
      'ym:pv:pageDepth',
    ].join(',');
    const apiUrl = `https://api-metrika.yandex.net/stat/v1/data?ids=${creds.counter}&metrics=${metrics}&dimensions=ym:pv:date&date1=${date1}&date2=${date2}&group=Day&filters=${filterExpr}&sort=ym:pv:date`;
    const apiRes = await fetch(apiUrl, { headers: { Authorization: `OAuth ${creds.token}` } });
    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return res.status(apiRes.status).json({ error: errText.slice(0, 500) });
    }
    const data = await apiRes.json();
    const rows = Array.isArray(data?.data)
      ? data.data.map((row) => ({
          date: row.dimensions?.[0]?.name,
          visits: row.metrics?.[0] ?? 0,
          uniques: row.metrics?.[1] ?? 0,
          bounceRate: row.metrics?.[2] ?? 0,
          avgTimeSeconds: row.metrics?.[3] ?? 0,
          pagesDepth: row.metrics?.[4] ?? 0,
        }))
      : [];
    res.json({ path: pathFilter, counterId: creds.counter, date1, date2, rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/page-traffic', async (req, res) => {
  try {
    const pathFilter = String(req.query.path || '').trim();
    if (!pathFilter) return res.status(400).json({ error: 'path required' });
    const creds = await getYandexMetrikaCredentials();
    if (!creds.token) return res.status(503).json({ error: 'Metrika not connected' });
    const date1 = String(req.query.date1 || '30daysAgo');
    const date2 = String(req.query.date2 || 'today');
    const filterExpr = encodeURIComponent(`ym:pv:URLPath=@'${pathFilter.replace(/'/g, "\\'")}'`);
    const apiUrl = `https://api-metrika.yandex.net/stat/v1/data?ids=${creds.counter}&metrics=ym:pv:pageviews,ym:pv:users&dimensions=ym:pv:date&date1=${date1}&date2=${date2}&group=Day&filters=${filterExpr}`;
    const apiRes = await fetch(apiUrl, { headers: { Authorization: `OAuth ${creds.token}` } });
    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return res.status(apiRes.status).json({ error: errText.slice(0, 500) });
    }
    const data = await apiRes.json();
    const rows = Array.isArray(data?.data)
      ? data.data.map((row) => ({
          date: row.dimensions?.[0]?.name,
          pageviews: row.metrics?.[0] ?? 0,
          users: row.metrics?.[1] ?? 0,
        }))
      : [];
    res.json({ path: pathFilter, counterId: creds.counter, rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/overview', async (req, res) => {
  try {
    const range = resolveMetrikaDates({
      period: req.query.period,
      date1: req.query.date1,
      date2: req.query.date2,
    });
    const [ya, ga, business] = await Promise.all([
      fetchYandex(range),
      fetchGoogle(),
      fetchBusinessStats(),
    ]);
    const days = rangeDays(30);
    let visitors;
    let avgSessionSec;
    let topPages;
    let analyticsSource = 'internal';
    let summary = null;
    let trafficSources = [];
    let devices = [];
    let bounceRate = null;
    let searchPhrases = [];
    let regions = [];
    let searchEngines = [];
    let browsers = [];
    let operatingSystems = [];
    let countries = [];
    let newVsReturning = [];
    let entryPages = [];
    let exitPages = [];
    let referers = [];
    let socialNetworks = [];
    let byHour = [];
    let previousSummary = null;
    let comparison = null;
    let previousPeriod = null;
    let pageDepth = [];
    let pageLoadTime = [];
    let utmSource = [];
    let utmMedium = [];
    let utmCampaign = [];
    let gender = [];
    let age = [];
    let goals = [];

    if (ya) {
      visitors = ya.visitors;
      avgSessionSec = ya.avgSessionSec;
      topPages = ya.topPages || [];
      summary = ya.summary;
      previousSummary = ya.previousSummary || null;
      comparison = ya.comparison || null;
      previousPeriod = ya.previousPeriod || null;
      trafficSources = ya.trafficSources || [];
      devices = ya.devices || [];
      bounceRate = ya.bounceRate;
      searchPhrases = ya.searchPhrases || [];
      regions = ya.regions || [];
      searchEngines = ya.searchEngines || [];
      browsers = ya.browsers || [];
      operatingSystems = ya.operatingSystems || [];
      countries = ya.countries || [];
      newVsReturning = ya.newVsReturning || [];
      entryPages = ya.entryPages || [];
      exitPages = ya.exitPages || [];
      referers = ya.referers || [];
      socialNetworks = ya.socialNetworks || [];
      byHour = ya.byHour || [];
      pageDepth = ya.pageDepth || [];
      pageLoadTime = ya.pageLoadTime || [];
      utmSource = ya.utmSource || [];
      utmMedium = ya.utmMedium || [];
      utmCampaign = ya.utmCampaign || [];
      gender = ya.gender || [];
      age = ya.age || [];
      goals = ya.goals || [];
      analyticsSource = 'yandex';
    } else if (ga) {
      visitors = ga.visitors;
      avgSessionSec = ga.avgSessionSec;
      topPages = ga.topPages || [];
      analyticsSource = 'ga';
    } else {
      try {
        const topRes = await pool.query(`
          SELECT product_slug as path, p.title, COUNT(*)::int as views
          FROM product_analytics pa
          LEFT JOIN products p ON p.slug = pa.product_slug
          WHERE pa.event_type = 'view' AND pa.created_at > NOW() - INTERVAL '7 days'
          GROUP BY pa.product_slug, p.title
          ORDER BY views DESC
          LIMIT 10
        `);
        topPages = topRes.rows.map((r) => ({ path: `/products/${r.path}`, title: r.title || r.path, views: r.views }));
      } catch {
        topPages = [];
      }
      try {
        const visRes = await pool.query(`
          SELECT date_trunc('day', created_at)::date as d,
            COUNT(DISTINCT COALESCE(session_id, 'u'||user_id))::int as users
          FROM product_analytics
          WHERE created_at > NOW() - INTERVAL '30 days'
          GROUP BY 1 ORDER BY 1
        `);
        const visMap = Object.fromEntries((visRes.rows || []).map((r) => [r.d?.toISOString?.()?.slice(0, 10) || r.d, r.users]));
        visitors = days.map((d) => ({ date: d, users: visMap[d] || 0 }));
        avgSessionSec = days.map((d) => ({ date: d, seconds: 90 }));
      } catch {
        visitors = days.map((d) => ({ date: d, users: 0 }));
        avgSessionSec = days.map((d) => ({ date: d, seconds: 0 }));
      }
    }

    res.json({
      period: ya?.period || range.period,
      date1: ya?.date1 || range.date1,
      date2: ya?.date2 || range.date2,
      previousPeriod: previousPeriod || undefined,
      visitors,
      avgSessionSec,
      topPages,
      analyticsSource,
      stats: business || undefined,
      summary: summary || undefined,
      previousSummary: previousSummary || undefined,
      comparison: comparison || undefined,
      trafficSources,
      devices,
      bounceRate: bounceRate || undefined,
      searchPhrases,
      regions,
      searchEngines,
      browsers,
      operatingSystems,
      countries,
      newVsReturning,
      entryPages,
      exitPages,
      referers,
      socialNetworks,
      byHour,
      pageDepth,
      pageLoadTime,
      utmSource,
      utmMedium,
      utmCampaign,
      gender,
      age,
      goals,
    });
  } catch (e) {
    console.error('[metrics] overview error:', e);
    res.status(500).json({
      visitors: rangeDays(30).map((d) => ({ date: d, users: 0 })),
      avgSessionSec: rangeDays(30).map((d) => ({ date: d, seconds: 0 })),
      topPages: [],
      trafficSources: [],
      devices: [],
      searchPhrases: [],
      regions: [],
      searchEngines: [],
      browsers: [],
      operatingSystems: [],
      countries: [],
      newVsReturning: [],
      entryPages: [],
      exitPages: [],
      referers: [],
      socialNetworks: [],
      byHour: [],
      pageDepth: [],
      pageLoadTime: [],
      utmSource: [],
      utmMedium: [],
      utmCampaign: [],
      gender: [],
      age: [],
      goals: [],
      analyticsSource: 'error',
    });
  }
});

export default router;


