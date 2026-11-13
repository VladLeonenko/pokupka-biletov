// Браузерный монитор Театра Наций: Playwright + stealth, капча проходит сама (~2.5с).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { STEALTH } from './services/tonBrowserBooking.js';
import { getStoken, getPlaces } from './services/tonApiBooking.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const PROFILES_DIR = path.join(__dirname, 'data', 'ton-profiles');
const RESULTS_FILE = path.join(__dirname, 'data', 'ton-results.json');
const STATE_FILE = path.join(__dirname, 'data', 'ton-account-state.json');
const ACCOUNTS_FILE = path.join(__dirname, 'ton-accounts.json');

const BATTLE_SESSIONS = [
  { nombilkn: '6905', label: '20 ноября' },
  { nombilkn: '6906', label: '21 ноября' },
];
const PERFORMANCE_ID = 366;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';
const ROW_RANK = { '5': 0, '4': 1, '3': 2 };
const ROW_CENTER = 11;

function loadAccounts() {
  return JSON.parse(fs.readFileSync(path.resolve(__dirname, ACCOUNTS_FILE), 'utf-8'))
    .map((c) => ({ email: String(c.email).trim(), password: String(c.password) }));
}
function readState() { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); } catch { return {}; } }
function writeState(s) { fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true }); fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); }
function isLocked(state, email) { return state[email] && state[email].status === 'locked'; }
function profileFile(email) { return path.join(PROFILES_DIR, email.replace(/[^a-z0-9]/gi, '_') + '.json'); }

async function resolveEventHashes() {
  const url = `https://theatreofnations.ru/events_ajax/?performance=${PERFORMANCE_ID}&date_start=2026-11-01&date_end=2026-11-30`;
  const j = await (await fetch(url)).json().catch(() => ({}));
  const html = String(j.html || '');
  const out = {};
  for (const card of html.split('events_groups_row')) {
    const cn = card.match(/data-cast_n="(\d+)"/)?.[1];
    const ev = card.match(/href="\/event\/([a-z0-9]+)\/"/)?.[1];
    if (cn && ev) out[cn] = ev;
  }
  return out;
}

function pickBestPair(freeSeats) {
  const allowed = freeSeats.filter((s) => {
    const r = String(s.row);
    if (r === '5' || r === '4') return true;
    if (r === '3') return ['3', '4', '18', '19'].includes(String(s.seat));
    return false;
  });
  const byRow = {};
  for (const s of allowed) (byRow[s.row] = byRow[s.row] || []).push(s);
  const jobs = [];
  for (const row of Object.keys(byRow).sort((a, b) => (ROW_RANK[a] ?? 9) - (ROW_RANK[b] ?? 9))) {
    const list = byRow[row].sort((a, b) => Number(a.seat) - Number(b.seat));
    for (let i = 0; i < list.length; i++) {
      const next = list[i + 1];
      if (next && Number(next.seat) - Number(list[i].seat) === 1) { jobs.push({ seats: [list[i], next], row, isPair: true }); i++; }
      else jobs.push({ seats: [list[i]], row, isPair: false });
    }
  }
  const midDist = (p) => Math.abs(p.reduce((s, x) => s + Number(x.seat), 0) / p.length - ROW_CENTER);
  jobs.sort((a, b) => (a.isPair === b.isPair ? 0 : a.isPair ? -1 : 1) || (ROW_RANK[a.row] ?? 9) - (ROW_RANK[b.row] ?? 9) || midDist(a.seats) - midDist(b.seats));
  return jobs.map((j) => j.seats);
}

console.log(`[ton] boot ${new Date().toISOString()}`);
let browser = null;

async function ensureBrowser() {
  if (browser) return browser;
  console.log('[ton] chrome launch');
  browser = await Promise.race([
    chromium.launch({
      headless: true,
      timeout: 30_000,
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-dev-shm-usage'],
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('chrome launch timeout 35s')), 35_000)),
  ]);
  console.log('[ton] chrome up');
  return browser;
}

async function newCtx() {
  const b = await ensureBrowser();
  return b.newContext({ viewport: { width: 1366, height: 900 }, userAgent: UA, locale: 'ru-RU', timezoneId: 'Europe/Moscow' });
}

