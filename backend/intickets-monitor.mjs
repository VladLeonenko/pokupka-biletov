// Монитор «Опера нищих» (Театр Пушкина) — Radario sniper.
// Почта: ТОЛЬКО успех occupy+order со ссылкой на оплату. Tech/«доступно N» — выкл.
//
// Гонка:
// 1) EDGE 0→N → сразу race N сессий (parallel GET+occupy), без писем.
// 2) soft_lock часто отпускает БЕЗ ticketCount→0 → probe каждые ~15с с race.
// 3) Пул тёплых buy-session + keep-alive в radarioBooking.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { sendTransactionalMail } from './services/mail/transporter.js';
import {
  bookRadarioEvent,
  warmBuySession,
  getWarmBuySession,
  primeSessionPool,
} from './services/radarioBooking.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const RESULTS_FILE = path.join(__dirname, 'data', 'intickets-results.json');
const STATE_FILE = path.join(__dirname, 'data', 'radario-hold-state.json');
const LOG_FILE = path.join(__dirname, 'data', 'radario-sniper.log');
const NOTIFY_BOOK = (process.env.INTICKETS_NOTIFY_EMAIL || 'vladislav.leonenko@bk.ru,leonenkovlad2018@yandex.ru,gyrodin@mail.ru,iosif131999@gmail.com').trim();
const BCC_BOOK = process.env.INTICKETS_BCC || 'yaguda_io@mail.ru';

const INTERVAL_MS = Number(process.env.INTICKETS_INTERVAL_MS || 1500);
const HOT_INTERVAL_MS = Number(process.env.RADARIO_HOT_INTERVAL_MS || 300);
const EDGE_INTERVAL_MS = Number(process.env.RADARIO_EDGE_INTERVAL_MS || 80);
const WARM_EVERY_MS = Number(process.env.RADARIO_WARM_EVERY_MS || 40_000);
const AUTO_BOOK = process.env.RADARIO_AUTO_BOOK !== '0';
const MAX_TICKETS = Number(process.env.RADARIO_MAX_TICKETS || 4);
// После soft_lock: не долбить каждые 300мс (бессмысленно). Probe — поймать expiry корзины.
const SOFT_LOCK_BACKOFF_MS = Number(process.env.RADARIO_SOFT_LOCK_BACKOFF_MS || 15_000);
const SOFT_LOCK_PROBE_MS = Number(process.env.RADARIO_SOFT_LOCK_PROBE_MS || 15_000);
const RACE_SESSIONS = Number(process.env.RADARIO_RACE_SESSIONS || 4);
const POOL_SIZE = Number(process.env.RADARIO_POOL_SIZE || 4);
const REBOOK_AFTER_MS = Number(process.env.RADARIO_REBOOK_AFTER_MS || 20 * 60 * 1000);
const LOG_MAX_BYTES = 2 * 1024 * 1024;

const EVENTS = [
  { id: 2747582, label: '17 ноября 19:00' },
  { id: 2747584, label: '18 ноября 19:00' },
  { id: 2747607, label: '19 ноября 19:00' },
  { id: 2747608, label: '20 ноября 19:00' },
  { id: 2871744, label: '15 декабря 19:00' },
  { id: 2871745, label: '16 декабря 19:00' },
  { id: 2871746, label: '17 декабря 19:00' },
  { id: 2871748, label: '18 декабря 19:00' },
];

/** @type {Map<number, object>} */
const holds = new Map();
const lastCount = new Map();
const bookingInFlight = new Set();
/** eventId → last soft_lock probe ts */
const lastProbeAt = new Map();

