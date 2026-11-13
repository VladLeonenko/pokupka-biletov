/**
 * Снайпер «Консьерж» — Театр Современник / Intickets.
 * https://sovremennik.ru/plays/konserzh/tickets/2902 → iframeab-pre6521 / seance/76933431
 *
 * Только соседние пары. Контакты+паспорта: sniper-contacts.json + data/radario-passports.json
 * Почта — только при успешной брони со ссылкой на оплату.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { sendTransactionalMail } from './services/mail/transporter.js';
import { registerPendingPayment } from './services/sniperPaymentTracker.js';
import { rebookBlocked, stampSuccess } from './services/rebookGuard.js';
import {
  SOVREMENNIK_HOST,
  launchInticketsCtx,
  getSeanceStatus,
  readSeats,
  findPairs,
  bookInticketsAdjacentPairs,
  loadBuyers,
  seanceUrl,
} from './services/inticketsBooking.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const LOG_FILE = path.join(__dirname, 'data', 'konserzh-sniper.log');
const RESULTS_FILE = path.join(__dirname, 'data', 'konserzh-results.json');
const STATE_FILE = path.join(__dirname, 'data', 'konserzh-hold-state.json');
const NOTIFY = (
  process.env.KONSERZH_NOTIFY_EMAIL ||
  'vladislav.leonenko@bk.ru,leonenkovlad2018@yandex.ru,gyrodin@mail.ru,iosif131999@gmail.com'
).trim();
const BCC = process.env.KONSERZH_BCC || 'yaguda_io@mail.ru';
const INTERVAL_MS = Number(process.env.KONSERZH_INTERVAL_MS || 8000);
const HOT_INTERVAL_MS = Number(process.env.KONSERZH_HOT_INTERVAL_MS || 2500);
const AUTO_BOOK = process.env.KONSERZH_AUTO_BOOK !== '0';
const MAX_PAIRS = Number(process.env.KONSERZH_MAX_PAIRS || 2);
const REBOOK_AFTER_MS = Number(process.env.KONSERZH_REBOOK_AFTER_MS || 20 * 60_000);
const RESOLVE_EVERY_MS = Number(process.env.KONSERZH_RESOLVE_EVERY_MS || 10 * 60_000);
const LOG_MAX = 2 * 1024 * 1024;
const HOST = process.env.KONSERZH_INTICKETS_HOST || SOVREMENNIK_HOST;
const REFERER = 'https://sovremennik.ru/';

/** ticketPageId на sovremennik → seance (обновляется с сайта). */
const SEANCES = [
  { ticketPageId: 2901, seanceId: '76933429', label: 'Консьерж 13.11 19:00' },
  { ticketPageId: 2902, seanceId: '76933431', label: 'Консьерж 14.11 19:00' },
  { ticketPageId: 2918, seanceId: '77158899', label: 'Консьерж 22.12 19:00' },
  { ticketPageId: 2923, seanceId: '77159232', label: 'Консьерж 26.12 19:00' },
];

const holds = new Map();
const bookingInFlight = new Set();
let buyerCursor = 0;
let lastResolveAt = 0;

function log(line) {
  const s = `${new Date().toISOString()} ${line}\n`;
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > LOG_MAX) {
      fs.renameSync(LOG_FILE, `${LOG_FILE}.1`);
    }
    fs.appendFileSync(LOG_FILE, s);
  } catch {
    /* */
  }
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${line}`);
}

function loadState() {
  try {
    const j = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    for (const [k, h] of Object.entries(j?.holds || {})) holds.set(k, h);
  } catch {
    /* */
  }
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
  try {
    list = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
  } catch {
    /* */
  }
  list.push(rec);
  if (list.length > 300) list = list.slice(-300);
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(list, null, 2));
}

loadState();

async function notifyBook(subject, text) {
  return sendTransactionalMail({ to: NOTIFY, subject, text, bcc: BCC });
}

async function resolveSeancesFromSite() {
  for (const s of SEANCES) {
    try {
      const res = await fetch(`https://sovremennik.ru/plays/konserzh/tickets/${s.ticketPageId}`, {
        headers: {
          Accept: 'text/html',
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
        },
      });
      const html = await res.text();
      const m = html.match(/iframeab-pre\d+\.intickets\.ru\/seance\/(\d+)/);
      if (m?.[1] && m[1] !== String(s.seanceId)) {
        log(`resolve ${s.label}: seance ${s.seanceId} → ${m[1]}`);
        s.seanceId = m[1];
      }
      const lm = html.match(/ticket__date--active[^>]*>\s*([^<]+)/);
      if (lm?.[1]) s.label = `Консьерж ${lm[1].trim()}`;
    } catch (e) {
      log(`resolve fail ${s.ticketPageId}: ${e instanceof Error ? e.message : e}`);
    }
  }
  lastResolveAt = Date.now();
}

function shouldBook(key) {
  if (!AUTO_BOOK || bookingInFlight.has(key)) return false;
  const h = holds.get(key);
  if (rebookBlocked(h)) return false;
  if (!h) return true;
  if (Date.now() < (h.cooldownUntil || 0)) return false;
  return true;
}

