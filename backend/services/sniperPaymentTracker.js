/**
 * Единый реестр оплат снайперов.
 *
 * Важно: постфактум (через дни) Radario/Ticketland часто не отличить paid от expired —
 * заказ пропадает из payment API. Поэтому статус надо ловить LIVE в окне оплаты.
 *
 * usage:
 *   import { registerPendingPayment, listPayments, markPayment } from './sniperPaymentTracker.js';
 *   registerPendingPayment({ platform:'radario', orderId, qrId, ... });
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const LEDGER_FILE = path.join(DATA_DIR, 'sniper-payment-ledger.json');

const STATUSES = new Set(['pending', 'paid', 'expired', 'gone', 'error', 'unknown']);

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readLedger() {
  try {
    const j = JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'));
    if (!j || typeof j !== 'object') return { updatedAt: null, orders: {} };
    if (!j.orders || typeof j.orders !== 'object') j.orders = {};
    return j;
  } catch {
    return { updatedAt: null, orders: {} };
  }
}

function writeLedger(ledger) {
  ensureDir();
  ledger.updatedAt = new Date().toISOString();
  const tmp = `${LEDGER_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(ledger, null, 2));
  fs.renameSync(tmp, LEDGER_FILE);
}

function keyOf({ platform, orderId }) {
  return `${String(platform || 'unknown')}:${String(orderId)}`;
}

/**
 * Зарегистрировать бронь на трекинг оплаты.
 * @param {object} p
 * @param {string} p.platform  radario|vakhtangov-ticketland|intickets|afisha|...
 * @param {string|number} p.orderId
 * @param {string} [p.qrId]
 * @param {string} [p.paymentUrl]
 * @param {string} [p.orderHash]
 * @param {string} [p.label]
 * @param {string|number} [p.eventId]
 * @param {number} [p.amount]
 * @param {number} [p.tickets]
 * @param {string} [p.seats]
 * @param {any} [p.buyers]
 * @param {number} [p.trackUntilMs]  дефолт 45 мин с сейчас
 * @param {object} [p.meta]
 */
export function registerPendingPayment(p) {
  if (!p?.orderId) return null;
  const ledger = readLedger();
  const id = keyOf(p);
  const now = Date.now();
  const prev = ledger.orders[id];
  // не затирать уже paid
  if (prev?.status === 'paid') return prev;

  const trackUntilMs = Number(p.trackUntilMs || now + 45 * 60_000);
  const rec = {
    id,
    platform: String(p.platform || 'unknown'),
    orderId: String(p.orderId),
    qrId: p.qrId ? String(p.qrId) : null,
    paymentUrl: p.paymentUrl || null,
    orderHash: p.orderHash || null,
    label: p.label || null,
    eventId: p.eventId ?? null,
    amount: p.amount ?? null,
    tickets: Number(p.tickets || 0) || null,
    seats: p.seats || null,
    buyers: p.buyers || null,
    status: 'pending',
    registeredAt: prev?.registeredAt || new Date().toISOString(),
    trackUntil: new Date(trackUntilMs).toISOString(),
    lastCheckAt: null,
    lastCheckDetail: null,
    paidAt: null,
    manual: false,
    notifyPaidSent: prev?.notifyPaidSent || false,
    meta: { ...(prev?.meta || {}), ...(p.meta || {}) },
  };
  ledger.orders[id] = rec;
  writeLedger(ledger);
  return rec;
}

export function markPayment(orderKeyOrIds, patch) {
  const ledger = readLedger();
  const id = typeof orderKeyOrIds === 'string' && orderKeyOrIds.includes(':')
    ? orderKeyOrIds
    : keyOf(orderKeyOrIds);
  const prev = ledger.orders[id];
  if (!prev) return null;
  const status = patch.status && STATUSES.has(patch.status) ? patch.status : prev.status;
  const next = {
    ...prev,
    ...patch,
    status,
    lastCheckAt: new Date().toISOString(),
  };
  if (status === 'paid' && !prev.paidAt) {
    next.paidAt = patch.paidAt || new Date().toISOString();
  }
  ledger.orders[id] = next;
  writeLedger(ledger);
  return next;
}

export function listPayments({ status, platform } = {}) {
  const ledger = readLedger();
  let rows = Object.values(ledger.orders);
  if (status) rows = rows.filter((r) => r.status === status);
  if (platform) rows = rows.filter((r) => r.platform === platform);
  rows.sort((a, b) => String(b.registeredAt || '').localeCompare(String(a.registeredAt || '')));
  return { updatedAt: ledger.updatedAt, orders: rows };
}

export function paymentSummary(feePerTicket = Number(process.env.SNIPER_FEE_PER_TICKET || 0)) {
  const { orders } = listPayments();
  const byStatus = {};
  let paidTickets = 0;
  let pendingTickets = 0;
  let bookedTickets = 0;
  for (const o of orders) {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    const t = Number(o.tickets || 0);
    bookedTickets += t;
    if (o.status === 'paid') paidTickets += t;
    if (o.status === 'pending') pendingTickets += t;
  }
  return {
    orders: orders.length,
    byStatus,
    bookedTickets,
    paidTickets,
    pendingTickets,
    feePerTicket,
    feeDue: feePerTicket > 0 ? paidTickets * feePerTicket : null,
  };
}

export { LEDGER_FILE, keyOf, readLedger, writeLedger };