function log(line) {
  const s = `${new Date().toISOString()} ${line}\n`;
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > LOG_MAX_BYTES) {
      fs.renameSync(LOG_FILE, `${LOG_FILE}.1`);
    }
    fs.appendFileSync(LOG_FILE, s);
  } catch { /* ignore */ }
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${line}`);
}

function loadState() {
  try {
    const j = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    for (const [id, h] of Object.entries(j?.holds || {})) {
      holds.set(Number(id), h);
    }
  } catch { /* first run */ }
}

function saveState() {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  const obj = {};
  for (const [id, h] of holds) obj[id] = h;
  fs.writeFileSync(STATE_FILE, JSON.stringify({ holds: obj, updatedAt: new Date().toISOString() }, null, 2));
}

loadState();

async function fetchGroup() {
  const res = await fetch('https://radario.ru/web-api/events/2747582/eventGroup?distributionType=Widget', {
    headers: { Accept: 'application/json', Referer: 'https://teatrpushkin.ru/' },
  });
  if (!res.ok) throw new Error(`eventGroup HTTP ${res.status}`);
  const j = await res.json();
  return Array.isArray(j?.events) ? j.events : [];
}

function saveResult(rec) {
  fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
  let list = [];
  try { list = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8')); } catch {}
  list.push(rec);
  if (list.length > 500) list = list.slice(-500);
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(list, null, 2));
}

async function notifyBook(subject, text) {
  return sendTransactionalMail({
    to: NOTIFY_BOOK,
    subject,
    text,
    bcc: BCC_BOOK,
  });
}

/**
 * isEdge  — вспышка 0→N (максимальный приоритет, race).
 * isProbe — периодический выстрел во время soft_lock (корзина могла отпустить без count→0).
 */
function shouldBook(eventId, ticketCount, { isEdge = false, isProbe = false } = {}) {
  if (!AUTO_BOOK || bookingInFlight.has(eventId)) return false;
  if (ticketCount <= 0) return false;
  const h = holds.get(eventId);
  if (!h) return true;
  const now = Date.now();
  if (h.orderId && now < h.cooldownUntil && !isEdge) return false;
  if (isEdge || isProbe) return true;
  if (h.pendingSoftLock && h.softLockUntil && now < h.softLockUntil) return false;
  return true;
}

function softLockDueForProbe(eventId) {
  const h = holds.get(eventId);
  if (!h?.pendingSoftLock) return false;
  const now = Date.now();
  const last = lastProbeAt.get(eventId) || 0;
  if (now - last < SOFT_LOCK_PROBE_MS) return false;
  // первый probe после backoff
  if (h.softLockUntil && now < h.softLockUntil) return false;
  return true;
}

async function tryBook(cfg, meta) {
  const isEdge = !!meta.isEdge;
  const isProbe = !!meta.isProbe;
  if (!shouldBook(cfg.id, meta.ticketCount, { isEdge, isProbe })) return;

  bookingInFlight.add(cfg.id);
  if (isProbe) lastProbeAt.set(cfg.id, Date.now());

  const prev = holds.get(cfg.id);
  const attempt = (prev?.attempt || 0) + 1;
  const preferSeatNumbers = prev?.seats || [];
  const maxTickets = Math.min(MAX_TICKETS, Math.max(1, Number(meta.ticketCount) || MAX_TICKETS));
  // EDGE и probe — полный race; обычный retry после backoff — тоже race (места те же).
  const raceSessions = (isEdge || isProbe || prev?.pendingSoftLock) ? RACE_SESSIONS : 1;

  try {
    const warm = getWarmBuySession(cfg.id);
    log(`book ${cfg.label} #${attempt} max=${maxTickets}${isEdge ? ' EDGE' : ''}${isProbe ? ' PROBE' : ''}${warm ? ' warm' : ''} race=${raceSessions}${preferSeatNumbers.length ? ` prefer=[${preferSeatNumbers.join(',')}]` : ''}`);

    const result = await bookRadarioEvent(cfg.id, {
      maxTickets,
      preferSeatNumbers,
      useWarm: !isEdge && !isProbe,
      forceFresh: true,
      skipPreview: true,
      raceSessions,
    });

    if (result.ok) {
      const seatNums = (result.seats || []).map((s) => s.seatNumber);
      holds.set(cfg.id, {
        orderId: result.orderId,
        seats: seatNums.length ? seatNums : preferSeatNumbers,
        attempt,
        bookedAt: Date.now(),
        cooldownUntil: Date.now() + REBOOK_AFTER_MS,
        sawZeroAfterBook: false,
        pendingSoftLock: false,
        softLockUntil: 0,
      });
      saveState();
      saveResult({
        platform: 'radario',
        action: attempt > 1 ? 'rebook' : 'book',
        attempt,
        label: cfg.label,
        eventId: cfg.id,
        at: new Date().toISOString(),
        result: {
          ok: true,
          orderId: result.orderId,
          orderHash: result.orderHash || null,
          redirectUrl: result.redirectUrl || null,
          qrId: result.qrId || null,
          seats: result.seats || null,
          buyers: result.buyers || null,
          amount: result.amount ?? null,
        },
      });
      const seatLines = (result.seats || [])
        .map((s) => `  seat#${s.seatNumber} ${s.row || ''} м.${s.seatName || ''} type=${s.ticketTypeId} ${s.price}₽`)
        .join('\n');
      const payLine = result.redirectUrl
        ? `ОПЛАТА (СБП): ${result.redirectUrl}`
        : (result.qrId
          ? `QR выписан (qrId=${result.qrId}), redirectUrl пустой — заказ #${result.orderId}`
          : `orderId=${result.orderId} — ссылка СБП не пришла`);
      const text = [
        attempt > 1 ? '🔁 Опера нищих — ПОВТОРНАЯ бронь' : '✅ Опера нищих — заказ создан',
        `Дата: ${cfg.label}`,
        `Event ID: ${cfg.id}`,
        `orderId: ${result.orderId}`,
        `amount: ${result.amount ?? '—'}`,
        payLine,
        `покупатели: ${(result.buyers || []).join(', ')}`,
        'места:',
        seatLines || '  —',
        `Виджет: https://radario.ru/customer/event/${cfg.id}/info?distributionType=Widget`,
      ].join('\n');
      log(`OK ${cfg.label} orderId=${result.orderId} seats=[${seatNums.join(',')}]`);
      await notifyBook(
        `${attempt > 1 ? '🔁' : '✅'} Опера нищих: заказ ${cfg.label} #${result.orderId}`,
        text,
      ).catch((e) => log(`mail fail: ${e.message}`));
      return;
    }

    const triedNums = (result.tried || []).map((s) => s.seatNumber ?? s).filter(Number.isFinite);
    if (result.reason === 'soft_lock') {
      holds.set(cfg.id, {
        ...(prev || {}),
        orderId: prev?.orderId || null,
        seats: triedNums.length ? triedNums : (preferSeatNumbers.length ? preferSeatNumbers : (prev?.seats || [])),
        attempt: prev?.attempt || 0,
        bookedAt: prev?.bookedAt || 0,
        cooldownUntil: 0,
        pendingSoftLock: true,
        softLockUntil: Date.now() + SOFT_LOCK_BACKOFF_MS,
        sawZeroAfterBook: prev?.sawZeroAfterBook || false,
      });
      saveState();
      log(`soft_lock ${cfg.label} seats=[${triedNums.join(',') || '?'}] nextProbe≈${Math.round(SOFT_LOCK_PROBE_MS / 1000)}s`);
      return;
    }

    log(`fail ${cfg.label}: ${result.reason}`);
    if (result.reason !== 'no_tickets' && result.reason !== 'no_free_seats_in_payload') {
      saveResult({
        platform: 'radario',
        action: 'book_fail',
        label: cfg.label,
        eventId: cfg.id,
        at: new Date().toISOString(),
        reason: result.reason,
      });
    }
  } catch (err) {
    log(`error ${cfg.label}: ${err instanceof Error ? err.message : err}`);
  } finally {
    bookingInFlight.delete(cfg.id);
  }
}