const buyers = loadBuyers();
if (!buyers.length) {
  console.error('Нет покупателей (sniper-contacts / radario-passports)');
  process.exit(1);
}

log(
  `start konserzh seances=${SEANCES.length} pairs<=${MAX_PAIRS} auto=${AUTO_BOOK} buyers=${buyers.length} host=${HOST}`,
);
console.log('Консьерж sniper: почта только при успехе; сейчас часто АНШЛАГ — ждём возвраты.');

await resolveSeancesFromSite();
const ctx = await launchInticketsCtx({
  profileDir: process.env.KONSERZH_PROFILE || '/tmp/intickets-konserzh-profile',
  referer: REFERER,
});

while (true) {
  let anyHot = false;
  try {
    if (Date.now() - lastResolveAt > RESOLVE_EVERY_MS) await resolveSeancesFromSite();

    for (const s of SEANCES) {
      const key = String(s.seanceId);
      if (!shouldBook(key)) continue;

      const page = await ctx.newPage();
      try {
        await page.setExtraHTTPHeaders({ Referer: REFERER });
        await page.goto(seanceUrl(s.seanceId, HOST), { waitUntil: 'domcontentloaded', timeout: 90000 });
        await page.waitForTimeout(5500);
        const st = await getSeanceStatus(page);
        if (st.status === 'soldout' || st.status === 'closed') {
          log(`${s.label}: ${st.status}`);
          continue;
        }

        // прогрев canvas
        await page.waitForTimeout(2500);
        const seats = await readSeats(page);
        const pairs = findPairs(seats);
        log(`${s.label}: status=${st.status} free=${seats.filter((x) => x.free).length} pairs=${pairs.length}`);
        if (!pairs.length) continue;

        anyHot = true;
        bookingInFlight.add(key);
        const buyer = buyers[buyerCursor % buyers.length];
        buyerCursor += 1;
        log(`🔥 ${s.label}: броню до ${MAX_PAIRS} пар → ${buyer.fullName || buyer.name} <${buyer.email}>`);

        await page.close().catch(() => {});
        const result = await bookInticketsAdjacentPairs({
          ctx,
          seanceId: s.seanceId,
          host: HOST,
          referer: REFERER,
          buyer,
          maxPairs: MAX_PAIRS,
        });

        if (result.ok) {
          const next = stampSuccess(holds.get(key), {
            bookedAt: Date.now(),
            paymentUrl: result.paymentUrl,
            orderId: result.orderId || result.paymentUrl || key,
          }, REBOOK_AFTER_MS);
          holds.set(key, next);
          if (next.done) log(`STOP ${s.label}: лимит 1 перебронь`);
          saveState();
          const rec = {
            platform: 'sovremennik-intickets',
            spectacle: 'Консьерж',
            label: s.label,
            seanceId: s.seanceId,
            ticketPageId: s.ticketPageId,
            at: new Date().toISOString(),
            result,
          };
          saveResult(rec);
          try {
            registerPendingPayment({
              platform: 'sovremennik-intickets',
              orderId: result.orderId || result.paymentUrl,
              paymentUrl: result.paymentUrl || null,
              label: s.label,
              eventId: s.seanceId,
              amount: result.amount ?? null,
              tickets: result.tickets || 2,
              seats: result.seatsLabel || null,
              trackUntilMs: Date.now() + 3 * 3600_000,
            });
          } catch { /* */ }
          const text = [
            '✅ Консьерж (Современник / Intickets) — бронь',
            `Сеанс: ${s.label}`,
            `места: ${result.seatsLabel}`,
            `покупатель: ${result.buyer?.name} <${result.buyer?.email}> ${result.buyer?.phone}`,
            `ОПЛАТА: ${result.paymentUrl}`,
            `страница: https://sovremennik.ru/plays/konserzh/tickets/${s.ticketPageId}`,
          ].join('\n');
          log(`OK ${s.label} pay=${result.paymentUrl}`);
          await notifyBook(`✅ Консьерж: ${s.label}`, text).catch((e) => log(`mail: ${e.message}`));
        } else {
          log(`fail ${s.label}: ${result.reason}`);
          holds.set(key, {
            ...(holds.get(key) || {}),
            lastFail: result.reason,
            cooldownUntil: Date.now() + (result.reason === 'soldout' ? 60_000 : 15_000),
          });
          saveState();
          saveResult({
            platform: 'sovremennik-intickets',
            action: 'book_fail',
            label: s.label,
            at: new Date().toISOString(),
            reason: result.reason,
            detail: result,
          });
        }
      } catch (e) {
        log(`error ${s.label}: ${e instanceof Error ? e.message : e}`);
        holds.set(key, { ...(holds.get(key) || {}), cooldownUntil: Date.now() + 20_000 });
        saveState();
      } finally {
        bookingInFlight.delete(key);
        await page.close().catch(() => {});
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  } catch (e) {
    log(`loop: ${e instanceof Error ? e.message : e}`);
  }
  await new Promise((r) => setTimeout(r, anyHot ? HOT_INTERVAL_MS : INTERVAL_MS));
}
