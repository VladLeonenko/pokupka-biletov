/**
 * Kassir.ru API — монитор/бронь.
 *
 * Флоу: order-kit → scheme(seatQuota) → calculate (pricing.total!) → orders/init → async-task → payments/process.
 * Без matching pricing.total после calculate сервер отвечает 409 «Стоимость изменена».
 *
 * Голый Node fetch → 403 (TLS fingerprint). Все запросы — через Playwright Chromium.
 */
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API = 'https://api.kassir.ru/api';
const DOMAIN = 'msk.kassir.ru';
const UUID_SECRET = process.env.KASSIR_UUID_SECRET || 'Lo3cKZlYj7Ee6JCDS3zP64ZA2d7wb';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';
const PROFILE_DIR =
  process.env.KASSIR_PROFILE_DIR ||
  path.join(
    process.env.HOME || '/tmp',
    'Library',
    'Application Support',
    'biletvsem',
    'kassir-browser-profile',
  );

function q(extra = {}) {
  const p = new URLSearchParams({ domain: DOMAIN, platformState: 'website', ...extra });
  return `?${p}`;
}

/** @type {{ ctx: import('playwright').BrowserContext, browser: import('playwright').Browser, page: import('playwright').Page | null } | null} */
let session = null;
let sessionWarmAt = 0;
let sessionChain = Promise.resolve();
let transportFails = 0;
let lastRecycleAt = 0;
let chromePid = 0;
const SESSION_TTL_MS = Number(process.env.KASSIR_SESSION_TTL_MS || 6 * 60 * 60 * 1000);
const RECYCLE_COOLDOWN_MS = 10 * 60 * 1000;

function contextAlive(ctx) {
  try {
    ctx.pages();
    return true;
  } catch {
    return false;
  }
}

function withSessionLock(fn) {
  const run = sessionChain.then(fn, fn);
  sessionChain = run.then(() => {}, () => {});
  return run;
}

function profileChromePids() {
  let out = '';
  try {
    out = execFileSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  } catch {
    return [];
  }
  const pids = [];
  for (const line of out.split('\n')) {
    if (!line.includes('chrome-headless-shell') || !line.includes(PROFILE_DIR)) continue;
    const pid = Number(line.trim().split(/\s+/)[0]);
    if (pid > 0) pids.push(pid);
  }
  return pids;
}

function killProfileChromes() {
  const pids = profileChromePids();
  for (const pid of pids) {
    try { process.kill(pid, 'SIGKILL'); } catch { /* already dead */ }
  }
  return pids.length;
}

function browserPid(browser) {
  try {
    const p = browser && browser.process;
    const child = typeof p === 'function' ? p.call(browser) : p;
    return child?.pid || 0;
  } catch {
    return 0;
  }
}

function killPidTree(pid) {
  if (!pid) return;
  try { execFileSync('pkill', ['-TERM', '-P', String(pid)]); } catch { /* no children */ }
  try { process.kill(pid, 'SIGKILL'); } catch { /* already dead */ }
}

async function destroySession() {
  const browser = session?.browser;
  const pid = chromePid || browserPid(browser);
  session = null;
  sessionWarmAt = 0;
  chromePid = 0;
  if (browser) {
    await Promise.race([
      browser.close().catch(() => {}),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
  }
  killPidTree(pid);
  const killed = killProfileChromes();
  if (killed) console.error(`[kassir] killed ${killed} leftover chrome`);
  await new Promise((r) => setTimeout(r, 250));
}

async function ensureSession() {
  return withSessionLock(async () => {
    if (session?.ctx && contextAlive(session.ctx) && Date.now() - sessionWarmAt < SESSION_TTL_MS) {
      return session;
    }
    await destroySession();
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--renderer-process-limit=1',
        '--disable-background-networking',
        '--mute-audio',
        '--no-first-run',
      ],
    });
    chromePid = browserPid(browser);
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: UA,
      locale: 'ru-RU',
      timezoneId: 'Europe/Moscow',
    });
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    const page = await ctx.newPage();
    try {
      await page.goto(`https://${DOMAIN}/`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(400);
    } catch (err) {
      console.error(`[kassir] warm: ${err instanceof Error ? err.message : err}`);
    }
    session = { ctx, browser, page };
    sessionWarmAt = Date.now();
    console.error(`[kassir] one browser pid=${chromePid} pages=${ctx.pages().length}`);
    return session;
  });
}

