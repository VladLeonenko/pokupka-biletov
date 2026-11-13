import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireAuth, requireAdmin, requireAdminOrSalesManager } from '../middleware/auth.js';
import { listBuyers, saveBuyers } from '../services/sniperBuyers.js';
import { feeFor, orderStatus, ticketCount } from '../services/sniperFees.js';
import { bookSeatsViaApi, resolveEventSessions, getSessionAvailability, MXAT_APP_KEY } from '../services/afishaApiBooking.js';
import { sendTransactionalMail } from '../services/mail/transporter.js';
import {
  listPayments,
  markPayment,
  paymentSummary,
  registerPendingPayment,
} from '../services/sniperPaymentTracker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_FILE = path.join(__dirname, '..', 'data', 'sniper-results.json');
const CAPTCHA_DIR = path.join(__dirname, '..', 'data', 'captcha');
const CAPTCHA_CURRENT = path.join(CAPTCHA_DIR, 'current.json');
const CAPTCHA_ANSWER = path.join(CAPTCHA_DIR, 'answer.json');
const CONTACTS_FILE = path.join(__dirname, '..', 'sniper-contacts.json');
const PAY_STATUS_FILE = path.join(__dirname, '..', 'data', 'sniper-payment-status.json');

// Кэш статусов оплаты: { checkedAt, orders: { orderId: { status, manual?, checkedAt } } }.
function readPayStatus() {
  try { return JSON.parse(fs.readFileSync(PAY_STATUS_FILE, 'utf-8')); } catch { return { checkedAt: null, orders: {} }; }
}
function writePayStatus(s) {
  fs.mkdirSync(path.dirname(PAY_STATUS_FILE), { recursive: true });
  fs.writeFileSync(PAY_STATUS_FILE, JSON.stringify(s, null, 2));
}

// "Сектор, ряд X, места Y-Z (цена ₽ × N)" → { sector, row, seats }.
function parseSeatLabel(seats) {
  const m = String(seats || '').match(/^(.*?),\s*ряд\s+(\d+),\s*места\s+([\d-]+)/);
  if (!m) return { sector: '', row: '', seats: String(seats || '') };
  return { sector: m[1].trim(), row: m[2], seats: m[3] };
}

// Боевые сессии: sessionId → дата/спектакль и цель (пар).
// Добавляйте сюда новые спектакли/даты — админка сгруппирует историю автоматически.
const BATTLE_SESSIONS = [
  { sessionId: '135037141', label: '20 ноября', spectacle: 'Кабала святош', target: 40 },
  { sessionId: '135088882', label: '21 ноября', spectacle: 'Кабала святош', target: 20 },
];

const SESSION_META = new Map(BATTLE_SESSIONS.map((s) => [s.sessionId, s]));

// «2026-09-18T19:00:00» (время МХТ/Москвы без зоны) → «пт, 18 сентября · 19:00».
function formatRuDate(iso) {
  if (!iso) return '';
  const raw = String(iso).trim();
  const withZone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(raw) ? `${raw}+03:00` : raw;
  const d = new Date(withZone);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
    hour12: false,
  });
}

function sessionMeta(rec) {
  const sid = String(rec.sessionId);
  const m = SESSION_META.get(sid);
  if (m) return { label: m.label, spectacle: m.spectacle };
  return {
    label: rec.label || formatRuDate(rec.date) || sid,
    spectacle: rec.spectacle || 'Кабала святош',
  };
}

function readResults() {
  try { return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8')); } catch { return []; }
}

function saveResults(record) {
  fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
  const list = readResults();
  list.push(record);
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(list, null, 2));
}

/**
 * POST /api/snipe — бронирование лучших соседних мест через API Афиши.
 * Тело: { sessionId?|url?, appKey?, pairCount?, contacts?: [{ name, email, phone }] }
 *
 * GET /api/snipe/results — сохранённые результаты (для админки).
 */
export const sniperRouter = express.Router();

