/**
 * Kassir sniper — Дон Жуан (и тест-события).
 * Почта только при успешной брони со ссылкой на оплату.
 * Лог: data/kassir-sniper.log
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { sendTransactionalMail } from './services/mail/transporter.js';
import {
  availableSeatCount,
  bookKassirEvent,
  extractFreeSeats,
  fetchOrderKit,
  fetchScheme,
  fetchEventPageKit,
} from './services/kassirApi.js';
import { registerPendingPayment } from './services/sniperPaymentTracker.js';
import { rebookBlocked, stampSuccess } from './services/rebookGuard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

// LaunchAgent на macOS не может писать на Desktop (TCC) — KASSIR_DATA_DIR → ~/Library/...
const DATA_DIR = process.env.KASSIR_DATA_DIR
  ? path.resolve(process.env.KASSIR_DATA_DIR)
  : path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const LOG_FILE = path.join(DATA_DIR, 'kassir-sniper.log');
const RESULTS_FILE = path.join(DATA_DIR, 'kassir-results.json');
const STATE_FILE = path.join(DATA_DIR, 'kassir-hold-state.json');
const NOTIFY_BOOK = (process.env.KASSIR_NOTIFY_EMAIL
  || 'vladislav.leonenko@bk.ru,leonenkovlad2018@yandex.ru,gyrodin@mail.ru,iosif131999@gmail.com').trim();
const BCC_BOOK = process.env.KASSIR_BCC || 'yaguda_io@mail.ru';
const INTERVAL_MS = Number(process.env.KASSIR_INTERVAL_MS || 15000);
const HOT_INTERVAL_MS = Number(process.env.KASSIR_HOT_INTERVAL_MS || 8000);
const AUTO_BOOK = process.env.KASSIR_AUTO_BOOK !== '0';
const MAX_TICKETS = Number(process.env.KASSIR_MAX_TICKETS || 2);
const REBOOK_AFTER_MS = Number(process.env.KASSIR_REBOOK_AFTER_MS || 20 * 60 * 1000);
const SOFT_BACKOFF_MS = Number(process.env.KASSIR_SOFT_BACKOFF_MS || 60_000);
const LOG_MAX = 2 * 1024 * 1024;

/** targets: Дон Жуан. RISK: hash/id на kassir меняется — сверять URL.
 * 7170999 = КЗ «Москва» 19.12 (ссылка пользователя)
 * 5406528 = Русская песня 25.11
 * Доп. через KASSIR_EVENT_ID / KASSIR_EXTRA_EVENT_IDS=id:label:url,... */
const EVENTS = [
  {
    id: Number(process.env.KASSIR_EVENT_ID || 7170999),
    label: process.env.KASSIR_EVENT_LABEL || 'Дон Жуан 19.12 19:00 КЗ Москва',
    url: process.env.KASSIR_EVENT_URL || 'https://msk.kassir.ru/teatr/don-juan-13#7170999',
  },
];
if (process.env.KASSIR_KEEP_OLD !== '0') {
  const oldId = Number(process.env.KASSIR_OLD_EVENT_ID || 5406528);
  if (!EVENTS.some((e) => e.id === oldId)) {
    EVENTS.push({
      id: oldId,
      label: process.env.KASSIR_OLD_EVENT_LABEL || 'Дон Жуан 25.11 19:00 Русская песня',
      url: process.env.KASSIR_OLD_EVENT_URL || 'https://msk.kassir.ru/teatr/don-juan-13#5406528',
    });
  }
}
if (process.env.KASSIR_TEST_EVENT_ID) {
  EVENTS.unshift({
    id: Number(process.env.KASSIR_TEST_EVENT_ID),
    label: process.env.KASSIR_TEST_EVENT_LABEL || `test#${process.env.KASSIR_TEST_EVENT_ID}`,
    url: process.env.KASSIR_TEST_EVENT_URL || `https://msk.kassir.ru/#${process.env.KASSIR_TEST_EVENT_ID}`,
    test: true,
  });
}

const holds = new Map();
const lastCount = new Map();
const bookingInFlight = new Set();
/** VPS IP часто в бане на order-kit (403) — длинный backoff, не долбить. */
let pollBanUntil = 0;
let consecutive403 = 0;

function log(line) {
  const s = `${new Date().toISOString()} ${line}\n`;
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > LOG_MAX) {
      fs.renameSync(LOG_FILE, `${LOG_FILE}.1`);
    }
    fs.appendFileSync(LOG_FILE, s);
  } catch { /* ignore */ }
}

function loadState() {
  try {
    const j = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    for (const [id, h] of Object.entries(j?.holds || {})) holds.set(Number(id), h);
  } catch { /* first */ }
}

