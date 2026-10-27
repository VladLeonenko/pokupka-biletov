// Монитор «Опера нищих» (Театр Пушкина) — Radario + автобронь с паспортами.
// Повторная бронь: если менеджер не успел оплатить и места снова свободны — бронируем ещё раз (те же места).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { sendTransactionalMail } from './services/mail/transporter.js';
import { bookRadarioEvent } from './services/radarioBooking.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const RESULTS_FILE = path.join(__dirname, 'data', 'intickets-results.json');
const STATE_FILE = path.join(__dirname, 'data', 'radario-hold-state.json');
// Успешные брони со ссылкой на оплату — менеджерам.
const NOTIFY_BOOK = (process.env.INTICKETS_NOTIFY_EMAIL || 'vladislav.leonenko@bk.ru,leonenkovlad2018@yandex.ru,gyrodin@mail.ru,iosif131999@gmail.com').trim();
const BCC_BOOK = process.env.INTICKETS_BCC || 'yaguda_io@mail.ru';
// Техслужебное (появление билетов / fail / soft_lock) — только сюда, админов не пугать.
const NOTIFY_TECH = (process.env.INTICKETS_TECH_EMAIL || 'info@prime-coder.ru').trim();
const INTERVAL_MS = Number(process.env.INTICKETS_INTERVAL_MS || 5000);
const HOT_INTERVAL_MS = Number(process.env.RADARIO_HOT_INTERVAL_MS || 1500);
const AUTO_BOOK = process.env.RADARIO_AUTO_BOOK !== '0';
const MAX_TICKETS = Number(process.env.RADARIO_MAX_TICKETS || 4);
// Сколько ждать оплату до разрешения повторной брони (если места снова в продаже).
const REBOOK_AFTER_MS = Number(process.env.RADARIO_REBOOK_AFTER_MS || 20 * 60 * 1000);

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

/** @type {Map<number, { orderId: any, seats: number[], attempt: number, bookedAt: number, cooldownUntil: number, sawZeroAfterBook: boolean }>} */
const holds = new Map();
const alerted = new Set();
let bookingInFlight = false;

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

async function notifyTech(subject, text) {
  return sendTransactionalMail({
    to: NOTIFY_TECH,
    subject,
    text,
  });
}

/** Можно ли бронировать: нет успешного холда в cooldown; soft_lock — ретраим сразу. */
function shouldBook(eventId, ticketCount) {
  if (!AUTO_BOOK || bookingInFlight) return false;
  if (ticketCount <= 0) return false;
  const h = holds.get(eventId);
  if (!h) return true;
  if (h.pendingSoftLock) return true; // чужая корзина — долбим пока не возьмём
  const now = Date.now();
  if (now < h.cooldownUntil) return false;
  return true;
}

