/**
 * Снайпер WOW CUP: Медведев vs Рублёв (Яндекс Билеты / TICKETSTEAM).
 *
 * ВАЖНО: sessionKey Яндекс перевыпускает. Не полагаться на hardcoded base64.
 * Актуальный ключ берём с https://wowcup.tennis/ (NUXT public.ticketUrl),
 * на каждом poll при 404 и периодически (RESOLVE_EVERY_MS).
 *
 * Антибан (бан 2026-03-05): Playwright/hallplan/preview — ТЯЖЁЛЫЙ путь.
 * Лёгкий poll = только getWidgetSession. Book/браузер — только когда
 * available вырос или кончился cooldown после «нет пар»/403. Не ретраить
 * полный book каждые N секунд на тех же available.
 *
 *   node wowcup-monitor.mjs
 *   node wowcup-monitor.mjs --pairs 8 --interval 1200
 *   node wowcup-monitor.mjs --session-key <override>   # только fallback
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import {
  getWidgetSession,
  isSaleOpen,
  bookPairsViaTicketsteam,
  resolveWowcupTicketFromSite,
} from './services/afishaTicketsteamBooking.js';
import { sendTransactionalMail, isMailConfigured } from './services/mail/transporter.js';
import { notifyOps } from './services/sniperOpsNotify.js';
import { registerPendingPayment } from './services/sniperPaymentTracker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

/** Fallback, если сайт недоступен. Предпочтителен alias с лендинга, не base64. */
const SESSION_KEY_FALLBACK = 'ticketsteam-8261@77813737';
const CLIENT_KEY_FALLBACK = '5a2f3e1d-f923-4b55-8a34-636ba6dfe922';
const SPECTACLE = 'WOW CUP: Медведев vs Рублёв';
const SITE_URL = 'https://wowcup.tennis/';
const RESOLVE_EVERY_MS = Number(process.env.WOWCUP_RESOLVE_EVERY_MS || 60_000);
/** Неоплаченный hold Яндекса дохнет ~10–15 мин. Старше TTL не считаем в «цель 8/8» — иначе бот спит вечно, а на сайте идут возвраты. */
const HOLD_TTL_MS = Number(process.env.WOWCUP_HOLD_TTL_MS || 20 * 60_000);
/** После «нет пар» не поднимать Playwright, пока available не вырастет или не истечёт cooldown. */
const EMPTY_BOOK_COOLDOWN_MS = Number(process.env.WOWCUP_EMPTY_BOOK_COOLDOWN_MS || 90_000);
const EMPTY_BOOK_COOLDOWN_MAX_MS = Number(process.env.WOWCUP_EMPTY_BOOK_COOLDOWN_MAX_MS || 10 * 60_000);
/** После 403 / too many requests — длинная пауза на book (poll сессии можно реже). */
const RATE_LIMIT_COOLDOWN_MS = Number(process.env.WOWCUP_RATE_LIMIT_COOLDOWN_MS || 15 * 60_000);
const DEFAULT_RESULTS = path.join(__dirname, 'data', 'sniper-results-wowcup.json');
const STATE_FILE = path.join(__dirname, 'data', 'wowcup-session-state.json');

function isRateLimitedError(e) {
  const msg = String(e?.message || e || '');
  return /403|429|too many requests|rate.?limit|captcha|smartcaptcha|antibot/i.test(msg);
}

function isNoPairsError(errors = []) {
  return errors.some((e) => /нет свободных пар|нет пар|на схеме/i.test(String(e?.error || e)));
}

