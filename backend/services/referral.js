/**
 * Рефералка: агенты, клики, атрибуция заказов, конверсии, аналитика + Metrika.
 */
import crypto from 'node:crypto';
import pool from '../db.js';

const CODE_RE = /^[a-z0-9][a-z0-9_-]{1,31}$/;
const DEFAULT_COOKIE_DAYS = 30;
const DEFAULT_YANDEX_COUNTER = process.env.YANDEX_COUNTER_ID || '109119282';
/** Нельзя занимать служебные пути / slug'и. */
const RESERVED_CODES = new Set([
  'admin',
  'api',
  'auth',
  'login',
  'logout',
  'orders',
  'order',
  'ticket',
  'tickets',
  'events',
  'event',
  'cart',
  'account',
  'r',
  'ref',
  'referral',
  'static',
  'assets',
  'favicon',
  'sitemap',
  'robots',
  'health',
  'metrics',
  'webhook',
  'webhooks',
  'gift',
  'faq',
  'returns',
  'contacts',
  'privacy',
  'offer',
  'cookies',
  'requisites',
  'search',
  'wishlist',
  'afisha',
]);

export function normalizeReferralCode(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .slice(0, 32);
}

export function isValidReferralCode(code) {
  return CODE_RE.test(code) && !RESERVED_CODES.has(code);
}

export function isReservedReferralCode(code) {
  return RESERVED_CODES.has(normalizeReferralCode(code));
}

function hashIp(ip) {
  const s = String(ip || '').trim();
  if (!s) return null;
  const salt = process.env.REFERRAL_IP_SALT || process.env.JWT_SECRET || 'bv-ref';
  return crypto.createHash('sha256').update(`${salt}:${s}`).digest('hex').slice(0, 32);
}

function digitsPhone(v) {
  return String(v || '').replace(/\D/g, '');
}

function normalizeEmail(v) {
  return String(v || '').trim().toLowerCase();
}

/**
 * percent — от наценки (прибыли), не от GMV.
 * fixed — фикс ₽ за оплаченный заказ.
 */
function calcCommissionCents(agent, { markupCents = 0 } = {}) {
  const val = Number(agent.commission_value) || 0;
  if (agent.commission_type === 'fixed') {
    return Math.max(0, Math.round(val * 100));
  }
  const base = Math.max(0, Number(markupCents) || 0);
  return Math.max(0, Math.round((base * val) / 100));
}

function markupCentsFromOrder(orderRow) {
  const meta =
    orderRow?.payment_metadata && typeof orderRow.payment_metadata === 'object'
      ? orderRow.payment_metadata
      : {};
  if (meta.markupRub != null && Number.isFinite(Number(meta.markupRub))) {
    return Math.max(0, Math.round(Number(meta.markupRub) * 100));
  }
  if (meta.markup_cents != null && Number.isFinite(Number(meta.markup_cents))) {
    return Math.max(0, Math.round(Number(meta.markup_cents)));
  }
  // Старые заказы без markupRub — комиссия 0% (не считаем от GMV)
  return 0;
}

export async function getAgentByCode(code, { activeOnly = true } = {}) {
  const c = normalizeReferralCode(code);
  if (!isValidReferralCode(c)) return null;
  const q = activeOnly
    ? `SELECT * FROM referral_agents WHERE code = $1 AND is_active = TRUE`
    : `SELECT * FROM referral_agents WHERE code = $1`;
  const { rows } = await pool.query(q, [c]);
  return rows[0] || null;
}

export async function getAgentById(id) {
  const { rows } = await pool.query(`SELECT * FROM referral_agents WHERE id = $1`, [id]);
  return rows[0] || null;
}

