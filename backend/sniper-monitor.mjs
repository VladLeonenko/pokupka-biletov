/**
 * Монитор старта продаж + авто-бронирование (24/7, автономный).
 *
 * Поллит сессии и как только открываются продажи — бронирует пары соседних мест
 * для покупателей, сохраняет результат в data/sniper-results.json и шлёт письмо
 * со всеми ссылками на оплату (несколько получателей + BCC).
 *
 * Пример (напрямую по sessionId):
 *   node sniper-monitor.mjs --session 135037141 --session 135088882 \
 *     --contacts-file sniper-contacts.json \
 *     --notify-email "a@bk.ru,b@yandex.ru,info@prime-coder.ru" --bcc yaguda_io@mail.ru
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import {
  resolveEventSessions,
  getSessionAvailability,
  bookSeatsViaApi,
  renewPayment,
  MXAT_APP_KEY,
} from './services/afishaApiBooking.js';
import { sendTransactionalMail, isMailConfigured } from './services/mail/transporter.js';
import { MHT_KABALA_PREFERENCE } from './utils/findBestSeatsInHall.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
const RESULTS_FILE = path.join(__dirname, 'data', 'sniper-results.json');
const BLACKLIST_FILE = path.join(__dirname, 'data', 'sniper-contacts-blacklist.json');

function loadBlacklist() {
  try { return new Set(JSON.parse(fs.readFileSync(BLACKLIST_FILE, 'utf-8'))); } catch { return new Set(); }
}
function saveBlacklist(set) {
  fs.mkdirSync(path.dirname(BLACKLIST_FILE), { recursive: true });
  fs.writeFileSync(BLACKLIST_FILE, JSON.stringify([...set], null, 2));
}
let contactBlacklist = loadBlacklist();


function parseArgs(argv) {
  const args = { sessions: [], interval: 1500, appKey: MXAT_APP_KEY, concurrency: 5, maxTries: 3, contactsFile: 'sniper-contacts.json', excludeMonth: 'сентябр', spectacle: 'Кабала святош' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i], n = argv[i + 1];
    if (a === '--url') args.url = n, i++;
    else if (a === '--session') args.sessions.push(n), i++;
    else if (a === '--contacts-file') args.contactsFile = n, i++;
    else if (a === '--results-file') args.resultsFile = n, i++;
    else if (a === '--notify-email') args.notifyEmail = n, i++;
    else if (a === '--bcc') args.bcc = n, i++;
    else if (a === '--interval') args.interval = Number(n), i++;
    else if (a === '--pairs') args.pairs = Number(n), i++;
    else if (a === '--concurrency') args.concurrency = Number(n), i++;
    else if (a === '--max-tries') args.maxTries = Number(n), i++;
    else if (a === '--app-key') args.appKey = n, i++;
    else if (a === '--exclude-month') args.excludeMonth = n, i++;
    else if (a === '--exclude-dates') args.excludeDates = String(n).split(',').map((s) => s.trim()).filter(Boolean), i++;
    else if (a === '--spectacle') args.spectacle = n, i++;
  }
  return args;
}

function loadContacts(file) {
  const p = path.resolve(__dirname, file);
  const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
  if (!Array.isArray(data) || !data.length) throw new Error(`Нет контактов в ${p}`);
  return data
    .map((c) => ({ name: String(c.name || '').trim(), email: String(c.email || '').trim(), phone: String(c.phone || '').trim() }))
    .filter((c) => c.name && c.email && !contactBlacklist.has(c.email));
}

// «2026-09-18T19:00:00» (время МХТ/Москвы без зоны) → «пт, 18 сентября · 19:00».
function formatRuDate(iso) {
  if (!iso) return '';
  const raw = String(iso).trim();
  const withZone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(raw) ? `${raw}+03:00` : raw;
  const d = new Date(withZone);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
    hour12: false,
  });
}

function saveResults(record) {
  fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
  let list = [];
  try { list = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8')); } catch {}
  list.push(record);
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(list, null, 2));
}

// Продление броней: повторный POST /payments/{orderId} обновляет окно оплаты (~45 мин),
// чтобы бронь не слетала, пока оператор не оплатит. Запускается раз в ~30 минут.
async function renewReservations(appKey) {
  let list = [];
  try { list = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8')); } catch { return; }
  if (!Array.isArray(list) || !list.length) return;
  let changed = false;
  for (const rec of list) {
    for (const r of rec.results || []) {
      if (!r.orderId) continue;
      if (r.status === 'success' || r.status === 'cancelled') continue; // оплачен/уже слетел
      try {
        const p = await renewPayment(r.orderId, appKey);
        if (p && p.payUrl) {
          r.paymentUrl = p.payUrl;
          r.status = p.status;
          r.remainingTime = p.remainingTime;
          if (p.qrCode) r.qrCode = p.qrCode;
          changed = true;
          console.log(`[renew] ${r.orderId}: бронь продлена, окно оплаты ${p.remainingTime}с`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // Только если заказ реально отменён/истёк — помечаем слетевшим, чтобы снайпер перебронировал.
        if (/отменен|отменён|нельзя|не осталось|истек|истёк|expired|cancel|400|404|409/i.test(msg)) {
          r.status = 'cancelled';
          changed = true;
          console.log(`[renew] ${r.orderId}: заказ отменён/истёк — бронь слетела, места вернутся в продажу.`);
        } else {
          console.log(`[renew] ${r.orderId}: временная ошибка (${msg.slice(0, 80)}) — повторю в следующий цикл.`);
        }
      }
      await new Promise((res) => setTimeout(res, 250));
    }
  }
  if (changed) fs.writeFileSync(RESULTS_FILE, JSON.stringify(list, null, 2));
}

async function notifyEmail(record, notifyEmail, bcc) {
  const recipients = String(notifyEmail || '').split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
  if (!recipients.length) return { ok: false, reason: 'no_email' };
  const lines = record.results.map((r) => `${r.name || '—'} (${r.email || '—'})${r.phone ? ' · ' + r.phone : ''} | ${r.seats} | ${r.totalPrice} ₽ | ${r.paymentUrl}`);
  const errLines = record.errors.map((e) => `${e.email || e.name}: ${e.error}`);
  const text = [
    `Сессия: ${record.sessionId}${record.date ? ` · ${formatRuDate(record.date)}` : ''}`,
    `Забронировано: ${record.results.length} заказов`,
    '',
    'Ссылки на оплату:',
    ...lines.map((l) => '  ' + l),
    ...(errLines.length ? ['', 'Не удалось:', ...errLines.map((l) => '  ' + l)] : []),
    '',
    'Сгенерировано снипером biletvsem.',
  ].join('\n');
  return sendTransactionalMail({
    to: recipients.join(', '),
    subject: `🔥 Кабала святош: забронировано ${record.results.length} заказов`,
    text,
    bcc,
  });
}

const args = parseArgs(process.argv);
const contacts = loadContacts(args.contactsFile);
console.log(`Контактов: ${contacts.length} (пар к брони: ${args.pairs ?? contacts.length})`);
if (!isMailConfigured()) console.warn('⚠️  Почта не настроена (EMAIL_HOST/USER/PASS). Письмо не уйдёт — но ссылки будут в data/sniper-results.json.');

let targetSessions = args.sessions;
if (args.url && targetSessions.length === 0) {
  console.log(`Резолвлю сессии: ${args.url}`);
  const { sessions, appKey } = await resolveEventSessions(args.url, args.appKey);
  args.appKey = appKey;
  console.log('Сессии события:');
  for (const s of sessions) console.log(`  ${s.sessionId} | ${s.date} | ${s.status}`);
  // Исключаем месяцы (по умолчанию сентябрь).
  const excl = String(args.excludeMonth || '').toLowerCase().split(',').map((x) => x.trim()).filter(Boolean);
  let kept = sessions.filter((s) => !excl.some((m) => (s.date || '').toLowerCase().includes(m)));
  // Исключаем конкретные даты декабря (--exclude-dates 21).
  if (args.excludeDates?.length) {
    kept = kept.filter((s) => {
      const d = (s.date || '').toLowerCase();
      if (!d.includes('декабр')) return true; // не декабрь — оставляем
      return !args.excludeDates.some((t) => d.includes(t.toLowerCase()));
    });
  }
  for (const s of sessions) {
    if (!kept.includes(s)) console.log(`  ⏭️ исключаю: ${s.sessionId} | ${s.date}`);
  }
  targetSessions = kept.map((s) => s.sessionId);
  if (!targetSessions.length) {
    console.error('Нет целевых сессий после фильтрации. Проверь даты на странице события.');
    process.exit(1);
  }
  console.log('Целевые сессии:', targetSessions.join(', '));
}
if (!targetSessions.length) {
  console.error('Укажите --url или --session <id>.');
  process.exit(1);
}

// Целевые сессии: "sessionId[:pairs]" → сколько пар бронировать на каждую.
const defaultPairs = args.pairs ?? contacts.length;
const sessionTargets = new Map();
const sessionContacts = new Map();
let contactCursor = 0;
for (const raw of targetSessions) {
  const [id, cnt] = String(raw).split(':');
  if (!id) continue;
  const pairs = cnt ? Number(cnt) : defaultPairs;
  sessionTargets.set(id, pairs);
  // каждой сессии — свой непересекающийся срез контактов (первые 20 пар → первые 20 контактов и т.д.)
  sessionContacts.set(id, contacts.slice(contactCursor, contactCursor + pairs));
  contactCursor += pairs;
}
targetSessions = [...sessionTargets.keys()];

// Идемпотентность при рестарте PM2: сколько пар уже забронировано на каждой сессии.
const bookedPairs = new Map();
try {
  const prev = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
  for (const rec of prev) {
    const sid = String(rec.sessionId);
    const active = (rec.results || []).filter((r) => r.status !== 'cancelled').length;
    bookedPairs.set(sid, (bookedPairs.get(sid) || 0) + active);
  }
  if (bookedPairs.size) console.log('Уже забронировано ранее:', [...bookedPairs].map(([k, v]) => `${k}(${v} пар)`).join(', '));
} catch {}
console.log('\nЦели:');
for (const sid of targetSessions) console.log(`  ${sid} → ${sessionTargets.get(sid)} пар (забронировано: ${bookedPairs.get(sid) || 0})`);
console.log(`\nМониторинг старт. Интервал: ${args.interval}мс. Приоритет мест: МХТ (Партер→Амфитеатр→Бельэтаж→Ложи→Балкон). Работает 24/7.\n`);

// Уже занятые нами места (чтобы не бронировать их повторно при докидывании мест).
const bookedSeatIdsBySession = new Map();
try {
  const prev = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
  for (const rec of prev) {
    const sid = String(rec.sessionId);
    for (const r of rec.results || []) {
      if (r.status === 'cancelled') continue;
      for (const id of r.seatIds || []) {
        if (!bookedSeatIdsBySession.has(sid)) bookedSeatIdsBySession.set(sid, new Set());
        bookedSeatIdsBySession.get(sid).add(id);
      }
    }
  }
} catch {}
const lastNoPairAt = new Map();
const lastCaptchaAlert = new Map();
let lastRenewAt = 0;

while (true) {
  for (const sid of targetSessions) {
    const target = sessionTargets.get(sid);
    const booked = bookedPairs.get(sid) || 0;
    const remaining = target - booked;
    if (remaining <= 0) continue; // цель по сессии достигнута

    const a = await getSessionAvailability(sid, args.appKey);
    const t = new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour12: false });
    if (a.availableCount > 0) {
      console.log(`[${t}] 🔥 ${sid}: доступно ${a.availableCount} мест (${a.minPrice}₽). Бронирую ещё ${remaining} пар(ы)...`);
      let seatSet = bookedSeatIdsBySession.get(sid);
      if (!seatSet) { seatSet = new Set(); bookedSeatIdsBySession.set(sid, seatSet); }
      const cs = sessionContacts.get(sid);
      const sessionContactsList = cs && cs.length ? cs : contacts;
      const { results, errors } = await bookSeatsViaApi({
        sessionId: sid,
        appKey: args.appKey,
        pairCount: remaining,
        contacts: sessionContactsList,
        concurrency: args.concurrency,
        maxTries: args.maxTries,
        preference: MHT_KABALA_PREFERENCE,
        skipSeatIds: seatSet,
      });
      if (results.length || errors.length) {
        bookedPairs.set(sid, booked + results.length);
        const record = { sessionId: sid, date: a.time, label: formatRuDate(a.time), spectacle: args.spectacle, bookedAt: new Date().toISOString(), results, errors };
        saveResults(record);
        console.log(`\n✅ ${sid}: +${results.length} заказов (всего ${bookedPairs.get(sid)}/${target} пар), ошибок ${errors.length}.`);
        for (const r of results) console.log(`   ${r.name} (${r.email}) | ${r.seats} | ${r.totalPrice} ₽ | ${r.paymentUrl}`);
        for (const e of errors) {
          console.log(`   ❌ ${e.name || e.email}: ${e.error}`);
          if (/VALIDATION_FAILED|не может быть оформлен|заблокирован|blacklisted/i.test(String(e.error))) {
            const email = e.email || String(e.error).match(/[\w.-]+@[\w.-]+\.\w+/)?.[0];
            if (email && !contactBlacklist.has(email)) {
              contactBlacklist.add(email);
              saveBlacklist(contactBlacklist);
              console.log(`   🚫 ${email} занесён в чёрный список (Afisha/Yandex блок).`);
            }
          }
        }
        const mail = await notifyEmail(record, args.notifyEmail || contacts[0].email, args.bcc || 'yaguda_io@mail.ru');
        console.log(`📧 Письмо: ${mail.ok ? `отправлено (${mail.via})` : 'не отправлено — ' + (mail.reason || 'нет')}`);
        console.log('Ссылки сохранены в data/sniper-results.json\n');
      } else if (Date.now() - (lastNoPairAt.get(sid) || 0) > 60000) {
        console.log(`[${t}] ${sid}: доступно ${a.availableCount} мест, но новых свободных пар нет — жду выкладки (осталось ${remaining} пар).`);
        lastNoPairAt.set(sid, Date.now());
      }
    } else if (a.captchaBlocked) {
      console.log(`[${t}] 🔴 ${sid}: КАПЧА/429 блокирует API (${a.error}) | осталось ${remaining} пар`);
      // раз в 3 минуты — тревожное письмо, чтобы не засыпать почту
      if (Date.now() - (lastCaptchaAlert.get(sid) || 0) > 180000) {
        lastCaptchaAlert.set(sid, Date.now());
        const to = args.notifyEmail || contacts[0].email;
        await sendTransactionalMail({
          to,
          bcc: args.bcc || 'yaguda_io@mail.ru',
          subject: `⚠️ КАПЧА блокирует снайпер — сессия ${sid}`,
          text: [
            `Сессия ${sid}: API Афиши возвращает 429/капчу, бронь не проходит.`,
            `Ошибка: ${a.error}`,
            'Авто-решение SVG-капчи включено; растровые капчи сохраняются в data/captcha/.',
            'Монитор продолжает поллить и автоматически повторит бронь, когда капча пройдёт.',
          ].join('\n'),
        }).catch(() => {});
        console.log(`📧 Тревога о капче отправлена на ${to}.`);
      }
    } else {
      console.log(`[${t}] ${sid}: закрыто (${a.availableCount} мест)${a.error ? ' — ' + a.error : ''} | осталось ${remaining} пар`);
    }
  }
  // Продление активных броней (раз в ~30 минут), чтобы окно оплаты не истекало.
  if (Date.now() - lastRenewAt > 30 * 60 * 1000) {
    lastRenewAt = Date.now();
    await renewReservations(args.appKey);
  }
  // монитор работает 24/7: до-бронирует по мере выкладки новых мест, пока цель не достигнута
  await new Promise((r) => setTimeout(r, args.interval));
}