function parseArgs(argv) {
  const args = {
    sessionKey: null,
    clientKey: null,
    interval: 1200,
    contactsFile: 'sniper-contacts.json',
    resultsFile: DEFAULT_RESULTS,
    notifyEmail: 'vladislav.leonenko@bk.ru,leonenkovlad2018@yandex.ru,gyrodin@mail.ru,iosif131999@gmail.com,info@prime-coder.ru',
    bcc: 'yaguda_io@mail.ru',
    pairs: null,
    siteUrl: SITE_URL,
    noResolve: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const n = argv[i + 1];
    if (a === '--session-key') args.sessionKey = n, i++;
    else if (a === '--client-key') args.clientKey = n, i++;
    else if (a === '--contacts-file') args.contactsFile = n, i++;
    else if (a === '--results-file') args.resultsFile = n, i++;
    else if (a === '--notify-email') args.notifyEmail = n, i++;
    else if (a === '--bcc') args.bcc = n, i++;
    else if (a === '--interval') args.interval = Number(n), i++;
    else if (a === '--pairs') args.pairs = Number(n), i++;
    else if (a === '--site-url') args.siteUrl = n, i++;
    else if (a === '--no-resolve') args.noResolve = true;
  }
  return args;
}

function loadContacts(file) {
  const p = path.resolve(__dirname, file);
  const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
  if (!Array.isArray(data) || !data.length) throw new Error(`Нет контактов в ${p}`);
  return data.map((c) => ({
    name: String(c.name || '').trim(),
    email: String(c.email || '').trim(),
    phone: String(c.phone || '').trim(),
  })).filter((c) => c.name && c.email);
}

function saveResults(file, record) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let list = [];
  try { list = JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { /* */ }
  list.push(record);
  fs.writeFileSync(file, JSON.stringify(list, null, 2));
}

function loadBooked(file, { ttlMs = HOLD_TTL_MS } = {}) {
  let active = 0;
  let stale = 0;
  const seatIds = new Set();
  const uses = new Map();
  const now = Date.now();
  try {
    const prev = JSON.parse(fs.readFileSync(file, 'utf-8'));
    for (const rec of prev) {
      const at = Date.parse(rec.bookedAt || '') || 0;
      for (const r of rec.results || []) {
        for (const id of r.seatIds || []) uses.set(id, (uses.get(id) || 0) + 1);
        if (r.status === 'cancelled' || r.status === 'expired') continue;
        const isPaid = r.status === 'paid' || r.paymentStatus === 'paid';
        const fresh = !ttlMs || !at || now - at < ttlMs;
        const exhausted = (r.seatIds || []).some((id) => (uses.get(id) || 0) >= 2);
        if (exhausted) {
          for (const id of r.seatIds || []) seatIds.add(id);
          stale += 1;
          continue;
        }
        if (!isPaid && !fresh) {
          stale += 1;
          continue;
        }
        active += 1;
        for (const id of r.seatIds || []) seatIds.add(id);
      }
    }
  } catch { /* */ }
  return { active, seatIds, stale };
}

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); } catch { return {}; }
}

function saveState(st) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(st, null, 2));
}

async function notify(record, notifyEmail, bcc) {
  const recipients = String(notifyEmail || '').split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
  if (!recipients.length) return { ok: false, reason: 'no_email' };
  const lines = (record.results || []).map(
    (r) => `${r.name || '—'} (${r.email || '—'})${r.phone ? ' · ' + r.phone : ''} | ${r.seats} | ${r.totalPrice} ₽ | ${r.paymentUrl}`,
  );
  const errLines = (record.errors || []).map((e) => `${e.email || e.name}: ${e.error}`);
  const text = [
    `${SPECTACLE}`,
    `Сессия: ${record.sessionId}${record.date ? ` · ${record.date}` : ''}`,
    `sessionKey: ${record.sessionKey}`,
    `Забронировано: ${record.results.length} заказов (пары)`,
    '',
    'Ссылки на оплату (виджет Яндекс Билетов):',
    ...lines.map((l) => '  ' + l),
    ...(errLines.length ? ['', 'Не удалось:', ...errLines.map((l) => '  ' + l)] : []),
    '',
    'Сгенерировано wowcup-monitor.',
  ].join('\n');
  return Promise.race([
    sendTransactionalMail({
      to: recipients.join(', '),
      subject: `🎾 WOW CUP: забронировано ${record.results.length} пар`,
      text,
      bcc,
    }),
    new Promise((resolve) => setTimeout(() => resolve({ ok: false, reason: 'mail_timeout' }), 12000)),
  ]);
}