export function buildAgentPublicLink(code, { siteUrl, to } = {}) {
  let base = String(siteUrl || process.env.SITE_URL || 'https://biletvsem.com').replace(/\/$/, '');
  // Не отдаём агентам localhost/IP из неправильного Host
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0|:\d{4,5}$/i.test(base) || /^https?:\/\/\d+\.\d+\.\d+\.\d+/i.test(base)) {
    if (process.env.NODE_ENV === 'production') {
      base = 'https://biletvsem.com';
    }
  }
  const c = normalizeReferralCode(code);
  const params = new URLSearchParams();
  params.set('utm_source', 'referral');
  params.set('utm_medium', 'agent');
  params.set('utm_campaign', c);
  const toPath = String(to || '');
  if (toPath.startsWith('/') && !toPath.startsWith('//') && !/^[a-z][a-z0-9+.-]*:/i.test(toPath)) {
    params.set('to', toPath.slice(0, 500));
  }
  return `${base}/r/${encodeURIComponent(c)}?${params.toString()}`;
}

/**
 * Запись клика + last-click атрибуция.
 * @returns {{ agent, clickId, cookieDays, code } | null}
 */
export async function captureReferralClick({
  code,
  visitorKey,
  sessionId,
  landingPath,
  landingUrl,
  referer,
  ip,
  userAgent,
  ymClientId,
  utmSource,
  utmMedium,
  utmCampaign,
}) {
  const agent = await getAgentByCode(code, { activeOnly: true });
  if (!agent) return null;

  const vid = String(visitorKey || '').trim().slice(0, 64) || crypto.randomUUID();

  // Дедуп: тот же visitor+agent за 60с (StrictMode / двойной hit) — не плодим клики
  const recent = await pool.query(
    `SELECT id FROM referral_clicks
     WHERE agent_id = $1 AND visitor_key = $2
       AND created_at > NOW() - INTERVAL '60 seconds'
     ORDER BY created_at DESC LIMIT 1`,
    [agent.id, vid],
  );
  if (recent.rows[0]) {
    return {
      agent,
      clickId: recent.rows[0].id,
      cookieDays: agent.cookie_days || DEFAULT_COOKIE_DAYS,
      code: agent.code,
      visitorKey: vid,
      deduped: true,
    };
  }

  const { rows } = await pool.query(
    `INSERT INTO referral_clicks (
       agent_id, visitor_key, session_id, landing_path, landing_url, referer,
       ip_hash, user_agent, ym_client_id, utm_source, utm_medium, utm_campaign
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id`,
    [
      agent.id,
      vid,
      sessionId ? String(sessionId).slice(0, 120) : null,
      landingPath ? String(landingPath).slice(0, 500) : null,
      landingUrl ? String(landingUrl).slice(0, 1000) : null,
      referer ? String(referer).slice(0, 1000) : null,
      hashIp(ip),
      userAgent ? String(userAgent).slice(0, 500) : null,
      ymClientId ? String(ymClientId).slice(0, 64) : null,
      (utmSource || 'referral').slice(0, 64),
      (utmMedium || 'agent').slice(0, 64),
      (utmCampaign || agent.code).slice(0, 64),
    ],
  );

  return {
    agent,
    clickId: rows[0].id,
    cookieDays: agent.cookie_days || DEFAULT_COOKIE_DAYS,
    code: agent.code,
    visitorKey: vid,
  };
}

/** Антифрод: агент не получает кредит за свой заказ. */
export function isSelfReferral(agent, { email, phone } = {}) {
  if (!agent) return false;
  const aEmail = normalizeEmail(agent.email);
  const cEmail = normalizeEmail(email);
  if (aEmail && cEmail && aEmail === cEmail) return true;
  const aPhone = digitsPhone(agent.phone);
  const cPhone = digitsPhone(phone);
  if (aPhone.length >= 10 && cPhone.length >= 10) {
    if (aPhone.slice(-10) === cPhone.slice(-10)) return true;
  }
  return false;
}

/**
 * Резолв атрибуции для checkout: body.refCode > cookie/header code.
 * Last-click в окне cookie_days.
 */
