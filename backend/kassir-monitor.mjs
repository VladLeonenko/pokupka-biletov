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
const INTERVAL_MS = Number(process.env.KASSIR_INTERVAL_MS || 3000);
const HOT_INTERVAL_MS = Number(process.env.KASSIR_HOT_INTERVAL_MS || 500);
const AUTO_BOOK = process.env.KASSIR_AUTO_BOOK !== '0';
const MAX_TICKETS = Number(process.env.KASSIR_MAX_TICKETS || 2);
const REBOOK_AFTER_MS = Number(process.env.KASSIR_REBOOK_AFTER_MS || 20 * 60 * 1000);
const SOFT_BACKOFF_MS = Number(process.env.KASSIR_SOFT_BACKOFF_MS || 60_000);
const LOG_MAX = 2 * 1024 * 1024;

/** target: Дон Жуан 25.11; test можно задать KASSIR_TEST_EVENT_ID.
 * RISK: event id hardcoded — при пересоздании события на kassir обновить env/ID,
 * иначе полл в пустоту (урок wowcup sessionKey). */
const EVENTS = [
  {
    id: Number(process.env.KASSIR_EVENT_ID || 5406528),
    label: process.env.KASSIR_EVENT_LABEL || 'Дон Жуан 25.11 19:00',
    url: process.env.KASSIR_EVENT_URL || 'https://msk.kassir.ru/teatr/don-juan-13#5406528',
  },
];
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

async function notifyBook(subject, text) {
  return sendTransactionalMail({ to: NOTIFY_BOOK, subject, text, bcc: BCC_BOOK });
}

function shouldBook(eventId, count, isEdge) {
  if (!AUTO_BOOK || bookingInFlight.has(eventId) || count <= 0) return false;
  const h = holds.get(eventId);
  if (!h) return true;
  const now = Date.now();
  if (h.orderId && now < h.cooldownUntil && !isEdge) return false;
  if (h.failUntil && now < h.failUntil && !isEdge) return false;
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
      holds.set(cfg.id, {
        orderId: result.orderId,
        seatIds,
        bookedAt: Date.now(),
        cooldownUntil: Date.now() + REBOOK_AFTER_MS,
        failUntil: 0,
      });
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
console.log('Kassir: если order-kit → 403 Forbidden — IP в бане (типично VPS). Нужен домашний IP или KASSIR_PROXY.');

while (true) {
  let anyTickets = false;
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
      let freeN = 0;
      if (count > 0) {
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
      if (effective > 0) anyTickets = true;
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
      const wait = Math.min(30 * 60_000, 60_000 * 2 ** Math.min(consecutive403 - 1, 4));
      pollBanUntil = Date.now() + wait;
      log(`IP/ban order-kit 403×${consecutive403} → пауза ${Math.round(wait / 1000)}s (запусти с домашнего IP или прокси; VPS api.kassir.ru часто Forbidden)`);
      console.error(`[kassir] 403 Forbidden — пауза ${Math.round(wait / 1000)}s. С VPS order-kit обычно мёртв, с домашнего IP — ок.`);
    }
  }
  await new Promise((r) => setTimeout(r, anyEdge ? 200 : (anyTickets ? HOT_INTERVAL_MS : INTERVAL_MS)));
}