function alertOps(subject, text) {
  return Promise.race([
    notifyOps({
      subject: `WOW CUP: ${subject}`,
      text,
      dedupeKey: `wowcup:${subject}`,
      ttlMs: 6 * 3600_000,
    }),
    new Promise((resolve) => setTimeout(() => resolve({ ok: false, reason: 'mail_timeout' }), 8000)),
  ]).catch((e) => console.error('alert mail fail', e.message));
}

const args = parseArgs(process.argv);
const contacts = loadContacts(args.contactsFile);
// --pairs 0 / не задан → без потолка цели (берём, пока есть места; hold стареет по TTL)
const targetPairs = args.pairs == null || args.pairs === 0 ? Number.POSITIVE_INFINITY : args.pairs;
const resultsFile = path.resolve(__dirname, args.resultsFile);
let { active: bookedPairs, seatIds: skipSeatIds, stale: staleHolds } = loadBooked(resultsFile);

function refreshBookedCounts() {
  const b = loadBooked(resultsFile);
  const prev = bookedPairs;
  bookedPairs = b.active;
  skipSeatIds = b.seatIds;
  staleHolds = b.stale;
  if (prev !== bookedPairs) {
    console.log(
      `[holds] active=${bookedPairs}/${targetPairs} (TTL ${Math.round(HOLD_TTL_MS / 60000)}м), сгорело неоплаченных≈${staleHolds}`,
    );
  }
  return b;
}

let sessionKey = args.sessionKey || SESSION_KEY_FALLBACK;
let clientKey = args.clientKey || CLIENT_KEY_FALLBACK;
let lastResolveAt = 0;
let lastAlertAt = 0;
let lastStatusLog = 0;
let bookingInFlight = false;
/** Не будить Playwright, пока Date.now() < bookCooldownUntil (empty book). */
let bookCooldownUntil = 0;
/** Отдельно от empty: 403/429 — нельзя сбрасывать при avail=0. */
let rateLimitUntil = 0;
let emptyBookStreak = 0;
/** availableSeatCount на момент последнего пустого book — ждём рост. */
let availAtLastEmptyBook = null;
let lastPollBackoffUntil = 0;
let consecutiveSession404 = 0;

async function ensureSession({ force = false, reason = '' } = {}) {
  if (args.noResolve) return { sessionKey, clientKey, changed: false };
  const due = force || Date.now() - lastResolveAt > RESOLVE_EVERY_MS;
  if (!due) return { sessionKey, clientKey, changed: false };

  const prev = sessionKey;
  const prevUrl = loadState().ticketUrl || '';
  try {
    const resolved = await Promise.race([
      resolveWowcupTicketFromSite(args.siteUrl),
      new Promise((_, reject) => setTimeout(() => reject(new Error('resolve timeout 20s')), 20_000)),
    ]);
    lastResolveAt = Date.now();
    clientKey = args.clientKey || resolved.clientKey || clientKey;
    const live = await Promise.race([
      getWidgetSession(resolved.sessionKey, clientKey),
      new Promise((_, reject) => setTimeout(() => reject(new Error('widget timeout 20s')), 20_000)),
    ]);
    sessionKey = live.sessionKey || resolved.sessionKey;
    const changed = prev !== sessionKey;
    const urlChanged = !!(resolved.ticketUrl && prevUrl && resolved.ticketUrl !== prevUrl);
    saveState({
      at: new Date().toISOString(),
      ticketUrl: resolved.ticketUrl,
      aliasKey: resolved.sessionKey,
      sessionKey,
      clientKey,
      sessionId: live.sessionId,
      reason: reason || 'periodic',
    });
    if (urlChanged) {
      console.log(`[resolve] ticketUrl CHANGED ${prevUrl} → ${resolved.ticketUrl}`);
      if (Date.now() - lastAlertAt > 6 * 3600_000) {
        lastAlertAt = Date.now();
        void alertOps(
          'WOW CUP: сменилась ссылка на билеты',
          `Было: ${prevUrl}\nСтало: ${resolved.ticketUrl}\nВ прошлый раз после смены ссылки места появлялись через пару дней. Бот охотится дальше. Ротацию sessionKey больше не шлём.`,
          args.notifyEmail,
          args.bcc,
        );
      }
    } else if (changed) {
      console.log(`[resolve] sessionKey CHANGED (без письма): ${prev.slice(0, 28)}… → ${sessionKey.slice(0, 28)}…`);
    } else {
      console.log(`[resolve] ok key=${sessionKey.slice(0, 36)}… avail=${live.availableSeatCount}`);
    }
    return { sessionKey, clientKey, changed, live };
  } catch (e) {
    lastResolveAt = Date.now();
    console.error('[resolve] FAIL', e instanceof Error ? e.message : e);
    return { sessionKey, clientKey, changed: false, error: e };
  }
}