async function tryBook(cfg, meta) {
  if (!shouldBook(cfg.id, meta.ticketCount)) return;
  bookingInFlight = true;
  const prev = holds.get(cfg.id);
  const attempt = (prev?.attempt || 0) + 1;
  const preferSeatNumbers = prev?.seats || [];
  const t = new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour12: false });
  try {
    const preferNote = preferSeatNumbers.length ? ` prefer=[${preferSeatNumbers.join(',')}]` : '';
    console.log(`[${t}] 🎯 бронь ${cfg.label} #${attempt}${preferNote} (max ${MAX_TICKETS})…`);
    const result = await bookRadarioEvent(cfg.id, {
      maxTickets: MAX_TICKETS,
      preferSeatNumbers,
    });
    saveResult({
      platform: 'radario',
      action: attempt > 1 ? 'rebook' : 'book',
      attempt,
      label: cfg.label,
      eventId: cfg.id,
      at: new Date().toISOString(),
      preferSeatNumbers,
      result: {
        ok: result.ok,
        reason: result.reason || null,
        orderId: result.orderId || null,
        orderHash: result.orderHash || null,
        redirectUrl: result.redirectUrl || null,
        qrId: result.qrId || null,
        seats: result.seats || null,
        buyers: result.buyers || null,
        amount: result.amount ?? null,
      },
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
      });
      saveState();
      const seatLines = (result.seats || [])
        .map((s) => `  seat#${s.seatNumber} ${s.row || ''} м.${s.seatName || ''} type=${s.ticketTypeId} ${s.price}₽`)
        .join('\n');
      const retryLine = attempt > 1
        ? `ПОВТОР #${attempt} (предыдущий заказ, видимо, не оплатили вовремя).`
        : 'Первая бронь. Если не успеете оплатить — после окна снова забронируем те же места.';
      const payLine = result.redirectUrl
        ? `ОПЛАТА (СБП): ${result.redirectUrl}`
        : (result.qrId
          ? `QR выписан (qrId=${result.qrId}), redirectUrl пока пустой — откройте виджет/заказ #${result.orderId}`
          : `orderId=${result.orderId} — ссылка СБП не пришла, проверьте заказ вручную`);
      const text = [
        attempt > 1 ? '🔁 Опера нищих — ПОВТОРНАЯ бронь (с паспортами)' : '✅ Опера нищих — заказ создан в Radario (с паспортами)',
        retryLine,
        `Дата: ${cfg.label}`,
        `Event ID: ${cfg.id}`,
        `attempt: ${attempt}`,
        `orderId: ${result.orderId}`,
        `orderHash: ${result.orderHash || '—'}`,
        `amount: ${result.amount ?? '—'}`,
        `payment: ${result.paymentType}`,
        payLine,
        `покупатели: ${(result.buyers || []).join(', ')}`,
        'места:',
        seatLines || '  —',
        '',
        `Окно на оплату до повторной брони: ~${Math.round(REBOOK_AFTER_MS / 60000)} мин (если места снова свободны).`,
        `Виджет: https://radario.ru/customer/event/${cfg.id}/info?distributionType=Widget`,
      ].join('\n');
      console.log(`[${t}] ✅ #${attempt} orderId=${result.orderId} seats=[${seatNums.join(',')}] url=${result.redirectUrl || 'no-url'} qr=${result.qrId || '-'}`);
      await notifyBook(
        `${attempt > 1 ? '🔁' : '✅'} Опера нищих: заказ #${attempt} ${cfg.label} #${result.orderId}`,
        text,
      ).catch((e) => {
        console.log(`[${t}] ⚠️ письмо: ${e.message}`);
      });
    } else {
      console.log(`[${t}] ⚠️ бронь #${attempt} не вышла: ${result.reason || JSON.stringify(result).slice(0, 200)}`);
      if (result.reason === 'soft_lock') {
        // чужая корзина — нормальный ретрай, письма НЕ шлём (иначе спам каждые N мин)
        holds.set(cfg.id, {
          ...(prev || {}),
          orderId: prev?.orderId || null,
          seats: preferSeatNumbers.length ? preferSeatNumbers : (prev?.seats || []),
          attempt: prev?.attempt || 0,
          bookedAt: prev?.bookedAt || 0,
          cooldownUntil: 0,
          pendingSoftLock: true,
          sawZeroAfterBook: prev?.sawZeroAfterBook || false,
        });
        saveState();
      } else {
        // реальные ошибки — только tech-ящик, максимум 1 письмо на «волну»
        const lastFailMail = prev?.lastFailMailAt || 0;
        const alreadyMailed = !!prev?.lastFailMailAt;
        if (!alreadyMailed) {
          holds.set(cfg.id, {
            ...(prev || {}),
            ...(holds.get(cfg.id) || {}),
            pendingSoftLock: false,
            lastFailMailAt: Date.now(),
          });
          saveState();
          await notifyTech(
            `[tech] Опера нищих: бронь не вышла (${cfg.label})`,
            [
              `Дата: ${cfg.label}`,
              `ticketCount: ${meta.ticketCount}`,
              `reason: ${result.reason}`,
              result.reason === 'order_rejected'
                ? 'Заказ отвергнут API (payload/валидация). Смотри error ниже.'
                : '',
              `Виджет: https://radario.ru/customer/event/${cfg.id}/info?distributionType=Widget`,
              '',
              JSON.stringify(result, null, 2).slice(0, 3000),
            ].join('\n'),
          ).catch(() => {});
        } else if (Date.now() - lastFailMail > 30 * 60 * 1000) {
          const h = holds.get(cfg.id) || prev || {};
          h.lastFailMailAt = Date.now();
          holds.set(cfg.id, h);
          saveState();
          await notifyTech(
            `[tech] Опера нищих: бронь всё ещё не выходит (${cfg.label})`,
            `reason: ${result.reason}\n\n${JSON.stringify(result, null, 2).slice(0, 2000)}`,
          ).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.log(`[${t}] ⚠️ book error: ${err instanceof Error ? err.message : err}`);
    saveResult({
      platform: 'radario',
      action: 'book_error',
      attempt,
      label: cfg.label,
      eventId: cfg.id,
      at: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
      data: err?.data || null,
    });
    await notifyTech(
      `[tech] Опера нищих: ошибка брони ${cfg.label}`,
      `${err instanceof Error ? err.message : err}\n\nВиджет: https://radario.ru/customer/event/${cfg.id}/info?distributionType=Widget`,
    ).catch(() => {});
  } finally {
    bookingInFlight = false;
  }
}

async function notifyOpen(ev) {
  const text = [
    '[tech] Опера нищих — появились билеты (автобронь запущена).',
    `Дата: ${ev.label}`,
    `Event ID: ${ev.id}`,
    `ticketCount: ${ev.ticketCount}`,
    `цена: ${ev.minPrice}–${ev.maxPrice} ₽`,
    '',
    AUTO_BOOK ? 'Запускаю автобронь с паспортами…' : 'Автобронь выключена (RADARIO_AUTO_BOOK=0).',
    'Менеджерам уйдёт письмо только при успешной брони со ссылкой на оплату.',
    `Виджет: https://radario.ru/customer/event/${ev.id}/info?distributionType=Widget`,
  ].join('\n');
  return notifyTech(`[tech] Опера нищих: билеты ${ev.label} (${ev.ticketCount} шт)`, text);
}

console.log(
  `Опера нищих / Radario. Событий: ${EVENTS.length}. Интервал ${INTERVAL_MS}мс (hot ${HOT_INTERVAL_MS}). AUTO_BOOK=${AUTO_BOOK} max=${MAX_TICKETS} book→${NOTIFY_BOOK} tech→${NOTIFY_TECH} holds=${holds.size}`,
);

while (true) {
  const t = new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour12: false });
  let anyTickets = false;
  try {
    const events = await fetchGroup();
    const byId = new Map(events.map((e) => [Number(e.id), e]));
    for (const cfg of EVENTS) {
      const e = byId.get(cfg.id);
      if (!e) {
        console.log(`[${t}] ${cfg.label}: нет в eventGroup`);
        continue;
      }
      const count = Number(e.ticketCount || 0);
      const stopped = !!e.salesStopped;
      if (count > 0 && !stopped) anyTickets = true;
      const hold = holds.get(cfg.id);
      const holdNote = hold
        ? ` hold#${hold.attempt} seats=[${(hold.seats || []).join(',')}] cd=${Math.max(0, Math.round((hold.cooldownUntil - Date.now()) / 1000))}s`
        : '';
      console.log(`[${t}] ${cfg.label}: ticketCount=${count}, salesStopped=${stopped}, price=${e.minPrice}-${e.maxPrice}${holdNote}`);

      if (hold && count === 0) {
        hold.sawZeroAfterBook = true;
        // волна закончилась — сбросить «уже слали fail-mail», чтобы при новом появлении можно было алертнуть раз
        if (hold.pendingSoftLock || hold.lastFailMailAt) {
          hold.pendingSoftLock = false;
          hold.lastFailMailAt = 0;
        }
        saveState();
      }

      if (count > 0 && !stopped) {
        if (!alerted.has(cfg.id)) {
          alerted.add(cfg.id);
          saveResult({
            platform: 'radario',
            label: cfg.label,
            eventId: cfg.id,
            ticketCount: count,
            minPrice: e.minPrice,
            maxPrice: e.maxPrice,
            detectedAt: new Date().toISOString(),
          });
          console.log(`[${t}] 🔥 ${cfg.label}: появились билеты (${count})`);
          await notifyOpen({ ...cfg, ticketCount: count, minPrice: e.minPrice, maxPrice: e.maxPrice }).catch((err) => {
            console.log(`[${t}] ⚠️ письмо: ${err.message}`);
          });
        }
        // если места снова появились после нуля — можно бронировать раньше (холд оплаты снят)
        if (hold?.sawZeroAfterBook && Date.now() >= hold.cooldownUntil) {
          console.log(`[${t}] 🔁 ${cfg.label}: места снова в продаже после холда — повторная бронь`);
        }
        await tryBook(cfg, { ticketCount: count });
      }
    }
  } catch (err) {
    console.log(`[${t}] ⚠️ ${err instanceof Error ? err.message : err}`);
  }
  await new Promise((r) => setTimeout(r, anyTickets ? HOT_INTERVAL_MS : INTERVAL_MS));
}