export async function resolveAttributionForCheckout({
  refCode,
  visitorKey,
  sessionId,
  customerEmail,
  customerPhone,
}) {
  let agent = null;
  let clickId = null;

  if (refCode) {
    agent = await getAgentByCode(refCode, { activeOnly: true });
  }

  if (!agent && visitorKey) {
    const { rows } = await pool.query(
      `SELECT c.id AS click_id, a.*
       FROM referral_clicks c
       JOIN referral_agents a ON a.id = c.agent_id
       WHERE c.visitor_key = $1
         AND a.is_active = TRUE
         AND c.created_at > NOW() - make_interval(days => COALESCE(a.cookie_days, $2))
       ORDER BY c.created_at DESC
       LIMIT 1`,
      [String(visitorKey).slice(0, 64), DEFAULT_COOKIE_DAYS],
    );
    if (rows[0]) {
      clickId = rows[0].click_id;
      agent = rows[0];
      // strip join extras for cleaner object — agent fields include click_id
      delete agent.click_id;
    }
  }

  if (!agent && sessionId) {
    const { rows } = await pool.query(
      `SELECT c.id AS click_id, a.*
       FROM referral_clicks c
       JOIN referral_agents a ON a.id = c.agent_id
       WHERE c.session_id = $1
         AND a.is_active = TRUE
         AND c.created_at > NOW() - make_interval(days => COALESCE(a.cookie_days, $2))
       ORDER BY c.created_at DESC
       LIMIT 1`,
      [String(sessionId).slice(0, 120), DEFAULT_COOKIE_DAYS],
    );
    if (rows[0]) {
      clickId = rows[0].click_id;
      agent = rows[0];
      delete agent.click_id;
    }
  }

  if (!agent) return null;
  if (isSelfReferral(agent, { email: customerEmail, phone: customerPhone })) {
    return { skipped: true, reason: 'self_referral', agent };
  }

  if (!clickId && visitorKey) {
    const { rows } = await pool.query(
      `SELECT id FROM referral_clicks
       WHERE agent_id = $1 AND visitor_key = $2
       ORDER BY created_at DESC LIMIT 1`,
      [agent.id, String(visitorKey).slice(0, 64)],
    );
    clickId = rows[0]?.id ?? null;
  }

  return { agent, clickId, skipped: false };
}

export async function recordReferralConversion(orderRow) {
  if (!orderRow?.referral_agent_id) return null;
  const agent = await getAgentById(orderRow.referral_agent_id);
  if (!agent) return null;

  const amountCents = Number(orderRow.total_cents) || 0;
  const markupCents = markupCentsFromOrder(orderRow);
  const commissionCents = calcCommissionCents(agent, { markupCents });

  const { rows } = await pool.query(
    `INSERT INTO referral_conversions (
       agent_id, order_id, click_id, amount_cents, commission_cents, status, paid_at, notes
     ) VALUES ($1,$2,$3,$4,$5,'approved', NOW(), $6)
     ON CONFLICT (order_id) DO UPDATE SET
       amount_cents = EXCLUDED.amount_cents,
       commission_cents = EXCLUDED.commission_cents,
       notes = EXCLUDED.notes,
       status = CASE
         WHEN referral_conversions.status = 'reversed' THEN 'approved'
         ELSE referral_conversions.status
       END,
       paid_at = COALESCE(referral_conversions.paid_at, NOW()),
       reversed_at = NULL
     RETURNING *`,
    [
      agent.id,
      orderRow.id,
      orderRow.referral_click_id || null,
      amountCents,
      commissionCents,
      `markup_cents=${markupCents}`,
    ],
  );
  return rows[0] || null;
}

export async function reverseReferralConversion(orderId, note) {
  const { rows } = await pool.query(
    `UPDATE referral_conversions
     SET status = 'reversed', reversed_at = NOW(),
         notes = COALESCE($2, notes)
     WHERE order_id = $1 AND status <> 'reversed'
     RETURNING *`,
    [orderId, note || 'refund/cancel'],
  );
  return rows[0] || null;
}

function parseDateRange(from, to) {
  const toDate = to ? new Date(to) : new Date();
  const fromDate = from
    ? new Date(from)
    : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new Error('Некорректный период');
  }
  // inclusive end of day
  const toEnd = new Date(toDate);
  toEnd.setHours(23, 59, 59, 999);
  return { fromDate, toDate: toEnd };
}