console.log(`WOW CUP sniper`);
console.log(`  site:       ${args.siteUrl} (auto-resolve ${args.noResolve ? 'OFF' : 'ON'})`);
console.log(`  fallback:   ${sessionKey.slice(0, 36)}…`);
console.log(
  `  контактов:  ${contacts.length}, цель: ${Number.isFinite(targetPairs) ? targetPairs + ' пар' : 'без лимита'} (свежие hold ≤${Math.round(HOLD_TTL_MS / 60000)}м)`,
);
console.log(`  уже бронь:  ${bookedPairs} активных, ~${staleHolds || 0} сгоревших неоплаченных (не в цели)`);
console.log(`  interval:   ${args.interval}мс / resolve every ${RESOLVE_EVERY_MS}мс`);
console.log(`  emptyBook:  cooldown ${EMPTY_BOOK_COOLDOWN_MS}мс → max ${EMPTY_BOOK_COOLDOWN_MAX_MS}мс; rateLimit ${RATE_LIMIT_COOLDOWN_MS}мс`);
console.log(`  results:    ${resultsFile}`);
if (!isMailConfigured()) console.warn('⚠️  Почта не настроена — ссылки только в JSON.');

await ensureSession({ force: true, reason: 'startup' });
console.log(`  activeKey:  ${sessionKey.slice(0, 48)}…`);

function armEmptyBookCooldown(avail) {
  emptyBookStreak += 1;
  availAtLastEmptyBook = avail;
  const ms = Math.min(
    EMPTY_BOOK_COOLDOWN_MAX_MS,
    EMPTY_BOOK_COOLDOWN_MS * 2 ** Math.min(emptyBookStreak - 1, 4),
  );
  bookCooldownUntil = Date.now() + ms;
  return ms;
}

function armRateLimitCooldown(why) {
  rateLimitUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
  bookCooldownUntil = Math.max(bookCooldownUntil, rateLimitUntil);
  lastPollBackoffUntil = Date.now() + Math.min(RATE_LIMIT_COOLDOWN_MS, 60_000);
  console.warn(`[cooldown] rate-limit ${RATE_LIMIT_COOLDOWN_MS / 1000}s (${why})`);
}

function clearEmptyCooldown() {
  // не трогаем rateLimitUntil
  if (Date.now() < rateLimitUntil) {
    bookCooldownUntil = rateLimitUntil;
    return;
  }
  bookCooldownUntil = 0;
  emptyBookStreak = 0;
}

