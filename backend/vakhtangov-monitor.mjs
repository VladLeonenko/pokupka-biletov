/**
 * Вахтангов sniper — Онегин / Маскарад / Король Лир.
 * Только сектор Партер, только пары. Контакты: sniper-contacts.json.
 * Почта менеджерам — только при успехе (корзина/оплата).
 *
 * Пока дат нет в /ticketland_afisha/data.json — ждём появления (продажи не открыты).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { sendTransactionalMail } from './services/mail/transporter.js';
import {
  bookVakhtangovParterPairs,
  parseTlScript,
} from './services/vakhtangovTicketlandBooking.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const LOG_FILE = path.join(__dirname, 'data', 'vakhtangov-sniper.log');
const RESULTS_FILE = path.join(__dirname, 'data', 'vakhtangov-results.json');
const STATE_FILE = path.join(__dirname, 'data', 'vakhtangov-hold-state.json');
const AFISHA_URL = 'https://vakhtangov.ru/ticketland_afisha/data.json';

const NOTIFY = (process.env.VAKHTANGOV_NOTIFY_EMAIL
  || 'vladislav.leonenko@bk.ru,leonenkovlad2018@yandex.ru,gyrodin@mail.ru,iosif131999@gmail.com').trim();
const BCC = process.env.VAKHTANGOV_BCC || 'yaguda_io@mail.ru';
const INTERVAL_MS = Number(process.env.VAKHTANGOV_INTERVAL_MS || 5000);
const HOT_INTERVAL_MS = Number(process.env.VAKHTANGOV_HOT_INTERVAL_MS || 800);
const AUTO_BOOK = process.env.VAKHTANGOV_AUTO_BOOK !== '0';
const MAX_PAIRS = Number(process.env.VAKHTANGOV_MAX_PAIRS || 1);
const REBOOK_AFTER_MS = Number(process.env.VAKHTANGOV_REBOOK_AFTER_MS || 20 * 60 * 1000);
const LOG_MAX = 2 * 1024 * 1024;

/** Целевые сеансы с сайтов спектаклей (stage=main). */
const TARGETS = [
  // Евгений Онегин
  { show: 'onegin', titleHint: 'Онегин', stage: 'main', datetime: '2026-11-23-19-00-00', label: 'Онегин 23.11 19:00' },
  { show: 'onegin', titleHint: 'Онегин', stage: 'main', datetime: '2026-12-10-19-00-00', label: 'Онегин 10.12 19:00' },
  { show: 'onegin', titleHint: 'Онегин', stage: 'main', datetime: '2027-01-09-19-00-00', label: 'Онегин 09.01 19:00' },
  { show: 'onegin', titleHint: 'Онегин', stage: 'main', datetime: '2027-01-31-19-00-00', label: 'Онегин 31.01 19:00' },
  // Маскарад
  { show: 'maskarade', titleHint: 'Маскарад', stage: 'main', datetime: '2026-11-26-19-00-00', label: 'Маскарад 26.11 19:00' },
  { show: 'maskarade', titleHint: 'Маскарад', stage: 'main', datetime: '2026-12-26-19-00-00', label: 'Маскарад 26.12 19:00' },
  { show: 'maskarade', titleHint: 'Маскарад', stage: 'main', datetime: '2027-01-23-19-00-00', label: 'Маскарад 23.01 19:00' },
  // Король Лир
  { show: 'king_lear', titleHint: 'Лир', stage: 'main', datetime: '2026-12-03-19-00-00', label: 'Король Лир 03.12 19:00' },
  { show: 'king_lear', titleHint: 'Лир', stage: 'main', datetime: '2026-12-22-19-00-00', label: 'Король Лир 22.12 19:00' },
  { show: 'king_lear', titleHint: 'Лир', stage: 'main', datetime: '2027-01-28-19-00-00', label: 'Король Лир 28.01 19:00' },
];

const holds = new Map();
const seenOpen = new Set();
const bookingInFlight = new Set();