/**
 * Воронка по агентам: клики / уники / чекауты / брошенные / оплаты / GMV / комиссия.
 */
export async function getReferralAnalytics({ from, to, agentId } = {}) {
  const { fromDate, toDate } = parseDateRange(from, to);
  const params = [fromDate.toISOString(), toDate.toISOString()];
  let agentFilter = '';
  if (agentId) {
    params.push(Number(agentId));
    agentFilter = ` AND a.id = $${params.length}`;
  }

  const { rows } = await pool.query(
    `SELECT
       a.id,
       a.code,
       a.name,
       a.is_active,
       a.commission_type,
       a.commission_value,
       COALESCE(clk.clicks, 0)::int AS clicks,
       COALESCE(clk.visitors, 0)::int AS visitors,
       COALESCE(ord.checkouts, 0)::int AS checkouts,
       COALESCE(ord.abandoned, 0)::int AS abandoned,
       COALESCE(ord.paid_orders, 0)::int AS paid_orders,
       COALESCE(ord.paid_cents, 0)::bigint AS paid_cents,
       COALESCE(conv.commission_cents, 0)::bigint AS commission_cents,
       COALESCE(conv.reversed_orders, 0)::int AS reversed_orders
     FROM referral_agents a
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*)::int AS clicks,
         COUNT(DISTINCT visitor_key)::int AS visitors
       FROM referral_clicks c
       WHERE c.agent_id = a.id
         AND c.created_at >= $1::timestamptz
         AND c.created_at <= $2::timestamptz
     ) clk ON TRUE
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*) FILTER (WHERE TRUE)::int AS checkouts,
         COUNT(*) FILTER (
           WHERE COALESCE(o.payment_status, '') <> 'paid'
         )::int AS abandoned,
         COUNT(*) FILTER (
           WHERE o.payment_status = 'paid'
         )::int AS paid_orders,
         COALESCE(SUM(o.total_cents) FILTER (
           WHERE o.payment_status = 'paid'
         ), 0)::bigint AS paid_cents
       FROM orders o
       WHERE o.referral_agent_id = a.id
         AND o.created_at >= $1::timestamptz
         AND o.created_at <= $2::timestamptz
     ) ord ON TRUE
     LEFT JOIN LATERAL (
       SELECT
         COALESCE(SUM(rc.commission_cents) FILTER (
           WHERE rc.status IN ('approved', 'held')
         ), 0)::bigint AS commission_cents,
         COUNT(*) FILTER (WHERE rc.status = 'reversed')::int AS reversed_orders
       FROM referral_conversions rc
       WHERE rc.agent_id = a.id
         AND rc.paid_at >= $1::timestamptz
         AND rc.paid_at <= $2::timestamptz
     ) conv ON TRUE
     WHERE 1=1 ${agentFilter}
     ORDER BY paid_cents DESC, visitors DESC, a.name ASC`,
    params,
  );

  const totals = rows.reduce(
    (acc, r) => {
      acc.clicks += r.clicks;
      acc.visitors += r.visitors;
      acc.checkouts += r.checkouts;
      acc.abandoned += r.abandoned;
      acc.paidOrders += r.paid_orders;
      acc.paidCents += Number(r.paid_cents) || 0;
      acc.commissionCents += Number(r.commission_cents) || 0;
      return acc;
    },
    {
      clicks: 0,
      visitors: 0,
      checkouts: 0,
      abandoned: 0,
      paidOrders: 0,
      paidCents: 0,
      commissionCents: 0,
    },
  );

  return {
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    totals,
    agents: rows.map((r) => ({
      ...r,
      paid_cents: Number(r.paid_cents) || 0,
      commission_cents: Number(r.commission_cents) || 0,
      conversion_rate:
        r.visitors > 0 ? Number(((r.paid_orders / r.visitors) * 100).toFixed(2)) : 0,
      checkout_rate:
        r.visitors > 0 ? Number(((r.checkouts / r.visitors) * 100).toFixed(2)) : 0,
      abandon_rate:
        r.checkouts > 0 ? Number(((r.abandoned / r.checkouts) * 100).toFixed(2)) : 0,
      public_link: buildAgentPublicLink(r.code),
    })),
  };
}

