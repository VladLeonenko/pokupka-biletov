// ton-monitor.mjs — снайпер Театра Наций («Обыкновенная смерть»).
// Поллит наличие мест и при открытии продаж бронирует пары (2 места = 1 заказ)
// по аккаунтам (1 заказ на аккаунт), получает ссылку на оплату и шлёт письмо.
// RISK: eventHash/nombilkn hardcoded — если страница события сменится, бот молча мёртв.
// При смене афиши обновить --event-hash / --url; не повторять кейс wowcup sessionKey.
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getStoken,
  login,
  getPlaces,
  reserveSeats,
  finalizeReservation,
  TON_LOGIN_PAGE,
} from './services/tonApiBooking.js';
import { sendTransactionalMail } from './services/mail/transporter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const RESULTS_FILE = path.join(__dirname, 'data', 'ton-results.json');

function parseArgs(argv) {
  const a = {
    eventHash: '906d826aa39097d794c3dc79d3e5e6de',
    nombilkn: '6821',
    eventUrl: 'https://theatreofnations.ru/event/906d826aa39097d794c3dc79d3e5e6de/',
    accountsFile: 'ton-accounts.json',
    notifyEmail: 'vladislav.leonenko@bk.ru',
    bcc: 'yaguda_io@mail.ru',
    interval: 2000,
    concurrency: 2,
    once: false,
    maxPairs: 0,
    battle: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i], n = argv[i + 1];
    if (k === '--event-hash') { a.eventHash = n; i++; }
    else if (k === '--nombilkn') { a.nombilkn = n; i++; }
    else if (k === '--url') { a.eventUrl = n; i++; }
    else if (k === '--accounts-file') { a.accountsFile = n; i++; }
    else if (k === '--notify-email') { a.notifyEmail = n; i++; }
    else if (k === '--bcc') { a.bcc = n; i++; }
    else if (k === '--interval') { a.interval = Number(n); i++; }
    else if (k === '--concurrency') { a.concurrency = Number(n); i++; }
    else if (k === '--max-pairs') { a.maxPairs = Number(n); i++; }
    else if (k === '--once') a.once = true;
    else if (k === '--battle') a.battle = true;
  }
  const m = a.eventUrl.match(/event\/([a-z0-9]+)/i);
  if (m) a.eventHash = m[1];
  return a;
}

function loadAccounts(file) {
  const p = path.resolve(__dirname, file);
  const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
  return data.map((c) => ({ email: String(c.email).trim(), password: String(c.password) })).filter((c) => c.email && c.password);
}

function loadResults() {
  try { return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8')); } catch { return []; }
}
function saveResult(rec) {
  fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
  const list = loadResults();
  list.push(rec);
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(list, null, 2));
}

// Состояние аккаунтов: { email: { status: 'locked'|'paid', seats, paymentUrl, sessionLabel, ... } }
const STATE_FILE = path.join(__dirname, 'data', 'ton-account-state.json');
function readAccountState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); } catch { return {}; }
}
function writeAccountState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}
function isAccountLocked(state, email) {
  return (state[email] && state[email].status === 'locked') ? true : false;
}
function markAccountLocked(email, res) {
  const state = readAccountState();
  state[email] = {
    status: 'locked',
    seats: res.seats || '',
    paymentUrl: res.paymentUrl || '',
    sessionLabel: res.sessionLabel || '',
    lockedAt: new Date().toISOString(),
  };
  writeAccountState(state);
}

// Кэш JWT после предлогина (чтобы в бою не тратить капчу на повторный вход).
const tokenCache = new Map();
async function preLogin(accounts) {
  await Promise.all(accounts.map(async (a) => {
    if (tokenCache.has(a.email)) return; // уже залогинены — не тратим капчу
    try {
      const { access } = await login(a.email, a.password);
      tokenCache.set(a.email, access);
      console.log(`  🔑 логин OK: ${a.email}`);
    } catch (e) {
      console.log(`  ⚠️ логин не удался: ${a.email} — ${(e instanceof Error ? e.message : e).slice(0, 60)}`);
    }
  }));
}

// Боевые сессии «Обыкновенная смерть» (nombilkn известен, event-hash резолвится из афиши).
const BATTLE_SESSIONS = [
  { nombilkn: '6905', label: '20 ноября' },
  { nombilkn: '6906', label: '21 ноября' },
];
const PERFORMANCE_ID = 366;
const BATTLE_DATE_START = '2026-11-01';
const BATTLE_DATE_END = '2026-11-30';