function saveState() {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  const obj = {};
  for (const [id, h] of holds) obj[id] = h;
  fs.writeFileSync(STATE_FILE, JSON.stringify({ holds: obj, updatedAt: new Date().toISOString() }, null, 2));
}

function saveResult(rec) {
  fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
  let list = [];
  try { list = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8')); } catch {}
  list.push(rec);
  if (list.length > 300) list = list.slice(-300);
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(list, null, 2));
}

loadState();

function takeSingleInstanceLock() {
  const lock = path.join(DATA_DIR, 'kassir.pid');
  try {
    const old = Number(fs.readFileSync(lock, 'utf8'));
    if (old && old !== process.pid) {
      try {
        process.kill(old, 0);
        console.error(`kassir already running pid=${old}, exit`);
        process.exit(0);
      } catch { /* stale */ }
    }
  } catch { /* first */ }
  fs.writeFileSync(lock, String(process.pid));
  const unlock = () => {
    try {
      if (fs.readFileSync(lock, 'utf8').trim() === String(process.pid)) fs.unlinkSync(lock);
    } catch { /* */ }
  };
  process.on('exit', unlock);
  process.on('SIGTERM', () => { unlock(); process.exit(0); });
  process.on('SIGINT', () => { unlock(); process.exit(0); });
}
takeSingleInstanceLock();

async function notifyBook(subject, text) {
  return sendTransactionalMail({ to: NOTIFY_BOOK, subject, text, bcc: BCC_BOOK });
}

function shouldBook(eventId, count, isEdge) {
  if (!AUTO_BOOK || bookingInFlight.has(eventId) || count <= 0) return false;
  const h = holds.get(eventId);
  if (rebookBlocked(h)) return false;
  if (!h) return true;
  const now = Date.now();
  if (isEdge) return true;
  if (h.orderId && now < (h.cooldownUntil || 0)) return false;
  if (h.failUntil && now < h.failUntil) return false;
  return true;
}

async function tryBook(cfg, { count, isEdge }) {
  if (!shouldBook(cfg.id, count, isEdge)) return;
  bookingInFlight.add(cfg.id);
  const prev = holds.get(cfg.id);
  try {
    log(`book ${cfg.label} count=${count}${isEdge ? ' EDGE' : ''} max=${Math.min(MAX_TICKETS, count)}`);
    const result = await bookKassirEvent(cfg.id, {
      maxTickets: Math.min(MAX_TICKETS, Math.max(1, count)),
      preferSeatIds: prev?.seatIds || [],
      needPersonalData: true,
    });
    if (result.ok) {
      const seatIds = (result.seats || []).map((s) => s.seatId);
      const next = stampSuccess(prev, {
        orderId: result.orderId,
        seatIds,
        bookedAt: Date.now(),
        failUntil: 0,
      }, REBOOK_AFTER_MS);
      holds.set(cfg.id, next);
      if (next.done) log(`STOP ${cfg.label}: лимит 1 перебронь`);
      try {
        registerPendingPayment({
          platform: 'kassir',
          orderId: result.orderId,
          paymentUrl: result.paymentUrl || null,
          label: cfg.label,
          eventId: cfg.id,
          amount: result.amount ?? null,
          tickets: (result.seats || []).length || null,
          seats: seatIds.join(','),
          trackUntilMs: Date.now() + 3 * 3600_000,
        });
      } catch { /* */ }
      saveState();
      saveResult({
        platform: 'kassir',
        action: 'book',
        label: cfg.label,
        eventId: cfg.id,
        at: new Date().toISOString(),
        result: {
          ok: true,
          orderId: result.orderId,
          accessCode: result.accessCode,
          paymentUrl: result.paymentUrl,
          amount: result.amount,
          seats: result.seats,
          buyer: result.buyer,
        },
      });
      const seatLines = (result.seats || [])
        .map((s) => `  ${s.sectorName || s.sectorId} ряд ${s.row} м.${s.seat} ${s.price}₽ (seatId=${s.seatId})`)
        .join('\n');
      const text = [
        '✅ Kassir — заказ создан',
        `Событие: ${cfg.label}`,
        `URL: ${cfg.url}`,
        `orderId: ${result.orderId}`,
        `amount: ${result.amount}`,
        result.paymentUrl ? `ОПЛАТА (СБП): ${result.paymentUrl}` : 'paymentUrl пустой — проверь заказ в Kassir',
        `покупатель: ${result.buyer}`,
        'места:',
        seatLines || '  —',
      ].join('\n');
      log(`OK ${cfg.label} orderId=${result.orderId} url=${result.paymentUrl || '-'}`);
      console.log(`✅ Kassir ${cfg.label} order #${result.orderId}`);
      await notifyBook(`✅ Kassir: ${cfg.label} #${result.orderId}`, text).catch((e) => log(`mail: ${e.message}`));
      return;
    }
    log(`fail ${cfg.label}: ${result.reason || result.code || 'unknown'}`);
    if (result.reason === 'no_tickets' || result.reason === 'no_free_seats') {
      holds.set(cfg.id, { ...(prev || {}), failUntil: Date.now() + SOFT_BACKOFF_MS });
      saveState();
      return;
    }
    holds.set(cfg.id, {
      ...(prev || {}),
      seatIds: (result.tried || []).map((s) => s.seatId).filter(Boolean),
      failUntil: Date.now() + SOFT_BACKOFF_MS,
    });
    saveState();
    if (result.reason !== 'invalid_placements') {
      saveResult({
        platform: 'kassir',
        action: 'book_fail',
        label: cfg.label,
        eventId: cfg.id,
        at: new Date().toISOString(),
        reason: result.reason,
        code: result.code || null,
      });
    }
  } catch (err) {
    log(`error ${cfg.label}: ${err instanceof Error ? err.message : err}`);
    holds.set(cfg.id, { ...(prev || {}), failUntil: Date.now() + SOFT_BACKOFF_MS });
    saveState();
  } finally {
    bookingInFlight.delete(cfg.id);
  }
}

