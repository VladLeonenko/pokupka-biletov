/**
 * Сводка броней снайперов по дням: заказы, билеты, переброни, оплачено.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { feeFor, orderStatus, ticketCount } from './sniperFees.js';
import { listPayments } from './sniperPaymentTracker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, '..', 'data');

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function dayKey(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10) || null;
  return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Moscow' });
}

function emptyDay(day, show) {
  return {
    day,
    show,
    orders: 0,
    tickets: 0,
    rebooks: 0,
    errors: 0,
    paid: 0,
    paidTickets: 0,
    amount: 0,
    fee: 0,
  };
}

function bump(map, day, show, patch) {
  if (!day) return;
  const key = `${day}::${show}`;
  const row = map.get(key) || emptyDay(day, show);
  for (const [k, v] of Object.entries(patch)) row[k] = (row[k] || 0) + (Number(v) || 0);
  map.set(key, row);
}

function collectEvents() {
  const events = [];

  for (const rec of readJson(path.join(DATA, 'sniper-results.json'), [])) {
    const show = rec.spectacle || 'Кабала святош';
    const day = dayKey(rec.bookedAt || rec.date);
    for (const r of rec.results || []) {
      const tickets = ticketCount(r.seats, null) || 2;
      events.push({
        at: rec.bookedAt || rec.date,
        day,
        show,
        platform: 'afisha',
        kind: 'order',
        tickets,
        amount: Number(r.totalPrice) || 0,
        orderId: r.orderId ? String(r.orderId) : null,
        seats: r.seats || '',
      });
    }
    for (const e of rec.errors || []) {
      events.push({ at: rec.bookedAt || rec.date, day, show, platform: 'afisha', kind: 'error', tickets: 0, amount: 0 });
    }
  }

  for (const rec of readJson(path.join(DATA, 'profticket-results.json'), [])) {
    const show = rec.label || 'Новогодний лабиринт';
    const day = dayKey(rec.bookedAt);
    for (const r of rec.results || []) {
      const tickets = ticketCount(r.seats, r.tickets) || Number(r.tickets) || 0;
      events.push({
        at: rec.bookedAt,
        day,
        show,
        platform: 'profticket',
        kind: 'order',
        tickets,
        amount: Number(r.totalPrice || r.amount) || 0,
        orderId: r.orderId ? String(r.orderId) : null,
        seats: r.seats || '',
      });
    }
  }

  for (const name of ['vakhtangov-results.json', 'intickets-results.json', 'kassir-results.json', 'konserzh-results.json', 'bolshoi-results.json']) {
    const list = readJson(path.join(DATA, name), []);
    if (!Array.isArray(list)) continue;
    for (const rec of list) {
      const action = String(rec.action || '');
      if (!action && !rec.ok && !rec.paymentUrl) continue;
      const show = rec.label || rec.title || name.replace('-results.json', '');
      const at = rec.at || rec.bookedAt || null;
      const day = dayKey(at);
      if (action === 'rebook' || rec.rebook) {
        events.push({ at, day, show, platform: rec.platform || name.split('-')[0], kind: 'rebook', tickets: Number(rec.tickets || 0), amount: 0 });
        continue;
      }
      if (action === 'book' || rec.ok || rec.paymentUrl) {
        const tickets = Number(rec.tickets || ticketCount(rec.seats, null) || 0);
        events.push({
          at,
          day,
          show,
          platform: rec.platform || name.split('-')[0],
          kind: 'order',
          tickets,
          amount: Number(rec.amount || rec.totalPrice) || 0,
          orderId: rec.orderId ? String(rec.orderId) : null,
          seats: rec.seats || '',
        });
      }
      if (action === 'error' || rec.ok === false) {
        events.push({ at, day, show, platform: rec.platform || name.split('-')[0], kind: 'error', tickets: 0, amount: 0 });
      }
    }
  }

  const ton = readJson(path.join(DATA, 'ton-account-state.json'), {});
  for (const [email, a] of Object.entries(ton || {})) {
    if (!a || !a.lockedAt) continue;
    events.push({
      at: a.lockedAt,
      day: dayKey(a.lockedAt),
      show: a.sessionLabel ? `Обыкновенная смерть · ${a.sessionLabel}` : 'Обыкновенная смерть',
      platform: 'ton',
      kind: a.status === 'paid' ? 'order' : 'order',
      tickets: ticketCount(a.seats, null) || 2,
      amount: 0,
      orderId: email,
      seats: a.seats || '',
      paid: a.status === 'paid',
    });
  }

  return events;
}

export function historyStats({ from, to } = {}) {
  const fromDay = from || null;
  const toDay = to || null;
  const events = collectEvents().filter((e) => {
    if (!e.day) return false;
    if (fromDay && e.day < fromDay) return false;
    if (toDay && e.day > toDay) return false;
    return true;
  });

  const { orders: payments } = listPayments();
  const payByOrder = new Map();
  for (const p of payments) {
    if (p.orderId) payByOrder.set(String(p.orderId), p);
  }

  const map = new Map();
  for (const e of events) {
    if (e.kind === 'error') {
      bump(map, e.day, e.show, { errors: 1 });
      continue;
    }
    if (e.kind === 'rebook') {
      bump(map, e.day, e.show, { rebooks: 1, tickets: e.tickets || 0 });
      continue;
    }
    const pay = e.orderId ? payByOrder.get(String(e.orderId)) : null;
    const status = pay
      ? orderStatus(pay)
      : (e.paid ? 'paid' : orderStatus({ status: null, bookedAt: e.at, trackUntil: null }));
    const quote = feeFor({ show: e.show, platform: e.platform, seats: e.seats, tickets: e.tickets, amount: e.amount });
    bump(map, e.day, e.show, {
      orders: 1,
      tickets: e.tickets || 0,
      amount: e.amount || 0,
      paid: status === 'paid' ? 1 : 0,
      paidTickets: status === 'paid' ? (e.tickets || 0) : 0,
      fee: status === 'paid' ? (quote.fee || 0) : 0,
    });
  }

  // ledger-only paid rows that never hit result files
  for (const p of payments) {
    const day = dayKey(p.registeredAt || p.paidAt);
    if (!day) continue;
    if (fromDay && day < fromDay) continue;
    if (toDay && day > toDay) continue;
    if (orderStatus(p) !== 'paid') continue;
    const show = p.label || p.platform || '—';
    const already = [...map.values()].some((r) => r.day === day && r.show === show && r.paid > 0);
    // if same order already counted via results, skip by orderId presence in events
    if (p.orderId && events.some((e) => String(e.orderId) === String(p.orderId))) continue;
    const tickets = Number(p.tickets) || ticketCount(p.seats, null) || 0;
    const quote = feeFor({ show, platform: p.platform, seats: p.seats, tickets, amount: p.amount });
    bump(map, day, show, {
      orders: 1,
      tickets,
      paid: 1,
      paidTickets: tickets,
      amount: Number(p.amount) || 0,
      fee: quote.fee || 0,
    });
    void already;
  }

  const rows = [...map.values()].sort((a, b) => b.day.localeCompare(a.day) || a.show.localeCompare(b.show, 'ru'));
  const totals = rows.reduce((acc, r) => {
    for (const k of ['orders', 'tickets', 'rebooks', 'errors', 'paid', 'paidTickets', 'amount', 'fee']) {
      acc[k] = (acc[k] || 0) + (r[k] || 0);
    }
    return acc;
  }, { orders: 0, tickets: 0, rebooks: 0, errors: 0, paid: 0, paidTickets: 0, amount: 0, fee: 0 });

  return { from: fromDay, to: toDay, totals, rows };
}