export async function closeKassirBrowser() {
  return withSessionLock(async () => {
    lastRecycleAt = Date.now();
    await destroySession();
  });
}

async function noteTransportFailure() {
  transportFails += 1;
  if (transportFails < 8) return;
  if (Date.now() - lastRecycleAt < RECYCLE_COOLDOWN_MS) return;
  transportFails = 0;
  await closeKassirBrowser();
}

async function api(method, urlPath, { body, query } = {}) {
  const { ctx } = await ensureSession();
  const url = `${API}${urlPath}${query || q()}`;
  let res;
  try {
    res = await ctx.request.fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      data: body != null ? body : undefined,
      timeout: 20_000,
    });
  } catch (err) {
    await noteTransportFailure();
    throw err;
  }
  transportFails = 0;
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 800) };
  }
  const ok = res.ok() || res.status() === 202;
  if (!ok) {
    const err = new Error(`Kassir ${method} ${urlPath}: HTTP ${res.status()}`);
    err.status = res.status();
    err.data = data;
    throw err;
  }
  return data;
}

/** AES-CBC encrypted device UUID (как в фронте Kassir). */
export function encryptKassirUuid(plain = crypto.randomUUID()) {
  const key = crypto.createHash('sha256').update(UUID_SECRET).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, enc]).toString('base64');
}

export async function fetchEventPageKit(eventId) {
  return api('GET', `/event-page-kit/${eventId}`);
}

export async function fetchOrderKit(eventId) {
  return api('POST', `/events/${eventId}/order-kit`, { body: {} });
}

export async function fetchScheme(eventId) {
  return api('POST', `/order-kit/${eventId}/scheme`, { body: {} });
}

/** Свободные места: seatQuota[seatId]=tariffGroupId, без occupied. */
export function extractFreeSeats(orderKit, scheme) {
  const data = scheme?.data || {};
  const seatQuota = data.seatQuota || {};
  const tg2 = new Map();
  for (const g of orderKit?.tariffGroups || []) {
    const t = (g.tariffs || []).find((x) => x.isDefault) || (g.tariffs || [])[0];
    if (t) tg2.set(Number(g.id), t);
  }
  const out = [];
  for (const ent of data.entities || []) {
    if (!ent?.id) continue;
    for (const row of ent.rows || []) {
      for (const s of row.seats || []) {
        if (!s?.id || s.type === 'noseat' || s.occupied === true) continue;
        const tg = seatQuota[s.id] ?? seatQuota[String(s.id)];
        if (tg == null || tg === 0) continue;
        const tariff = tg2.get(Number(tg));
        if (!tariff?.price) continue;
        out.push({
          seatId: Number(s.id),
          sectorId: Number(ent.id),
          sectorName: ent.name || null,
          tariffGroupId: Number(tg),
          tariffId: Number(tariff.id),
          price: Number(tariff.price),
          serviceFee: Number(tariff.serviceFee || 0),
          row: row.name ?? row.rowName ?? null,
          seat: s.name ?? s.number ?? null,
        });
      }
    }
  }
  out.sort((a, b) => a.price - b.price || a.sectorId - b.sectorId || String(a.row).localeCompare(String(b.row)) || Number(a.seat) - Number(b.seat));
  return out;
}

/** Соседние места (ряд+seat±1) одной цены; иначе первые N. */
export function pickAdjacent(seats, need = 2) {
  if (!seats.length || need <= 0) return [];
  if (need === 1) return [seats[0]];
  const byRow = new Map();
  for (const s of seats) {
    const k = `${s.sectorId}|${s.row}`;
    if (!byRow.has(k)) byRow.set(k, []);
    byRow.get(k).push(s);
  }
  for (const list of byRow.values()) {
    list.sort((a, b) => Number(a.seat) - Number(b.seat));
    for (let i = 0; i <= list.length - need; i++) {
      const slice = list.slice(i, i + need);
      let ok = true;
      for (let j = 1; j < slice.length; j++) {
        if (Number(slice[j].seat) !== Number(slice[j - 1].seat) + 1) { ok = false; break; }
        if (slice[j].price !== slice[j - 1].price) { ok = false; break; }
      }
      if (ok) return slice;
    }
  }
  return seats.slice(0, need);
}