// Резолв event-hash'ей из афиши (/events_ajax/) для боевых сессий.
async function resolveEventHashes(dateStart = BATTLE_DATE_START, dateEnd = BATTLE_DATE_END) {
  const url = `https://theatreofnations.ru/events_ajax/?performance=${PERFORMANCE_ID}&date_start=${encodeURIComponent(dateStart)}&date_end=${encodeURIComponent(dateEnd)}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`afisha: HTTP ${r.status}`);
  const j = await r.json().catch(() => ({}));
  const html = String(j.html || '');
  const out = {};
  for (const card of html.split('events_groups_row')) {
    const cn = card.match(/data-cast_n="(\d+)"/)?.[1];
    const ev = card.match(/href="\/event\/([a-z0-9]+)\/"/)?.[1];
    if (cn && ev) out[cn] = ev;
  }
  return out;
}

// Критерии мест: ряд 5 весь, ряд 4 весь, ряд 3 — места 3,4,18,19. Ряды 1-2 — не берём.
const SEAT_RULES = [
  { row: '5', seats: null },                                            // весь ряд 5
  { row: '4', seats: null },                                            // весь ряд 4
  { row: '3', seats: ['3', '4', '18', '19'] },                          // ряд 3 — 3,4,18,19
];

function rowOf(p) { return String(p.row ?? p.Row ?? ''); }
function seatOf(p) { return String(p.seat ?? p.Seat ?? ''); }
function sectorOf(p) { return String(p.name_sec ?? p.Name_sec ?? 'Партер'); }
// Идентификатор места для брони: NomBilKn-cod_sec-Row-Seat (как в событии).
function placeCode(p) { return `${p.NomBilKn}-${p.cod_sec}-${rowOf(p)}-${seatOf(p)}`; }

function allowedSeat(place) {
  const row = rowOf(place);
  const seat = seatOf(place);
  for (const r of SEAT_RULES) {
    if (row !== r.row) continue;
    if (r.seats === null) return true;
    if (r.seats.includes(seat)) return true;
  }
  return false;
}

// Формирует целевые пары (по 2 соседних места) и одиночные места.
// Сортировка внутри ряда — середина вперёд (центр ряда ~11 для 21 места).
const ROW_CENTER = 11;
function buildPairs(places) {
  const avail = places.filter((p) => allowedSeat(p));
  const byRow = new Map();
  for (const p of avail) {
    const row = rowOf(p);
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row).push(p);
  }
  const pairs = [];
  const singles = [];
  for (const rule of SEAT_RULES) {
    const list = byRow.get(rule.row);
    if (!list) continue;
    list.sort((x, y) => Number(seatOf(x)) - Number(seatOf(y)));
    for (let i = 0; i < list.length; i++) {
      const next = list[i + 1];
      if (next && Number(seatOf(next)) - Number(seatOf(list[i])) === 1) {
        pairs.push([list[i], next]);
        i++; // пропускаем использованное соседнее
      } else {
        singles.push(list[i]);
      }
    }
  }
  const midDist = (a) => Math.abs(a.reduce((s, p) => s + Number(seatOf(p)), 0) / a.length - ROW_CENTER);
  pairs.sort((a, b) => midDist(a) - midDist(b));
  singles.sort((a, b) => Math.abs(Number(seatOf(a)) - ROW_CENTER) - Math.abs(Number(seatOf(b)) - ROW_CENTER));
  return { pairs, singles };
}

function pairLabel(pair) {
  return pair.map((p) => `${sectorOf(p)}, ряд ${rowOf(p)}, место ${seatOf(p)}`).join(' + ');
}

async function notify(record, notifyEmail, bcc) {
  const lines = record.map((r) => (r.ok
    ? `${r.email} | ${r.seats} | ссылка: ${r.paymentUrl || '—'}`
    : `${r.email} | ❌ ${r.error}`));
  const text = [
    `Театр Наций — бронирование (${record.length} аккаунтов):`,
    '',
    ...lines.map((l) => '  ' + l),
    '',
    'Оплата: войдите в личный кабинет или откройте ссылку. На оплату ~20–30 минут.',
    'Сгенерировано снипером biletvsem.',
  ].join('\n');
  return sendTransactionalMail({
    to: notifyEmail,
    bcc,
    subject: `🎭 Обыкновенная смерть: забронировано ${record.filter((r) => r.ok).length} заказов`,
    text,
  }).catch(() => ({ ok: false, reason: 'mail_error' }));
}

async function bookPair(account, pair, args) {
  const res = { email: account.email, seats: pairLabel(pair), ok: false, error: null, paymentUrl: null };
  try {
    let access = tokenCache.get(account.email);
    if (!access) {
      const r = await login(account.email, account.password);
      access = r.access;
      tokenCache.set(account.email, access);
    }
    const seats = pair.map(placeCode);
    // капча резерва решается на странице логина (тот же sitekey, RuCaptcha решает её стабильно)
    const rsv = await reserveSeats(access, seats, TON_LOGIN_PAGE);
    if (rsv.status !== 200 || rsv.data?.status !== 'ok') {
      res.error = rsv.data?.msg || rsv.data?.raw || `reserve HTTP ${rsv.status}`;
      return res;
    }
    const fin = await finalizeReservation(access);
    if (fin.status === 200 && fin.data?.status === 'ok') {
      res.ok = true;
      res.paymentUrl = fin.data.msg || null;
    } else {
      res.ok = true; // резерв выполнен, оплата — партнёром вручную
      res.error = fin.data?.msg || fin.data?.raw || `finalize HTTP ${fin.status}`;
    }
  } catch (e) {
    res.error = e instanceof Error ? e.message : String(e);
  }
  return res;
}

async function runBooking(args, sessions) {
  const accounts = loadAccounts(args.accountsFile);
  const state = readAccountState();
  const availAccounts = accounts.filter((a) => !isAccountLocked(state, a.email));
  console.log(`Аккаунтов: ${accounts.length} (доступно ${availAccounts.length}, заперто ${accounts.length - availAccounts.length}).`);

  // Предлогин всех доступных аккаунтов — в бою остаётся только капча резерва.
  await preLogin(availAccounts);

  // Собрать целевые места (пары + одиночные) из всех сессий.
  const jobs = [];
  for (const s of sessions) {
    const stoken = await getStoken();
    const body = await getPlaces(stoken, s.eventHash, s.nombilkn);
    const places = Array.isArray(body.EvailPlaceList) ? body.EvailPlaceList : [];
    const { pairs, singles } = buildPairs(places);
    console.log(`  ${s.label}: доступно ${places.length} мест, пар ${pairs.length}, одиночных ${singles.length}`);
    for (const p of pairs) jobs.push({ seats: p, session: s, row: rowOf(p[0]), isPair: true });
    for (const p of singles) jobs.push({ seats: [p], session: s, row: rowOf(p), isPair: false });
  }

  if (!jobs.length) {
    console.log('Целевых мест нет.');
    return null;
  }

  // Приоритет: сначала пары, потом одиночные; внутри — ряд 5 → 4 → 3, середина вперёд, затем дата.
  const rowRank = { '5': 0, '4': 1, '3': 2 };
  const midDist = (j) => Math.abs(j.seats.reduce((s, p) => s + Number(seatOf(p)), 0) / j.seats.length - ROW_CENTER);
  jobs.sort((a, b) =>
    (a.isPair === b.isPair ? 0 : a.isPair ? -1 : 1)
    || (rowRank[a.row] ?? 9) - (rowRank[b.row] ?? 9)
    || midDist(a) - midDist(b)
    || a.session.label.localeCompare(b.session.label));

  const limit = args.maxPairs > 0
    ? Math.min(args.maxPairs, jobs.length, availAccounts.length)
    : Math.min(jobs.length, availAccounts.length);
  const targets = jobs.slice(0, limit);
  console.log(`Бронирую ${targets.length} заказов (билетов: ${targets.reduce((s, j) => s + j.seats.length, 0)})...`);

  const results = [];
  let cursor = 0;
  async function worker() {
    while (cursor < targets.length) {
      const i = cursor++;
      const acct = availAccounts[i];
      const r = await bookPair(acct, targets[i].seats, args);
      r.sessionLabel = targets[i].session.label;
      if (r.ok) markAccountLocked(acct.email, r);
      console.log(`  ${r.ok ? '✅' : '❌'} [${r.sessionLabel}] ${r.email} | ${r.seats} | ${r.paymentUrl || r.error || ''}`);
      results.push(r);
    }
  }
  await Promise.all(Array.from({ length: Math.min(args.concurrency, targets.length) }, worker));

  const record = {
    sessionId: sessions.map((s) => s.nombilkn).join(','),
    bookedAt: new Date().toISOString(),
    results,
  };
  saveResult(record);
  const mail = await notify(results, args.notifyEmail, args.bcc);
  console.log(`📧 Письмо: ${mail.ok ? 'отправлено' : 'не отправлено — ' + (mail.reason || 'нет')}`);
  return record;
}

const args = parseArgs(process.argv);
console.log(`[ton-http] boot ${new Date().toISOString()} battle=${!!args.battle}`);

if (args.battle) {
  // Боевой режим: резолвим event-hash'и из афиши, бронируем по сессиям.
  console.log('Боевой режим: «Обыкновенная смерть» (20 и 21 ноября).');
  const bookedSeats = new Set();
  const allAccounts = loadAccounts(args.accountsFile);
  await Promise.race([
    preLogin(allAccounts.filter((a) => !isAccountLocked(readAccountState(), a.email))),
    new Promise((_, reject) => setTimeout(() => reject(new Error('preLogin timeout 60s')), 60_000)),
  ]).catch((e) => console.log(`[ton-http] ${e instanceof Error ? e.message : e}`));
  let lastPreLogin = Date.now();
  while (true) {
    try {
      const t = new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour12: false });
      // Обновляем JWT раз в 15 минут, чтобы к моменту выкладки мест вход уже был готов.
      if (Date.now() - lastPreLogin > 15 * 60 * 1000) {
        await Promise.race([
    preLogin(allAccounts.filter((a) => !isAccountLocked(readAccountState(), a.email))),
    new Promise((_, reject) => setTimeout(() => reject(new Error('preLogin timeout 60s')), 60_000)),
  ]).catch((e) => console.log(`[ton-http] ${e instanceof Error ? e.message : e}`));
        lastPreLogin = Date.now();
      }
      const hashes = await resolveEventHashes();
      const ready = BATTLE_SESSIONS.filter((s) => hashes[s.nombilkn]);
      const missing = BATTLE_SESSIONS.filter((s) => !hashes[s.nombilkn]);
      if (missing.length) console.log(`[${t}] жду кнопку «Купить билет» для: ${missing.map((s) => s.label).join(', ')}`);
      if (ready.length) {
        const sessions = ready.map((s) => ({ eventHash: hashes[s.nombilkn], nombilkn: s.nombilkn, label: s.label }));
        // проверяем, есть ли новые целевые места (ещё не бронировали)
        let hasNew = false;
        for (const s of sessions) {
          const stoken = await getStoken();
          const body = await getPlaces(stoken, s.eventHash, s.nombilkn);
          const places = Array.isArray(body.EvailPlaceList) ? body.EvailPlaceList : [];
          const { pairs, singles } = buildPairs(places);
          for (const p of [...pairs, ...singles.map((x) => [x])]) {
            const code = p.map(placeCode).join('|');
            if (!bookedSeats.has(code)) hasNew = true;
          }
        }
        if (hasNew) {
          console.log(`[${t}] 🔥 продажи открыты — бронирую.`);
          const rec = await runBooking(args, sessions);
          if (rec) for (const r of rec.results) if (r.ok) { /* резерв зафиксирован */ }
          // помечаем все целевые места как обработанные, чтобы не долбить повторно
          for (const s of sessions) {
            const stoken = await getStoken();
            const body = await getPlaces(stoken, s.eventHash, s.nombilkn);
            const places = Array.isArray(body.EvailPlaceList) ? body.EvailPlaceList : [];
            const { pairs, singles } = buildPairs(places);
            for (const p of [...pairs, ...singles.map((x) => [x])]) bookedSeats.add(p.map(placeCode).join('|'));
          }
        } else {
          console.log(`[${t}] продажи открыты, но новых целевых мест нет (или уже забронировано).`);
        }
      }
    } catch (e) {
      console.log(`[${new Date().toLocaleTimeString('ru-RU', { hour12: false })}] ⚠️ ${e instanceof Error ? e.message : e}`);
    }
    await new Promise((r) => setTimeout(r, args.interval));
  }
} else if (args.once) {
  console.log('Целевое событие:', args.eventUrl, `(hash ${args.eventHash}, nombilkn ${args.nombilkn})`);
  await runBooking(args, [{ eventHash: args.eventHash, nombilkn: args.nombilkn, label: 'тест' }]);
} else {
  console.log('Целевое событие:', args.eventUrl, `(hash ${args.eventHash}, nombilkn ${args.nombilkn})`);
  while (true) {
    try {
      const t = new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour12: false });
      const stoken = await getStoken();
      const body = await getPlaces(stoken, args.eventHash, args.nombilkn);
      const places = Array.isArray(body.EvailPlaceList) ? body.EvailPlaceList : [];
      if (places.length) {
        await runBooking(args, [{ eventHash: args.eventHash, nombilkn: args.nombilkn, label: 'тест' }]);
      } else {
        console.log(`[${t}] мест нет — жду.`);
      }
    } catch (e) {
      console.log(`[${new Date().toLocaleTimeString('ru-RU', { hour12: false })}] ⚠️ ${e instanceof Error ? e.message : e}`);
    }
    await new Promise((r) => setTimeout(r, args.interval));
  }
}