async function ensureLogin(ctx, email, password) {
  const page = await ctx.newPage();
  try {
    await page.goto('https://theatreofnations.ru/users/login/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    const has = await page.evaluate(() => !!localStorage.getItem('token'));
    if (has) return true;
    await page.waitForSelector('form[data-js="login-form"]', { timeout: 20000 });
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('form[data-js="login-form"] button[type="submit"]');
    await page.waitForFunction(() => !!localStorage.getItem('token'), null, { timeout: 30000 });
    return true;
  } finally { await page.close(); }
}

async function preLoginAll(accounts) {
  for (const a of accounts) {
    const f = profileFile(a.email);
    try {
      const ctx = await newCtx();
      await ctx.addInitScript(STEALTH);
      if (fs.existsSync(f)) {
        const st = JSON.parse(fs.readFileSync(f, 'utf-8'));
        await ctx.addCookies(st.cookies || []);
      }
      const ok = await ensureLogin(ctx, a.email, a.password);
      if (ok) { await ctx.storageState({ path: f }); console.log(`  🔑 ${a.email} OK`); }
      await ctx.close();
    } catch (e) {
      console.log(`  ⚠️ ${a.email}: ${(e instanceof Error ? e.message : e).slice(0, 60)}`);
    }
  }
}

async function bookAccount(ctx, a, eventUrl, pair) {
  const page = await ctx.newPage();
  try {
    await page.goto(eventUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#places .place', { timeout: 30000 });
    for (const s of pair) {
      await page.waitForSelector(`.place[row="${s.row}"][seat="${s.seat}"]`, { timeout: 15000 });
      await page.click(`.place[row="${s.row}"][seat="${s.seat}"]`);
    }
    await page.waitForTimeout(300);
    await page.waitForSelector('#buy_button', { timeout: 10000 });
    await page.click('#buy_button');
    try { await page.waitForURL(/payeko|payment|securepaymentgateway|pay_ru/, { timeout: 30000 }); } catch {}
    const url = page.url();
    return { ok: true, seats: pair.map((s) => `Партер, ряд ${s.row}, место ${s.seat}`).join(' + '), paymentUrl: /payeko|payment|securepaymentgateway|pay_ru/.test(url) ? url : null };
  } catch (e) {
    return { ok: false, error: (e instanceof Error ? e.message : String(e)).slice(0, 140) };
  } finally { await page.close(); }
}

async function main() {
  const accounts = loadAccounts();
  const state = readState();
  const avail = accounts.filter((a) => !isLocked(state, a.email));
  console.log(`Аккаунтов: ${accounts.length} (доступно ${avail.length}). Предлогин...`);
  fs.mkdirSync(PROFILES_DIR, { recursive: true });
  await preLoginAll(avail);

  const bookedSeats = new Set();
  console.log('Мониторинг старт.');
  while (true) {
    try {
      const t = new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour12: false });
      const hashes = await resolveEventHashes();
      const ready = BATTLE_SESSIONS.filter((s) => hashes[s.nombilkn]);
      const missing = BATTLE_SESSIONS.filter((s) => !hashes[s.nombilkn]);
      if (missing.length) console.log(`[${t}] жду кнопку: ${missing.map((s) => s.label).join(', ')}`);

      for (const s of ready) {
        const stoken = await getStoken();
        const body = await getPlaces(stoken, hashes[s.nombilkn], s.nombilkn);
        const places = Array.isArray(body.EvailPlaceList) ? body.EvailPlaceList : [];
        const freeSeats = places.map((p) => ({ row: p.row ?? p.Row, seat: p.seat ?? p.Seat }));
        const jobs = pickBestPair(freeSeats).filter((pr) => !bookedSeats.has(pr.map((x) => `${s.nombilkn}-${x.row}-${x.seat}`).join('|')));
        if (!jobs.length) continue;
        const pair = jobs[0];
        const key = pair.map((x) => `${s.nombilkn}-${x.row}-${x.seat}`).join('|');
        const cur = readState();
        const acct = accounts.find((a) => !isLocked(cur, a.email));
        if (!acct) { console.log(`[${t}] места есть, но все аккаунты заперты.`); continue; }
        console.log(`[${t}] 🔥 ${s.label}: ${pair.map((x) => `ряд${x.row} м${x.seat}`).join('+')} — бронирую на ${acct.email}.`);
        const f = profileFile(acct.email);
        const ctx = await newCtx();
        await ctx.addInitScript(STEALTH);
        if (fs.existsSync(f)) { const st = JSON.parse(fs.readFileSync(f, 'utf-8')); await ctx.addCookies(st.cookies || []); }
        await ensureLogin(ctx, acct.email, acct.password);
        const r = await bookAccount(ctx, acct, `https://theatreofnations.ru/event/${hashes[s.nombilkn]}/`, pair);
        if (r.ok) {
          console.log(`  ✅ ${acct.email} | ${r.seats} | ${r.paymentUrl || 'без ссылки'}`);
          const st = readState();
          st[acct.email] = { status: 'locked', seats: r.seats, paymentUrl: r.paymentUrl || '', sessionLabel: s.label, lockedAt: new Date().toISOString() };
          writeState(st);
          bookedSeats.add(key);
          const rec = { sessionId: s.nombilkn, bookedAt: new Date().toISOString(), results: [{ email: acct.email, seats: r.seats, ok: true, paymentUrl: r.paymentUrl, sessionLabel: s.label }] };
          let list = []; try { list = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8')); } catch {}
          list.push(rec); fs.writeFileSync(RESULTS_FILE, JSON.stringify(list, null, 2));
        } else {
          console.log(`  ❌ ${acct.email} | ${r.error}`);
        }
        await ctx.close();
      }
    } catch (e) {
      console.log(`[${new Date().toLocaleTimeString('ru-RU', { hour12: false })}] ⚠️ ${e instanceof Error ? e.message : e}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