while (true) {
  const t = new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour12: false });
  try {
    // Пересчёт: сгоревшие unpaid hold не должны вечно держать «8/8 сплю»
    refreshBookedCounts();

    if (bookedPairs >= targetPairs) {
      if (Date.now() - lastStatusLog > 60000) {
        console.log(`[${t}] цель по свежим hold (${bookedPairs}/${targetPairs}), лёгкий poll — жду возвраты/выкладку.`);
        lastStatusLog = Date.now();
      }
      // Не continue навсегда: всё равно смотрим available; если вдруг места и TTL сбросил счётчик — возьмём
      await ensureSession({ reason: 'idle' });
      try {
        const idleSession = await getWidgetSession(sessionKey, clientKey);
        const idleAvail = idleSession.availableSeatCount || 0;
        if (idleAvail >= 2) {
          // места есть, но цель заполнена свежими — только лог; иначе refresh уже снизил booked
          if (Date.now() - lastStatusLog > 15000) {
            console.log(`[${t}] idle но available=${idleAvail} при ${bookedPairs}/${targetPairs} свежих hold`);
            lastStatusLog = Date.now();
          }
        }
      } catch {
        /* idle probe best-effort */
      }
      await new Promise((r) => setTimeout(r, Math.max(args.interval, 5000)));
      continue;
    }

    await ensureSession({ reason: 'poll' });

    let session;
    try {
      session = await getWidgetSession(sessionKey, clientKey);
      consecutiveSession404 = 0;
      if (session.sessionKey && session.sessionKey !== sessionKey) {
        sessionKey = session.sessionKey;
      }
    } catch (e) {
      const missing = e?.sessionMissing || /object-not-found|Session not found/i.test(String(e?.message || e));
      if (isRateLimitedError(e)) {
        armRateLimitCooldown('getWidgetSession');
        throw e;
      }
      if (missing) {
        consecutiveSession404 += 1;
        // Не долбить resolve+API каждые 1.2с на мёртвом ключе — backoff
        const wait404 = Math.min(5 * 60_000, 5_000 * 2 ** Math.min(consecutiveSession404 - 1, 5));
        console.error(`[${t}] session dead → force resolve (404×${consecutiveSession404}, next poll ≥${wait404}ms)`);
        await ensureSession({ force: true, reason: 'session-404' });
        try {
          session = await getWidgetSession(sessionKey, clientKey);
          consecutiveSession404 = 0;
        } catch (e2) {
          lastPollBackoffUntil = Date.now() + wait404;
          throw e2;
        }
      } else {
        throw e;
      }
    }

    const avail = session.availableSeatCount || 0;
    const remaining = Number.isFinite(targetPairs)
      ? Math.max(0, targetPairs - bookedPairs)
      : Math.max(1, Math.floor(avail / 2) || 100);
    const remainingLabel = Number.isFinite(targetPairs) ? String(remaining) : '∞';

    // Пока пусто — готовим мгновенный удар на 0→N (empty-cooldown гасим, rate-limit нет)
    if (avail < 2) {
      availAtLastEmptyBook = avail;
      clearEmptyCooldown();
    }

    if (!isSaleOpen(session) || avail < 2) {
      if (Date.now() - lastStatusLog > 15000) {
        console.log(
          `[${t}] закрыто/мало мест: saleStatus=${session.saleStatus} available=${avail}/${session.totalSeatCount} | key=${sessionKey.slice(0, 24)}… | осталось ${remainingLabel} пар`,
        );
        lastStatusLog = Date.now();
      }
    } else if (!bookingInFlight) {
      const now = Date.now();
      // Рост available / выход из нуля = book сразу (мимо empty-cooldown)
      const availGrew =
        availAtLastEmptyBook == null || avail > availAtLastEmptyBook;
      if (availGrew) clearEmptyCooldown();
      const blockedByRate = now < rateLimitUntil;
      const cooldownOk = now >= bookCooldownUntil;
      const mayBook = !blockedByRate && (availGrew || cooldownOk);

      if (!mayBook) {
        if (now - lastStatusLog > 15000) {
          const left = Math.ceil((bookCooldownUntil - now) / 1000);
          console.log(
            `[${t}] ОТКРЫТО available=${avail}, но book cooldown ${left}s (ждём рост мест или таймер; streak=${emptyBookStreak})`,
          );
          lastStatusLog = now;
        }
      } else {
        bookingInFlight = true;
        const waveWant = Number.isFinite(targetPairs)
          ? remaining
          : Math.max(1, Math.floor(avail / 2));
        console.log(
          `[${t}] 🔥 ОТКРЫТО: ${avail} мест (status=${session.saleStatus}). Броню до ${waveWant} пар (цель ${remainingLabel})…`,
        );
        try {
          const { results, errors } = await bookPairsViaTicketsteam({
            sessionKey,
            clientKey,
            contacts,
            pairCount: waveWant,
            skipSeatIds,
          });

          if (results.length) {
            emptyBookStreak = 0;
            availAtLastEmptyBook = null;
            bookCooldownUntil = 0;
            bookedPairs += results.length;
            for (const r of results) for (const id of r.seatIds || []) skipSeatIds.add(id);
            const record = {
              sessionId: session.sessionId,
              sessionKey,
              date: session.sessionDate,
              spectacle: SPECTACLE,
              bookedAt: new Date().toISOString(),
              results,
              errors,
            };
            saveResults(resultsFile, record);
            for (const r of results) {
              if (!r.orderId && !r.paymentUrl) continue;
              try {
                registerPendingPayment({
                  platform: 'wowcup-ticketsteam',
                  orderId: r.orderId || r.paymentUrl,
                  paymentUrl: r.paymentUrl || null,
                  label: SPECTACLE,
                  eventId: session.sessionId,
                  amount: r.totalPrice ?? null,
                  tickets: (r.seatIds || []).length || 2,
                  seats: r.seats || null,
                  trackUntilMs: Date.now() + 3 * 3600_000,
                });
              } catch { /* */ }
            }
            console.log(`✅ +${results.length} заказов (всего ${bookedPairs}/${targetPairs}), ошибок ${errors.length}`);
            for (const r of results) console.log(`   ${r.name} | ${r.seats} | ${r.totalPrice} ₽ | ${r.paymentUrl}`);
            for (const e of errors) console.log(`   ❌ ${e.email || e.name}: ${e.error}`);
            const mail = await notify(record, args.notifyEmail, args.bcc);
            console.log(`📧 ${mail.ok ? 'письмо отправлено' : 'письмо не ушло: ' + (mail.reason || mail.error || '')}`);
          } else if (!results.length && (isNoPairsError(errors) || !errors.length)) {
            const ms = armEmptyBookCooldown(avail);
            console.log(
              `[${t}] открыто, пар нет (available=${avail}) — Playwright cooldown ${Math.round(ms / 1000)}s, лёгкий poll продолжается`,
            );
            for (const e of errors) console.log(`   ❌ ${e.email || e.name}: ${e.error}`);
          } else {
            // Ошибки book без успеха — короткий cooldown, не спамить сразу
            const ms = armEmptyBookCooldown(avail);
            console.log(`⚠️ book без успеха, cooldown ${Math.round(ms / 1000)}s`);
            for (const e of errors) {
              console.log(`   ❌ ${e.email || e.name}: ${e.error}`);
              if (isRateLimitedError(e)) armRateLimitCooldown(e.error);
            }
          }
        } catch (e) {
          console.error(`[${t}] book error:`, e instanceof Error ? e.message : e);
          if (isRateLimitedError(e)) armRateLimitCooldown(e.message);
          else armEmptyBookCooldown(avail);
        } finally {
          bookingInFlight = false;
        }
      }
    }
  } catch (e) {
    if (isRateLimitedError(e)) armRateLimitCooldown(String(e?.message || e));
    if (Date.now() - lastStatusLog > 15000) {
      console.error(`[${t}] poll error:`, e instanceof Error ? e.message : e);
      lastStatusLog = Date.now();
    }
  }
  const sleepMs = Math.max(
    args.interval,
    lastPollBackoffUntil > Date.now() ? lastPollBackoffUntil - Date.now() : 0,
  );
  await new Promise((r) => setTimeout(r, sleepMs));
}
