/**
 * Большой театр — монитор/снайпер (каркас).
 *
 * Пока QRATOR режет VPS/автоматизацию: процесс не стартует бой без
 * BOLSHOI_COOKIE_FILE или успешного headed-профиля + BOLSHOI_PROXY.
 *
 * Правила:
 * - 2 аккаунта / IP max
 * - корзина 5 мин, оплата +10 мин
 * - 2|4 билета на заказ, повтор после оплаты
 * - письмо только при успехе + ссылка на оплату
 *
 * Старт (когда сессия жива):
 *   BOLSHOI_TEST_EVENT_URL=... BOLSHOI_AUTO_BOOK=0 node bolshoi-monitor.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { sendTransactionalMail } from './services/mail/transporter.js';
import { createBolshoiClient } from './services/bolshoiApi.js';
import {
  launchBolshoiContext,
  ensureLogin,
  bookBolshoiEvent,
  accountUserDataDir,
} from './services/bolshoiBrowserBooking.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const LOG_FILE = path.join(__dirname, 'data/bolshoi-sniper.log');
const RESULTS_FILE = path.join(__dirname, 'data/bolshoi-results.json');
const INTERVAL_MS = Number(process.env.BOLSHOI_INTERVAL_MS || 5000);
const AUTO_BOOK = process.env.BOLSHOI_AUTO_BOOK === '1';
const MAX_TICKETS = Number(process.env.BOLSHOI_TICKETS_PER_ORDER || 2);
const NOTIFY = (process.env.BOLSHOI_NOTIFY_EMAIL
  || 'vladislav.leonenko@bk.ru,leonenkovlad2018@yandex.ru,gyrodin@mail.ru,iosif131999@gmail.com').trim();
const BCC = process.env.BOLSHOI_BCC || 'yaguda_io@mail.ru';

const EVENT_URL = process.env.BOLSHOI_EVENT_URL || process.env.BOLSHOI_TEST_EVENT_URL || '';
const EMAIL = process.env.BOLSHOI_EMAIL || '';
const PASSWORD = process.env.BOLSHOI_PASSWORD || '';
const PROXY = process.env.BOLSHOI_PROXY || '';

function log(line) {
  const s = `${new Date().toISOString()} ${line}\n`;
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, s);
  } catch { /* */ }
  console.log(s.trim());
}

function appendResult(row) {
  let arr = [];
  try { arr = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8')); } catch { /* */ }
  if (!Array.isArray(arr)) arr = [];
  arr.push({ ...row, at: new Date().toISOString() });
  fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(arr, null, 2));
}

async function notifyBook(info) {
  const subject = `[Bolshoi] бронь ${info.label || ''}`.trim();
  const text = [
    `Событие: ${info.eventUrl || EVENT_URL}`,
    `Мест: ${info.seats || MAX_TICKETS}`,
    `Оплата: ${info.paymentUrl || '—'}`,
    `Аккаунт: ${EMAIL}`,
    `Корзина ~5 мин, после «к оплате» ~10 мин на оплату.`,
  ].join('\n');
  await sendTransactionalMail({ to: NOTIFY, bcc: BCC, subject, text });
}

async function main() {
  if (!EVENT_URL) {
    log('STOP: задай BOLSHOI_EVENT_URL или BOLSHOI_TEST_EVENT_URL');
    process.exit(1);
  }
  if (!EMAIL || !PASSWORD) {
    log('STOP: BOLSHOI_EMAIL / BOLSHOI_PASSWORD');
    process.exit(1);
  }
  if (!PROXY && !process.env.BOLSHOI_COOKIE_FILE && !process.env.BOLSHOI_ALLOW_DIRECT) {
    log('WARN: нет BOLSHOI_PROXY и BOLSHOI_COOKIE_FILE — QRATOR на VPS/грязном IP почти наверняка 403.');
    log('Для форса: BOLSHOI_ALLOW_DIRECT=1');
  }

  // быстрый HTTP probe если есть cookies
  const client = createBolshoiClient({});
  if (client.cookie) {
    const shows = await client.getShows();
    log(`cookie-probe shows=${shows.status}`);
  }

  const profile = accountUserDataDir(path.join(__dirname, 'data'), EMAIL);
  const ctx = await launchBolshoiContext({
    userDataDir: profile,
    proxy: PROXY || undefined,
    headless: process.env.BOLSHOI_HEADLESS === '1',
  });

  log(`login ${EMAIL} proxy=${PROXY || 'none'}`);
  const me = await ensureLogin(ctx, { email: EMAIL, password: PASSWORD });
  log(`session ${JSON.stringify(me).slice(0, 200)}`);

  let busy = false;
  async function tick() {
    if (busy) return;
    busy = true;
    try {
      if (!AUTO_BOOK) {
        log(`watch ${EVENT_URL} (AUTO_BOOK=0 — только heartbeat)`);
        return;
      }
      const guest = {
        fio: process.env.BOLSHOI_FIO || '',
        passport: process.env.BOLSHOI_PASSPORT || '',
      };
      const res = await bookBolshoiEvent(ctx, {
        eventUrl: EVENT_URL,
        ticketCount: MAX_TICKETS,
        guest,
        dryRun: process.env.BOLSHOI_DRY_RUN !== '0',
      });
      log(`book ${JSON.stringify(res).slice(0, 400)}`);
      if (res.ok && res.paymentUrl) {
        appendResult(res);
        await notifyBook({ ...res, eventUrl: EVENT_URL, seats: MAX_TICKETS });
      }
    } catch (e) {
      log(`ERR ${e.message}`);
    } finally {
      busy = false;
    }
  }

  await tick();
  setInterval(tick, INTERVAL_MS);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
