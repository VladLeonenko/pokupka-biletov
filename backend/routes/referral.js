/**
 * Публичный capture + админ CRUD/аналитика рефералки.
 */
import { Router } from 'express';
import pool from '../db.js';
import { requireAuth, requireAdminOrSalesManager } from '../middleware/auth.js';
import {
  buildAgentPublicLink,
  captureReferralClick,
  fetchMetrikaByAgentCodes,
  getAgentByCode,
  getReferralAnalytics,
  isReservedReferralCode,
  isValidReferralCode,
  listAgentOrders,
  normalizeReferralCode,
} from '../services/referral.js';

const router = Router();

/** Простой rate-limit: IP → timestamps (антифрод кликов). */
const captureHits = new Map();
const CAPTURE_WINDOW_MS = 60_000;
const CAPTURE_MAX_PER_WINDOW = 40;

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.trim()) return xf.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || '';
}

function allowCapture(ip) {
  const key = ip || 'unknown';
  const now = Date.now();
  let arr = captureHits.get(key) || [];
  arr = arr.filter((t) => now - t < CAPTURE_WINDOW_MS);
  if (arr.length >= CAPTURE_MAX_PER_WINDOW) {
    captureHits.set(key, arr);
    return false;
  }
  arr.push(now);
  captureHits.set(key, arr);
  if (captureHits.size > 5000) {
    const first = captureHits.keys().next().value;
    captureHits.delete(first);
  }
  return true;
}

function isMissingRelation(err) {
  return err?.code === '42P01' || /relation .* does not exist/i.test(String(err?.message || ''));
}

function siteUrl(req) {
  const fromEnv = (process.env.SITE_URL || '').replace(/\/$/, '');
  if (fromEnv && !/localhost|127\.0\.0\.1/i.test(fromEnv)) return fromEnv;
  if (process.env.NODE_ENV === 'production') return 'https://biletvsem.com';
  return (fromEnv || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

function serializeAgent(row, req) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    email: row.email,
    phone: row.phone,
    commission_type: row.commission_type,
    commission_value: Number(row.commission_value),
    cookie_days: row.cookie_days,
    is_active: row.is_active,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    public_link: buildAgentPublicLink(row.code, { siteUrl: siteUrl(req) }),
  };
}

// --- public ---

/** POST /api/referral/capture */
router.post('/capture', async (req, res) => {
  try {
    const ip = clientIp(req);
    if (!allowCapture(ip)) {
      return res.status(429).json({ ok: false, error: 'rate_limited' });
    }

    const code = normalizeReferralCode(req.body?.code ?? req.body?.ref);
    if (!isValidReferralCode(code)) {
      return res.status(400).json({ ok: false, error: 'invalid_code' });
    }

    const captured = await captureReferralClick({
      code,
      visitorKey: req.body?.visitorKey || req.headers['x-visitor-key'],
      sessionId: req.body?.sessionId || req.headers['x-session-id'],
      landingPath: req.body?.landingPath,
      landingUrl: req.body?.landingUrl,
      referer: req.body?.referer || req.get('referer'),
      ip,
      userAgent: req.get('user-agent'),
      ymClientId: req.body?.ymClientId,
      utmSource: req.body?.utmSource,
      utmMedium: req.body?.utmMedium,
      utmCampaign: req.body?.utmCampaign || code,
    });

    if (!captured) {
      return res.status(404).json({ ok: false, error: 'agent_not_found' });
    }

    const maxAge = (captured.cookieDays || 30) * 24 * 60 * 60;
    const secure =
      process.env.NODE_ENV === 'production' ||
      String(process.env.SITE_URL || '').startsWith('https');
    res.cookie('bv_ref', captured.code, {
      maxAge: maxAge * 1000,
      httpOnly: false,
      sameSite: 'lax',
      secure,
      path: '/',
    });
    res.cookie('bv_vid', captured.visitorKey, {
      maxAge: 365 * 24 * 60 * 60 * 1000,
      httpOnly: false,
      sameSite: 'lax',
      secure,
      path: '/',
    });

    return res.json({
      ok: true,
      code: captured.code,
      clickId: captured.clickId,
      visitorKey: captured.visitorKey,
      cookieDays: captured.cookieDays,
      agentName: captured.agent.name,
      deduped: Boolean(captured.deduped),
    });
  } catch (e) {
    if (isMissingRelation(e)) {
      return res.status(503).json({ ok: false, error: 'referral_not_migrated' });
    }
    console.error('[referral] capture:', e);
    return res.status(500).json({ ok: false, error: e.message || 'capture_failed' });
  }
});