export function availableSeatCount(orderKit) {
  const quotas = orderKit?.quotas || [];
  if (!quotas.length) return 0;
  return quotas.reduce((n, q) => n + Number(q.ticketsCount || 0), 0);
}

async function pollTask(taskId, { tries = 60, delayMs = 350 } = {}) {
  for (let i = 0; i < tries; i++) {
    const j = await api('GET', `/async-task/status/${taskId}`);
    const task = j?.task || j;
    if (task?.status === 'completed') {
      const raw = task.response;
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    }
    if (task?.status === 'failed' || task?.status === 'sent_to_handler_error') {
      throw new Error(task.error || 'async-task failed');
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error('async-task timeout');
}

function loadBuyer(opts = {}) {
  if (opts.buyer) return opts.buyer;
  const contactsPath = opts.contactsFile
    || process.env.KASSIR_CONTACTS_FILE
    || path.join(__dirname, '..', 'sniper-contacts.json');
  const passportsPath = opts.passportsFile
    || process.env.KASSIR_PASSPORTS_FILE
    || path.join(__dirname, '..', 'data', 'radario-passports.json');
  let contact = null;
  let passport = null;
  try {
    const list = JSON.parse(fs.readFileSync(contactsPath, 'utf8'));
    contact = Array.isArray(list) ? list[0] : null;
  } catch { /* optional */ }
  try {
    const list = JSON.parse(fs.readFileSync(passportsPath, 'utf8'));
    passport = Array.isArray(list) ? list[0] : null;
  } catch { /* optional */ }

  const fullName = passport?.fullName || contact?.name || 'Тестов Иван Иванович';
  const parts = String(fullName).trim().split(/\s+/);
  const lastName = parts[0] || 'Тестов';
  const firstName = parts[1] || 'Иван';
  const middleName = parts[2] || 'Иванович';
  let phone = String(passport?.phone || contact?.phone || '79001234567').replace(/\D/g, '');
  if (phone.length === 11 && phone.startsWith('8')) phone = `7${phone.slice(1)}`;
  if (!phone.startsWith('+')) phone = `+${phone}`;
  const email = passport?.email || contact?.email || 'info@prime-coder.ru';
  const doc = passport ? {
    id: 1,
    series: String(passport.documentSeries || '').replace(/\s+/g, ''),
    number: String(passport.documentNumber || '').replace(/\s+/g, ''),
    firstName,
    lastName,
    middleName,
  } : null;
  return { fullName, firstName, lastName, middleName, phone, email, doc };
}

/**
 * @param {number} eventId
 * @param {{ maxTickets?: number, preferSeatIds?: number[], dryRun?: boolean, buyer?: object }} [opts]
 */
export async function bookKassirEvent(eventId, opts = {}) {
  const maxTickets = Math.min(Number(opts.maxTickets || 2), 8);
  const buyer = loadBuyer(opts);
  const needDocs = opts.needPersonalData !== false;

  const orderKit = await fetchOrderKit(eventId);
  const avail = availableSeatCount(orderKit);
  if (avail <= 0 && !opts.force) {
    return { ok: false, reason: 'no_tickets', available: 0 };
  }
  const scheme = await fetchScheme(eventId);
  let free = extractFreeSeats(orderKit, scheme);
  if (opts.preferSeatIds?.length) {
    const prefer = new Set(opts.preferSeatIds.map(Number));
    const pref = free.filter((s) => prefer.has(s.seatId));
    if (pref.length) free = [...pref, ...free.filter((s) => !prefer.has(s.seatId))];
  }
  if (!free.length) {
    return { ok: false, reason: 'no_free_seats', available: avail, quotas: orderKit.quotas?.length || 0 };
  }
  const need = Math.min(maxTickets, free.length);
  const chosen = pickAdjacent(free, need);
  if (opts.dryRun) {
    return { ok: true, dryRun: true, chosen, available: avail };
  }

  const delivery = (orderKit.settings?.deliveryTypes || [])[0];
  const deliveryTypeId = delivery?.id || 4;
  const paymentMethodId = (delivery?.paymentMethodIds || []).includes(1320)
    ? 1320
    : (delivery?.paymentMethodIds || [1073])[0];

  const baseKey = Date.now();
  const tickets = chosen.map((s, i) => {
    const t = {
      tariffId: s.tariffId,
      placement: { sectorId: s.sectorId, seatId: s.seatId, key: baseKey + i },
      fanCode: null,
      price: s.price,
    };
    if (needDocs && buyer.doc) t.personalDocument = { ...buyer.doc };
    return t;
  });

  const encryptedUuid = encryptKassirUuid();
  const body = {
    eventId: Number(eventId),
    tickets,
    deliveryTypeId,
    paymentMethodId,
    isInsured: false,
    customer: {
      firstName: buyer.firstName,
      lastName: buyer.lastName,
      email: buyer.email,
      phoneNumber: buyer.phone,
      fullName: buyer.fullName,
      subscribeToNews: false,
      additionalFields: [{
        label: 'Отчество',
        name: 'middle_name',
        value: buyer.middleName,
        type: 'text',
        isRequired: true,
        isShow: true,
      }],
      isPersonalDataAgreement: true,
      hasNoMiddleName: false,
      encryptedUuid,
    },
    promotionApplication: null,
    certificateNumbers: [],
    certificates: [],
    supplementaryServices: [],
    subscribeToNews: false,
    pricing: { total: 10 },
    analytics: {},
    additionalAgreements: [],
  };

  const calc = await api('POST', '/orders/calculate', {
    body,
    query: q({ isSaleStepCheckDisabled: 'true' }),
  });
  const total = calc?.pricing?.total;
  if (total == null) {
    return { ok: false, reason: 'calculate_failed', data: calc };
  }
  body.pricing = { total };
  for (let i = 0; i < (calc.tickets || []).length; i++) {
    const ct = calc.tickets[i];
    if (!body.tickets[i]) continue;
    body.tickets[i].price = ct.pricing?.priceInitial ?? ct.pricing?.price ?? body.tickets[i].price;
    if (ct.placement) body.tickets[i].placement = ct.placement;
  }

  const init = await api('POST', '/orders/init', { body });
  let parsed;
  if (init?.type === 'async-task') {
    parsed = await pollTask(init.task.id);
  } else {
    parsed = init;
  }

  // 409 = цена сменилась — один ретрай с total из ответа
  if (parsed?.code === 409 && parsed?.response?.pricing?.total != null) {
    body.pricing = { total: parsed.response.pricing.total };
    const init2 = await api('POST', '/orders/init', { body });
    parsed = init2?.type === 'async-task' ? await pollTask(init2.task.id) : init2;
  }

  if (parsed?.code === 410) {
    return {
      ok: false,
      reason: 'invalid_placements',
      tried: chosen,
      data: parsed,
    };
  }
  if (parsed?.code !== 200) {
    return {
      ok: false,
      reason: 'order_rejected',
      code: parsed?.code,
      data: parsed,
      tried: chosen,
    };
  }

  const order = typeof parsed.response === 'string' ? JSON.parse(parsed.response) : parsed.response;
  const orderId = order?.orderId;
  const accessCode = order?.accessCode;
  let paymentUrl = null;
  let payment = null;
  if (orderId && accessCode != null) {
    payment = await api('GET', '/payments/process', {
      query: q({ orderId: String(orderId), accessCode: String(accessCode) }),
    });
    paymentUrl = payment?.paymentUrl || payment?.redirectUrl || null;
  }

  return {
    ok: true,
    orderId,
    accessCode,
    paymentUrl,
    payment,
    amount: order?.pricing?.total ?? total,
    seats: chosen,
    buyer: buyer.fullName,
    email: buyer.email,
    raw: order,
  };
}