function log(line) {
  const s = `${new Date().toISOString()} ${line}\n`;
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > LOG_MAX) {
      fs.renameSync(LOG_FILE, `${LOG_FILE}.1`);
    }
    fs.appendFileSync(LOG_FILE, s);
  } catch { /* ignore */ }
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${line}`);
}

function loadState() {
  try {
    const j = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    for (const [k, h] of Object.entries(j?.holds || {})) holds.set(k, h);
  } catch { /* first */ }
}

function saveState() {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  const obj = {};
  for (const [k, h] of holds) obj[k] = h;
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

async function fetchAfisha() {
  const res = await fetch(AFISHA_URL, {
    headers: { Accept: 'application/json', Referer: 'https://vakhtangov.ru/' },
  });
  if (!res.ok) throw new Error(`afisha HTTP ${res.status}`);
  const raw = await res.json();
  const data = typeof raw.data === 'string' ? JSON.parse(raw.data) : raw.data;
  return data || {};
}

function resolveTarget(afisha, target) {
  const stage = afisha[target.stage] || {};
  const info = stage[target.datetime];
  if (!info) return null;
  const tl = parseTlScript(info.script);
  if (!tl.path || !tl.accessHash) return null;
  return {
    ...target,
    title: info.title || target.label,
    hasTickets: !!info.has_tickets,
    salesOn: !!info.sales_on,
    path: tl.path,
    accessHash: tl.accessHash,
    performanceId: tl.performanceId,
  };
}

async function notifyBook(subject, text) {
  return sendTransactionalMail({ to: NOTIFY, subject, text, bcc: BCC });
}

function shouldBook(key) {
  if (!AUTO_BOOK || bookingInFlight.has(key)) return false;
  const h = holds.get(key);
  if (!h) return true;
  if (h.orderOk && Date.now() < (h.cooldownUntil || 0)) return false;
  return true;
}

async function tryBook(ev) {
  const key = ev.datetime;
  if (!shouldBook(key)) return;
  if (!ev.hasTickets || !ev.salesOn) {
    log(`skip ${ev.label}: hasTickets=${ev.hasTickets} salesOn=${ev.salesOn}`);
    return;
  }

  bookingInFlight.add(key);
  try {
    log(`book ${ev.label} path=${ev.path} pairs<=${MAX_PAIRS}`);
    const result = await bookVakhtangovParterPairs(
      { path: ev.path, accessHash: ev.accessHash, label: ev.label },
      { maxPairs: MAX_PAIRS },
    );

    if (result.ok) {
      holds.set(key, {
        orderOk: true,
        bookedAt: Date.now(),
        cooldownUntil: Date.now() + REBOOK_AFTER_MS,
        seats: (result.seats || []).map((s) => `${s.row}-${s.place}`),
        paymentUrl: result.paymentUrl || null,
      });
      saveState();
      saveResult({
        platform: 'vakhtangov-ticketland',
        action: 'book',
        label: ev.label,
        show: ev.show,
        datetime: ev.datetime,
        at: new Date().toISOString(),
        result,
      });
      const seatLines = (result.seats || [])
        .map((s) => `  ${s.section} ряд ${s.row} место ${s.place} — ${s.price}₽`)
        .join('\n');
      const text = [
        '✅ Вахтангов — бронь (партер, пара)',
        `Спектакль: ${ev.label}`,
        `Title: ${result.label || ev.title}`,
        `amount: ${result.amount ?? '—'}`,
        result.paymentUrl ? `ОПЛАТА: ${result.paymentUrl}` : `shopcart: ${result.shopcartUrl || '—'} (ссылка оплаты уточните)`,
        `покупатель: ${result.buyer?.name} <${result.buyer?.email}> ${result.buyer?.phone}`,
        'места:',
        seatLines || '  —',
        `страница: https://vakhtangov.ru/show/${ev.show}/`,
      ].join('\n');
      log(`OK ${ev.label} seats=${(result.seats || []).map((s) => `${s.row}-${s.place}`).join(',')} pay=${result.paymentUrl || '—'}`);
      await notifyBook(`✅ Вахтангов: ${ev.label}`, text).catch((e) => log(`mail fail: ${e.message}`));
      return;
    }

    log(`fail ${ev.label}: ${result.reason}`);
    saveResult({
      platform: 'vakhtangov-ticketland',
      action: 'book_fail',
      label: ev.label,
      datetime: ev.datetime,
      at: new Date().toISOString(),
      reason: result.reason,
      detail: result,
    });
  } catch (err) {
    log(`error ${ev.label}: ${err instanceof Error ? err.message : err}`);
  } finally {
    bookingInFlight.delete(key);
  }
}

log(`start targets=${TARGETS.length} interval=${INTERVAL_MS}/${HOT_INTERVAL_MS} pairs=${MAX_PAIRS} auto=${AUTO_BOOK}`);
log('mail: only on successful book; contacts←sniper-contacts.json');

while (true) {
  let anyHot = false;
  try {
    const afisha = await fetchAfisha();
    const jobs = [];
    let present = 0;
    for (const t of TARGETS) {
      const ev = resolveTarget(afisha, t);
      if (!ev) continue;
      present += 1;
      anyHot = true;
      if (!seenOpen.has(ev.datetime)) {
        seenOpen.add(ev.datetime);
        log(`OPEN ${ev.label} title="${ev.title}" has=${ev.hasTickets} sales=${ev.salesOn} p=${ev.performanceId}`);
      }
      if (ev.hasTickets && ev.salesOn) jobs.push(tryBook(ev));
    }
    if (!present) {
      // тихо — даты ещё не в Ticketland-ленте
    } else if (jobs.length) {
      await Promise.allSettled(jobs);
    }
  } catch (err) {
    log(`poll: ${err instanceof Error ? err.message : err}`);
  }
  await new Promise((r) => setTimeout(r, anyHot ? HOT_INTERVAL_MS : INTERVAL_MS));
}