export async function listAgentOrders(agentId, { from, to, limit = 100 } = {}) {
  const { fromDate, toDate } = parseDateRange(from, to);
  const { rows } = await pool.query(
    `SELECT
       o.id, o.order_number, o.status, o.payment_status, o.total_cents, o.currency,
       o.customer_name, o.customer_email, o.customer_phone,
       o.created_at, o.updated_at,
       o.payment_metadata->>'eventTitle' AS event_title,
       rc.status AS conversion_status,
       rc.commission_cents
     FROM orders o
     LEFT JOIN referral_conversions rc ON rc.order_id = o.id
     WHERE o.referral_agent_id = $1
       AND o.created_at >= $2::timestamptz
       AND o.created_at <= $3::timestamptz
     ORDER BY o.created_at DESC
     LIMIT $4`,
    [agentId, fromDate.toISOString(), toDate.toISOString(), Math.min(500, Math.max(1, limit))],
  );
  return rows;
}

async function getMetrikaCreds() {
  try {
    const { rows } = await pool.query('SELECT * FROM yandex_metrika_config WHERE id = 1');
    const row = rows[0];
    if (row?.access_token) {
      return {
        token: row.access_token,
        counter: row.counter_id || DEFAULT_YANDEX_COUNTER,
      };
    }
  } catch {
    /* ignore */
  }
  if (process.env.YANDEX_TOKEN) {
    return { token: process.env.YANDEX_TOKEN, counter: DEFAULT_YANDEX_COUNTER };
  }
  return null;
}

/**
 * Best-effort: визиты Метрики по utm_campaign = code агента.
 * Не ломает отчёт при квоте/ошибке.
 */
export async function fetchMetrikaByAgentCodes(codes, { from, to } = {}) {
  const creds = await getMetrikaCreds();
  if (!creds?.token || !codes?.length) {
    return { ok: false, reason: creds ? 'no_codes' : 'no_token', byCode: {} };
  }

  const { fromDate, toDate } = parseDateRange(from, to);
  const date1 = fromDate.toISOString().slice(0, 10);
  const date2 = toDate.toISOString().slice(0, 10);

  const url = new URL('https://api-metrika.yandex.net/stat/v1/data');
  url.searchParams.set('ids', String(creds.counter));
  url.searchParams.set('metrics', 'ym:s:visits,ym:s:users,ym:s:bounceRate');
  url.searchParams.set('dimensions', 'ym:s:UTMCampaign');
  url.searchParams.set('date1', date1);
  url.searchParams.set('date2', date2);
  url.searchParams.set('limit', '100');
  // фильтр: utm_source=referral ИЛИ campaign из списка
  const codeFilters = codes
    .slice(0, 40)
    .map((c) => `ym:s:UTMCampaign=='${String(c).replace(/'/g, "\\'")}'`)
    .join(' OR ');
  url.searchParams.set(
    'filters',
    `ym:s:UTMSource=='referral' AND (${codeFilters})`,
  );

  try {
    const res = await fetch(url, {
      headers: { Authorization: `OAuth ${creds.token}` },
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        reason: json?.errors?.[0]?.message || `HTTP ${res.status}`,
        byCode: {},
      };
    }
    const byCode = {};
    for (const row of json?.data || []) {
      const code = String(row?.dimensions?.[0]?.name || '').toLowerCase();
      if (!code) continue;
      const m = row.metrics || [];
      byCode[code] = {
        visits: Math.round(Number(m[0]) || 0),
        users: Math.round(Number(m[1]) || 0),
        bounceRate: Number(m[2]) || 0,
      };
    }
    return { ok: true, byCode, date1, date2 };
  } catch (e) {
    return { ok: false, reason: e?.message || 'metrika_error', byCode: {} };
  }
}