log(`start events=${EVENTS.map((e) => e.id).join(',')} interval=${INTERVAL_MS}/${HOT_INTERVAL_MS} auto=${AUTO_BOOK} max=${MAX_TICKETS}`);
console.log(`Kassir sniper: log→${LOG_FILE} (почта только при успехе)`);
console.log('Kassir: API через Playwright (Node fetch = 403 TLS). Home LaunchAgent = основной охотник.');

while (true) {
  let anyEdge = false;
  try {
    if (Date.now() < pollBanUntil) {
      await new Promise((r) => setTimeout(r, Math.min(60_000, pollBanUntil - Date.now())));
      continue;
    }
    const jobs = [];
    for (const cfg of EVENTS) {
      const kit = await fetchOrderKit(cfg.id);
      consecutive403 = 0;
      const count = availableSeatCount(kit);
      const prevCount = lastCount.has(cfg.id) ? (lastCount.get(cfg.id) || 0) : null;
      const rising = prevCount === 0 && count > 0;
      let freeN = 0;
      if (count > 0 && (rising || shouldBook(cfg.id, count, rising))) {
        try {
          const sch = await fetchScheme(cfg.id);
          freeN = extractFreeSeats(kit, sch).length;
        } catch {
          freeN = count;
        }
      }
      const effective = Math.max(count, freeN);
      let isEdge = false;
      if (!lastCount.has(cfg.id)) {
        lastCount.set(cfg.id, effective);
        // первый замер — не EDGE
      } else {
        const prev = lastCount.get(cfg.id) || 0;
        lastCount.set(cfg.id, effective);
        isEdge = prev === 0 && effective > 0;
      }
      if (isEdge) {
        anyEdge = true;
        log(`EDGE ${cfg.label} 0→${effective} (quotas=${count}, free=${freeN})`);
      }

      const h = holds.get(cfg.id);
      if (h && effective === 0) {
        h.failUntil = 0;
        saveState();
      }

      if (effective > 0) {
        jobs.push(tryBook(cfg, { count: effective, isEdge }));
      }
    }
    if (jobs.length) await Promise.allSettled(jobs);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = err?.status;
    log(`poll: ${msg}`);
    if (status === 403 || /HTTP 403/i.test(msg)) {
      consecutive403 += 1;
      const wait = Math.min(120_000, 5_000 * 2 ** Math.min(consecutive403 - 1, 4));
      pollBanUntil = Date.now() + wait;
      const recycle = consecutive403 === 3;
      log(`order-kit 403×${consecutive403} пауза ${Math.round(wait / 1000)}s${recycle ? ' recycle' : ''}`);
      console.error(`[kassir] 403 пауза ${Math.round(wait / 1000)}s${recycle ? ', один recycle' : ''}`);
      if (recycle) {
        try {
          const { closeKassirBrowser } = await import('./services/kassirApi.js');
          await closeKassirBrowser();
        } catch {
          /* */
        }
      }
    } else if (/Failed to fetch|has been closed|Target closed/i.test(msg)) {
      pollBanUntil = Date.now() + 8_000;
    }
  }
  const hot = anyEdge || bookingInFlight.size > 0;
  await new Promise((r) => setTimeout(r, hot ? (anyEdge ? 200 : HOT_INTERVAL_MS) : INTERVAL_MS));
}