sniperRouter.get('/results', requireAuth, requireAdminOrSalesManager, (req, res) => {
  const pay = readPayStatus();
  const data = readResults().map((rec) => {
    const meta = sessionMeta(rec);
    return {
      ...rec,
      label: meta.label,
      spectacle: meta.spectacle,
      results: (rec.results || []).map((r) => {
        const p = parseSeatLabel(r.seats);
        return {
          ...r,
          sector: p.sector,
          row: p.row,
          seatNums: p.seats,
          paymentStatus: r.orderId ? pay.orders[r.orderId]?.status || null : null,
          paymentManual: r.orderId ? !!pay.orders[r.orderId]?.manual : false,
        };
      }),
    };
  });
  res.json({ success: true, data });
});

// Проверка статусов оплаты всех заказов через API Афиши (кэшируется в файл).
sniperRouter.get('/check-payments', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const orders = [];
    for (const rec of readResults()) for (const o of rec.results || []) if (o.orderId) orders.push(o);
    const st = readPayStatus();
    for (const o of orders) {
      try {
        const prev = st.orders[o.orderId] || {};
        if (prev.manual && prev.status === 'success') continue;
        const r = await fetch(`https://mapi.afisha.ru/api/v21/payments/${o.orderId}`, {
          headers: { 'X-Application-Key': MXAT_APP_KEY, 'X-City-Id': '2563', Referer: 'https://www.afisha.ru/' },
        });
        const j = await r.json().catch(() => ({}));
        st.orders[o.orderId] = { ...prev, status: j.status ?? '?', checkedAt: new Date().toISOString(), manual: !!prev.manual };
      } catch {}
      await new Promise((r2) => setTimeout(r2, 200));
    }
    st.checkedAt = new Date().toISOString();
    writePayStatus(st);
    res.json({ success: true, checkedAt: st.checkedAt });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// Ручная отметка «оплачено» по заказу.
sniperRouter.post('/mark-paid', requireAuth, requireAdminOrSalesManager, (req, res) => {
  const { orderId, platform } = req.body || {};
  if (!orderId) return res.status(400).json({ error: 'orderId обязателен' });
  // legacy afisha file
  const st = readPayStatus();
  st.orders[orderId] = { ...(st.orders[orderId] || {}), status: 'success', manual: true, checkedAt: new Date().toISOString() };
  writePayStatus(st);
  // unified ledger (Opera/Vakhtangov/…)
  if (platform) {
    registerPendingPayment({ platform, orderId, tickets: req.body?.tickets, amount: req.body?.amount, label: req.body?.label });
    markPayment({ platform, orderId }, {
      status: 'paid',
      manual: true,
      paidAt: new Date().toISOString(),
      lastCheckDetail: 'manual mark-paid',
      tickets: req.body?.tickets,
      amount: req.body?.amount,
      seats: req.body?.seats,
    });
  }
  res.json({ success: true, orderId, platform: platform || null });
});

/** Ledger оплат всех снайперов (live-tracker). */
sniperRouter.get('/payments', requireAuth, requireAdminOrSalesManager, (req, res) => {
  const fee = Number(process.env.SNIPER_FEE_PER_TICKET || 0);
  const { orders, updatedAt } = listPayments({
    status: req.query.status || undefined,
    platform: req.query.platform || undefined,
  });
  res.json({ success: true, updatedAt, summary: paymentSummary(fee), data: orders });
});

let statusCache = { at: 0, body: null };

/** Боевой статус: сессии, прогресс, контакты, доступность, ссылки на оплату. */
sniperRouter.get('/status', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  if (statusCache.body && Date.now() - statusCache.at < 15000) {
    return res.json(statusCache.body);
  }
  try {
    let contacts = [];
    try { contacts = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf-8')); } catch {}
    const results = readResults();
    const booked = {};
    for (const rec of results) {
      const sid = String(rec.sessionId);
      booked[sid] = (booked[sid] || 0) + (rec.results?.length || 0);
    }
    const sessions = [];
    for (const s of BATTLE_SESSIONS) {
      const a = await getSessionAvailability(s.sessionId).catch(() => ({ availableCount: 0, minPrice: null }));
      const b = booked[s.sessionId] || 0;
      sessions.push({
        sessionId: s.sessionId,
        label: s.label,
        spectacle: s.spectacle,
        target: s.target,
        booked: b,
        remaining: Math.max(0, s.target - b),
        available: a.availableCount || 0,
        minPrice: a.minPrice ?? null,
        open: (a.availableCount || 0) > 0,
      });
    }
    const body = { success: true, data: { sessions, contacts } };
    statusCache = { at: Date.now(), body };
    res.json(body);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

function buyerText(b) {
  if (!b) return '';
  if (typeof b === 'string') return b;
  if (Array.isArray(b)) return b.map(buyerText).filter(Boolean).join(', ');
  const name = b.name || b.fullName || '';
  return [name, b.email].filter(Boolean).join(' · ');
}

function withFee(row) {
  const tickets = ticketCount(row.seats, row.tickets);
  const status = orderStatus(row);
  const quote = feeFor({ ...row, tickets });
  return {
    ...row,
    tickets: tickets || row.tickets || null,
    status,
    fee: status === 'paid' ? quote.fee : null,
    feeNote: quote.feeNote,
  };
}

/** Очередь оплат: ledger + история Афиши + живые брони Театра Наций. */
sniperRouter.get('/queue', requireAuth, requireAdminOrSalesManager, (req, res) => {
  const { orders, updatedAt } = listPayments();
  const byKey = new Map();
  for (const o of orders) {
    byKey.set(o.id || `${o.platform}:${o.orderId}`, {
      id: o.id || `${o.platform}:${o.orderId}`,
      platform: o.platform,
      orderId: o.orderId,
      bookedAt: o.registeredAt || null,
      show: o.label || o.platform,
      seats: o.seats || '',
      buyer: buyerText(o.buyers),
      amount: o.amount ?? null,
      tickets: o.tickets ?? null,
      status: o.status || null,
      trackUntil: o.trackUntil || null,
      paymentUrl: o.paymentUrl || null,
      paidAt: o.paidAt || null,
      accountEmail: null,
    });
  }
  const pay = readPayStatus();
  for (const rec of readResults()) {
    const show = rec.spectacle || sessionMeta(rec).spectacle;
    for (const r of rec.results || []) {
      const orderId = r.orderId ? String(r.orderId) : '';
      if (orderId && [...byKey.values()].some((x) => String(x.orderId) === orderId)) continue;
      const key = orderId ? `afisha:${orderId}` : `afisha:${rec.bookedAt || ''}:${r.email || ''}:${r.paymentUrl || ''}`;
      const st = orderId ? pay.orders[orderId]?.status : null;
      byKey.set(key, {
        id: key,
        platform: 'afisha',
        orderId: orderId || null,
        bookedAt: rec.bookedAt || null,
        show: show || 'Афиша',
        seats: r.seats || '',
        buyer: [r.name, r.email].filter(Boolean).join(' · '),
        amount: r.totalPrice ?? null,
        tickets: null,
        status: st,
        trackUntil: null,
        paymentUrl: r.paymentUrl || null,
        paidAt: st === 'success' ? (pay.orders[orderId]?.checkedAt || null) : null,
        accountEmail: null,
      });
    }
  }
  const tonFile = path.join(__dirname, '..', 'data', 'ton-account-state.json');
  let ton = {};
  try { ton = JSON.parse(fs.readFileSync(tonFile, 'utf8')); } catch { ton = {}; }
  for (const [email, a] of Object.entries(ton || {})) {
    if (!a || a.status !== 'locked') continue;
    const id = `ton:${email}`;
    byKey.set(id, {
      id,
      platform: 'ton',
      orderId: email,
      bookedAt: a.lockedAt || null,
      show: a.sessionLabel ? `Обыкновенная смерть · ${a.sessionLabel}` : 'Обыкновенная смерть',
      seats: a.seats || '',
      buyer: email,
      amount: null,
      tickets: null,
      status: 'pending',
      trackUntil: a.lockedAt ? new Date(Date.parse(a.lockedAt) + 45 * 60_000).toISOString() : null,
      paymentUrl: a.paymentUrl || null,
      paidAt: null,
      accountEmail: email,
    });
  }
  const data = [...byKey.values()].map(withFee).sort((a, b) => String(b.bookedAt || '').localeCompare(String(a.bookedAt || '')));
  const feePaid = data.reduce((sum, row) => sum + (row.fee || 0), 0);
  res.json({ success: true, updatedAt, feePaid, summary: paymentSummary(Number(process.env.SNIPER_FEE_PER_TICKET || 0)), data });
});

sniperRouter.get('/buyers', requireAuth, requireAdmin, (req, res) => {
  res.json({ success: true, data: listBuyers() });
});

sniperRouter.put('/buyers', requireAuth, requireAdmin, (req, res) => {
  try {
    const data = saveBuyers(req.body?.buyers ?? req.body);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

/** Текущая капча для ручного решения (если снайпер ждёт ввода). */
sniperRouter.get('/captcha', requireAuth, requireAdminOrSalesManager, (req, res) => {
  let current = null;
  try { current = JSON.parse(fs.readFileSync(CAPTCHA_CURRENT, 'utf-8')); } catch { current = null; }
  res.json({ success: true, data: current });
});

/** Ручной ответ на капчу — снайпер подхватит из answer.json. */
sniperRouter.post('/captcha/answer', requireAuth, requireAdminOrSalesManager, (req, res) => {
  const { token, answer } = req.body || {};
  if (!token || !answer) return res.status(400).json({ error: 'token и answer обязательны' });
  fs.mkdirSync(CAPTCHA_DIR, { recursive: true });
  fs.writeFileSync(CAPTCHA_ANSWER, JSON.stringify({ token: String(token), answer: String(answer).trim(), at: new Date().toISOString() }, null, 2));
  res.json({ success: true });
});

sniperRouter.post('/', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const { sessionId, url, appKey, pairCount, contacts, notifyEmail } = req.body || {};

    let sid = sessionId;
    if (!sid && url) {
      const { sessions } = await resolveEventSessions(url, appKey);
      const onSale = sessions.find((s) => /КУПИТЬ/i.test(s.status)) || sessions[0];
      if (!onSale) return res.status(400).json({ error: 'не найдены сессии события' });
      sid = onSale.sessionId;
    }
    if (!sid) return res.status(400).json({ error: 'sessionId или url обязателен' });

    const contactsList = Array.isArray(contacts) ? contacts : contacts ? [contacts] : [];
    if (!contactsList.length || !contactsList[0].name || !contactsList[0].email) {
      return res.status(400).json({ error: 'contacts[0].name и contacts[0].email обязательны' });
    }

    const { results, errors } = await bookSeatsViaApi({
      sessionId: sid,
      appKey,
      pairCount: Number.isFinite(Number(pairCount)) ? Number(pairCount) : 1,
      contacts: contactsList.map((c) => ({
        name: String(c.name).trim(),
        email: String(c.email).trim(),
        phone: String(c.phone ?? '').trim(),
      })),
    });

    const record = { sessionId: String(sid), date: null, bookedAt: new Date().toISOString(), results, errors };
    saveResults(record);

    if (notifyEmail) {
      const lines = results.map((r) => `${r.seats} — ${r.totalPrice} ₽ — ${r.paymentUrl}`);
      await sendTransactionalMail({
        to: notifyEmail,
        subject: `Бронирование: ${results.length} заказов`,
        text: ['Ссылки на оплату:', ...lines.map((l) => '  ' + l)].join('\n'),
      }).catch(() => {});
    }

    const rows = results.map((r) => ({
      email: r.email,
      success: true,
      seats: r.seats,
      totalPrice: r.totalPrice,
      paymentUrl: r.paymentUrl,
      error: null,
    }));
    for (const e of errors) {
      rows.push({ email: e.email || '', success: false, seats: null, totalPrice: null, paymentUrl: null, error: e.error });
    }

    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});