/** GET /api/referral/resolve/:code — проверка кода (публично) */
router.get('/resolve/:code', async (req, res) => {
  try {
    const agent = await getAgentByCode(req.params.code, { activeOnly: true });
    if (!agent) return res.status(404).json({ ok: false, error: 'not_found' });
    return res.json({
      ok: true,
      code: agent.code,
      name: agent.name,
      cookieDays: agent.cookie_days,
      publicLink: buildAgentPublicLink(agent.code, { siteUrl: siteUrl(req) }),
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// --- admin ---

const admin = Router();
admin.use(requireAuth, requireAdminOrSalesManager);

admin.get('/agents', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM referral_agents ORDER BY created_at DESC`,
    );
    res.json({ agents: rows.map((r) => serializeAgent(r, req)) });
  } catch (e) {
    if (isMissingRelation(e)) {
      return res.status(503).json({
        error: 'Миграция рефералки не применена (090_referral_system.sql)',
      });
    }
    res.status(500).json({ error: e.message });
  }
});

admin.post('/agents', async (req, res) => {
  try {
    const code = normalizeReferralCode(req.body?.code);
    const name = String(req.body?.name || '').trim();
    if (isReservedReferralCode(code)) {
      return res.status(400).json({ error: 'Этот код зарезервирован системой' });
    }
    if (!isValidReferralCode(code)) {
      return res.status(400).json({ error: 'Код: 2–32 символа [a-z0-9_-], без служебных слов' });
    }
    if (!name) return res.status(400).json({ error: 'Укажите имя агента' });

    const commissionType =
      req.body?.commission_type === 'fixed' ? 'fixed' : 'percent';
    const commissionValue = Number(req.body?.commission_value);
    if (!Number.isFinite(commissionValue) || commissionValue < 0) {
      return res.status(400).json({ error: 'Некорректная комиссия' });
    }
    const cookieDays = Math.min(
      365,
      Math.max(1, Number(req.body?.cookie_days) || 30),
    );

    const { rows } = await pool.query(
      `INSERT INTO referral_agents (
         code, name, email, phone, commission_type, commission_value,
         cookie_days, is_active, notes
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8, TRUE),$9)
       RETURNING *`,
      [
        code,
        name,
        req.body?.email ? String(req.body.email).trim() : null,
        req.body?.phone ? String(req.body.phone).trim() : null,
        commissionType,
        commissionValue,
        cookieDays,
        req.body?.is_active !== false,
        req.body?.notes ? String(req.body.notes).trim() : null,
      ],
    );
    res.status(201).json({ agent: serializeAgent(rows[0], req) });
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'Такой код уже есть' });
    }
    res.status(500).json({ error: e.message });
  }
});

admin.put('/agents/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const cur = await pool.query(`SELECT * FROM referral_agents WHERE id = $1`, [id]);
    if (!cur.rows[0]) return res.status(404).json({ error: 'Не найден' });

    const b = req.body || {};
    let code = cur.rows[0].code;
    if (b.code != null) {
      code = normalizeReferralCode(b.code);
      if (isReservedReferralCode(code)) {
        return res.status(400).json({ error: 'Этот код зарезервирован системой' });
      }
      if (!isValidReferralCode(code)) {
        return res.status(400).json({ error: 'Код: 2–32 символа [a-z0-9_-]' });
      }
    }
    const name = b.name != null ? String(b.name).trim() : cur.rows[0].name;
    if (!name) return res.status(400).json({ error: 'Укажите имя' });

    const commissionType =
      b.commission_type === 'fixed'
        ? 'fixed'
        : b.commission_type === 'percent'
          ? 'percent'
          : cur.rows[0].commission_type;
    const commissionValue =
      b.commission_value != null
        ? Number(b.commission_value)
        : Number(cur.rows[0].commission_value);
    if (!Number.isFinite(commissionValue) || commissionValue < 0) {
      return res.status(400).json({ error: 'Некорректная комиссия' });
    }
    const cookieDays =
      b.cookie_days != null
        ? Math.min(365, Math.max(1, Number(b.cookie_days) || 30))
        : cur.rows[0].cookie_days;

    const { rows } = await pool.query(
      `UPDATE referral_agents SET
         code = $2,
         name = $3,
         email = $4,
         phone = $5,
         commission_type = $6,
         commission_value = $7,
         cookie_days = $8,
         is_active = $9,
         notes = $10,
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        code,
        name,
        b.email !== undefined
          ? b.email
            ? String(b.email).trim()
            : null
          : cur.rows[0].email,
        b.phone !== undefined
          ? b.phone
            ? String(b.phone).trim()
            : null
          : cur.rows[0].phone,
        commissionType,
        commissionValue,
        cookieDays,
        b.is_active !== undefined ? Boolean(b.is_active) : cur.rows[0].is_active,
        b.notes !== undefined
          ? b.notes
            ? String(b.notes).trim()
            : null
          : cur.rows[0].notes,
      ],
    );
    res.json({ agent: serializeAgent(rows[0], req) });
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'Такой код уже есть' });
    }
    res.status(500).json({ error: e.message });
  }
});

admin.delete('/agents/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    // мягкое удаление — деактивация (история кликов/заказов сохраняется)
    const { rows } = await pool.query(
      `UPDATE referral_agents SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1 RETURNING id`,
      [id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Не найден' });
    res.json({ ok: true, deactivated: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

admin.get('/analytics', async (req, res) => {
  try {
    const from = req.query.from ? String(req.query.from) : undefined;
    const to = req.query.to ? String(req.query.to) : undefined;
    const agentId = req.query.agentId ? Number(req.query.agentId) : undefined;
    const withMetrika = req.query.metrika !== '0';

    const analytics = await getReferralAnalytics({ from, to, agentId });

    let metrika = null;
    if (withMetrika && analytics.agents.length) {
      try {
        const codes = analytics.agents.map((a) => a.code);
        metrika = await fetchMetrikaByAgentCodes(codes, {
          from: analytics.from,
          to: analytics.to,
        });
        if (metrika?.ok) {
          analytics.agents = analytics.agents.map((a) => ({
            ...a,
            metrika: metrika.byCode[a.code] || null,
          }));
        }
      } catch (mErr) {
        metrika = { ok: false, reason: mErr?.message || 'metrika_failed', byCode: {} };
      }
    }

    res.json({ ...analytics, metrika });
  } catch (e) {
    if (isMissingRelation(e)) {
      return res.status(503).json({
        error: 'Миграция рефералки не применена (090_referral_system.sql)',
      });
    }
    res.status(500).json({ error: e.message });
  }
});

admin.get('/agents/:id/orders', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const from = req.query.from ? String(req.query.from) : undefined;
    const to = req.query.to ? String(req.query.to) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const orders = await listAgentOrders(id, { from, to, limit });
    res.json({ orders });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.use('/admin', admin);

export default router;