async function warmLoop() {
  while (true) {
    for (const cfg of EVENTS) {
      if (bookingInFlight.has(cfg.id)) continue;
      try {
        const hold = holds.get(cfg.id);
        const hot = !!(hold?.pendingSoftLock || (lastCount.get(cfg.id) || 0) > 0);
        if (hot) await primeSessionPool(cfg.id, POOL_SIZE);
        else await warmBuySession(cfg.id);
      } catch { /* quiet */ }
    }
    await new Promise((r) => setTimeout(r, WARM_EVERY_MS));
  }
}

log(`start events=${EVENTS.length} poll=${INTERVAL_MS}/${HOT_INTERVAL_MS}/${EDGE_INTERVAL_MS} softBackoff=${SOFT_LOCK_BACKOFF_MS} probe=${SOFT_LOCK_PROBE_MS} race=${RACE_SESSIONS} pool=${POOL_SIZE} auto=${AUTO_BOOK}`);
log('mail: only on successful occupy+order (no tech / no ticketCount alerts)');
void warmLoop();
void primeSessionPool(2747584, POOL_SIZE).catch(() => {});

while (true) {
  let anyTickets = false;
  let anyHotEdge = false;
  let anySoftPending = false;
  try {
    const events = await fetchGroup();
    const byId = new Map(events.map((e) => [Number(e.id), e]));
    const bookJobs = [];

    for (const cfg of EVENTS) {
      const e = byId.get(cfg.id);
      if (!e) continue;
      const count = Number(e.ticketCount || 0);
      const stopped = !!e.salesStopped;

      let isEdge = false;
      if (!lastCount.has(cfg.id)) {
        lastCount.set(cfg.id, count);
      } else {
        const prevCount = lastCount.get(cfg.id) ?? 0;
        lastCount.set(cfg.id, count);
        isEdge = prevCount === 0 && count > 0 && !stopped;
      }

      const hold = holds.get(cfg.id);
      const inSoftBackoff = !!(hold?.pendingSoftLock && hold?.softLockUntil && Date.now() < hold.softLockUntil);
      if (hold?.pendingSoftLock) anySoftPending = true;
      if (count > 0 && !stopped) anyTickets = true;
      if (isEdge) anyHotEdge = true;

      if (hold && count === 0) {
        hold.sawZeroAfterBook = true;
        if (hold.pendingSoftLock) {
          hold.pendingSoftLock = false;
          hold.softLockUntil = 0;
          log(`${cfg.label}: ticketCount→0, soft_lock сброшен — ждём EDGE`);
        }
        saveState();
      }

      if (count > 0 && !stopped) {
        if (isEdge) {
          log(`EDGE ${cfg.label} 0→${count}`);
          bookJobs.push(tryBook(cfg, { ticketCount: count, isEdge: true }));
        } else if (softLockDueForProbe(cfg.id)) {
          // soft_lock часто сходит БЕЗ count→0 — ловим expiry корзины probe'ом
          log(`PROBE ${cfg.label} count=${count} (soft_lock expiry hunt)`);
          bookJobs.push(tryBook(cfg, { ticketCount: count, isProbe: true }));
        } else if (!hold?.pendingSoftLock && !inSoftBackoff) {
          // обычный захват только если нет активного soft_lock
          bookJobs.push(tryBook(cfg, { ticketCount: count }));
        }
      }
    }
    if (bookJobs.length) await Promise.allSettled(bookJobs);
  } catch (err) {
    log(`poll: ${err instanceof Error ? err.message : err}`);
  }

  const wait = anyHotEdge
    ? EDGE_INTERVAL_MS
    : (anySoftPending || anyTickets)
      ? HOT_INTERVAL_MS
      : INTERVAL_MS;
  await new Promise((r) => setTimeout(r, wait));
}
