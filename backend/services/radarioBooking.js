/**
 * Radario (виджет teatrpushkin) — автобронь с паспортными данными (ОКО).
 *
 * Флоу: GET /buy-tickets/:id → occupy-seat(s) → POST /json/widget/ticketOrder (alfasbp).
 * reserveDurationMinutes в buy — окно ОПЛАТЫ заказа, НЕ TTL soft-occupy корзины.
 *
 * Гонка: keep-alive + пул сессий + parallel occupy на EDGE/probe.
 * ticketCount врёт (включает чужой soft-lock) — успех только после occupy+order.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://radario.ru';
const REFERER = 'https://teatrpushkin.ru/';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';

const DEFAULT_PASSPORTS = path.join(__dirname, '..', 'data', 'radario-passports.json');

// keep-alive (опционально): на VPS undici может быть не установлен — fetch Node и так ок.
try {
  const require = createRequire(import.meta.url);
  const { Agent, setGlobalDispatcher } = require('undici');
  setGlobalDispatcher(new Agent({
    connect: { timeout: 8_000 },
    keepAliveTimeout: 60_000,
    keepAliveMaxTimeout: 120_000,
    connections: 32,
    pipelining: 1,
  }));
} catch { /* native fetch */ }

function headers(extra = {}) {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Referer: REFERER,
    Origin: 'https://radario.ru',
    'User-Agent': UA,
    ...extra,
  };
}

function digits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function loadPassports(filePath = process.env.RADARIO_PASSPORTS_FILE || DEFAULT_PASSPORTS) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const list = JSON.parse(raw);
  if (!Array.isArray(list) || !list.length) throw new Error('radario passports: empty');
  return list.map((p) => ({
    fullName: String(p.fullName || '').trim(),
    documentType: p.documentType || 'PassportRf',
    documentSeries: String(p.documentSeries || '').replace(/\s+/g, ''),
    documentNumber: String(p.documentNumber || '').replace(/\s+/g, ''),
    email: String(p.email || '').trim(),
    phone: digits(p.phone),
  })).filter((p) => p.fullName && p.documentNumber && p.email && p.phone);
}

async function api(method, urlPath, { body, sessionId } = {}) {
  const url = urlPath.startsWith('http') ? urlPath : `${BASE}${urlPath}`;
  const res = await fetch(url, {
    method,
    headers: headers(sessionId ? { Cookie: `sessionId=${sessionId}` } : {}),
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = data?.message || data?.internalMessage || text.slice(0, 200) || `HTTP ${res.status}`;
    const err = new Error(`Radario ${method} ${urlPath}: ${msg}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** Плоский список свободных мест из buy-tickets payload. */
export function extractFreeSeats(buy) {
  const event = buy?.event || {};
  const occupied = new Set(
    (event.occupiedSeats || buy.occupiedSeats || []).map((x) => Number(x?.number ?? x?.id ?? x)),
  );
  const out = [];
  const ticketTypes = [];
  for (const tariff of event.tariffs || []) {
    for (const tt of tariff.ticketTypes || []) ticketTypes.push(tt);
  }
  for (const tt of event.ticketTypes || []) ticketTypes.push(tt);

  for (const tt of ticketTypes) {
    const ttId = Number(tt.id);
    const price = Number(tt.price ?? tt.minPrice ?? 0);
    const seats = tt.seats || [];
    for (const s of seats) {
      const seatNumber = Number(s?.number ?? s?.id ?? s);
      if (!Number.isFinite(seatNumber) || occupied.has(seatNumber)) continue;
      if (s && s.occupied === true) continue;
      out.push({
        seatNumber,
        ticketTypeId: ttId,
        price,
        title: tt.title || tt.name || '',
        zoneId: tt.zoneId ?? s?.zoneId ?? null,
        row: s?.rowName || s?.row || null,
        seatName: s?.colName || s?.name || s?.seatName || null,
        occupied: !!s?.occupied,
      });
    }
  }

  out.sort((a, b) => a.price - b.price || a.seatNumber - b.seatNumber);
  const seen = new Set();
  return out.filter((s) => (seen.has(s.seatNumber) ? false : (seen.add(s.seatNumber), true)));
}

function pickAdjacent(seats, need, preferSeatNumbers = []) {
  if (need <= 0 || !seats.length) return [];
  const byNum = new Map(seats.map((s) => [s.seatNumber, s]));
  if (preferSeatNumbers?.length) {
    const preferred = preferSeatNumbers
      .map((n) => byNum.get(Number(n)))
      .filter(Boolean);
    if (preferred.length >= need) return preferred.slice(0, need);
    if (preferred.length) {
      const used = new Set(preferred.map((s) => s.seatNumber));
      const rest = pickAdjacent(seats.filter((s) => !used.has(s.seatNumber)), need - preferred.length);
      return [...preferred, ...rest].slice(0, need);
    }
  }
  if (need === 1) return [seats[0]];
  const byType = new Map();
  for (const s of seats) {
    const k = s.ticketTypeId;
    if (!byType.has(k)) byType.set(k, []);
    byType.get(k).push(s);
  }
  for (const list of byType.values()) {
    list.sort((a, b) => a.seatNumber - b.seatNumber);
    for (let i = 0; i <= list.length - need; i++) {
      const slice = list.slice(i, i + need);
      let ok = true;
      for (let j = 1; j < slice.length; j++) {
        if (slice[j].seatNumber !== slice[j - 1].seatNumber + 1) { ok = false; break; }
      }
      if (ok) return slice;
    }
  }
  return seats.slice(0, need);
}

function buildTicketsPayload(chosen, passports) {
  const groups = new Map();
  chosen.forEach((seat, idx) => {
    const p = passports[idx];
    const ownerInfo = {
      fullName: p.fullName,
      documentType: p.documentType,
      documentSeries: p.documentSeries,
      documentNumber: p.documentNumber,
      email: p.email,
      phone: p.phone,
    };
    const key = seat.ticketTypeId;
    if (!groups.has(key)) {
      groups.set(key, { id: seat.ticketTypeId, count: 0, price: seat.price, ticketInfo: [] });
    }
    const g = groups.get(key);
    g.count += 1;
    g.ticketInfo.push({
      place: seat.seatNumber,
      name: p.fullName,
      discountPresetValue: null,
      ownerInfo,
    });
  });
  return [...groups.values()];
}

/** Кэш: eventId → { sessionId, buy, free, at } */
const warmCache = new Map();
/** Пул сессий: eventId → [{ sessionId, buy, at }] */
const sessionPools = new Map();
const WARM_TTL_MS = Number(process.env.RADARIO_WARM_TTL_MS || 90_000);
const POOL_SIZE = Math.max(1, Math.min(Number(process.env.RADARIO_POOL_SIZE || 4), 8));

function poolGet(eventId) {
  const list = sessionPools.get(Number(eventId)) || [];
  const fresh = list.filter((x) => x?.sessionId && Date.now() - x.at < WARM_TTL_MS);
  if (fresh.length !== list.length) sessionPools.set(Number(eventId), fresh);
  return fresh;
}

function poolPut(eventId, entries) {
  const id = Number(eventId);
  const now = Date.now();
  const merged = [...(sessionPools.get(id) || [])];
  for (const e of entries) {
    if (!e?.sessionId) continue;
    const idx = merged.findIndex((x) => x.sessionId === e.sessionId);
    const row = { sessionId: e.sessionId, buy: e.buy || null, at: now };
    if (idx >= 0) merged[idx] = row;
    else merged.push(row);
  }
  sessionPools.set(id, merged.slice(-POOL_SIZE));
}

/** Прогрев одной сессии + запись в warm/pool. */
export async function warmBuySession(eventId) {
  const buy = await api('GET', `/buy-tickets/${eventId}?distributionType=Widget&skipEventsInGroup=true`);
  const sessionId = buy.sessionId;
  if (!sessionId) throw new Error('warm: no sessionId');
  const free = extractFreeSeats(buy).filter((s) => s.occupied !== true);
  const entry = { sessionId, buy, free, at: Date.now() };
  warmCache.set(Number(eventId), entry);
  poolPut(eventId, [entry]);
  return entry;
}

/** Держать пул из N живых buy-session (без мест тоже ок — sessionId для мгновенного occupy). */
export async function primeSessionPool(eventId, size = POOL_SIZE) {
  const n = Math.max(1, Math.min(Number(size) || POOL_SIZE, 8));
  const buys = await Promise.all(
    Array.from({ length: n }, () =>
      api('GET', `/buy-tickets/${eventId}?distributionType=Widget&skipEventsInGroup=true`).catch(() => null),
    ),
  );
  const alive = buys.filter((b) => b?.sessionId).map((buy) => ({
    sessionId: buy.sessionId,
    buy,
    free: extractFreeSeats(buy).filter((s) => s.occupied !== true),
    at: Date.now(),
  }));
  if (alive.length) {
    sessionPools.set(Number(eventId), alive.slice(0, n));
    warmCache.set(Number(eventId), alive[0]);
  }
  return alive;
}

export function getWarmBuySession(eventId) {
  const w = warmCache.get(Number(eventId));
  if (!w) return null;
  if (Date.now() - w.at > WARM_TTL_MS) return null;
  return w;
}

/**
 * Bulk occupy. Singular /occupy-seat с ticketTypeId — параллельно, нужен для привязки тарифа.
 * occupied:true в ответе bulk = места уже чужие (весь набор fail).
 */
async function occupySeatsReliable(sessionId, { eventId, seats, distributionType = 'Widget' }) {
  const seatNumbers = seats.map((s) => s.seatNumber);
  const bulk = await api('POST', '/json/buy-tickets/occupy-seats', {
    sessionId,
    body: {
      buySessionId: sessionId,
      eventId: Number(eventId),
      occupy: true,
      seatNumbers,
      distributionType,
    },
  });
  const failed = new Set((bulk?.failedToOccupySeatNumbers || []).map(Number));
  if (bulk?.occupied === true) {
    return { locked: [], failed: seatNumbers, raw: bulk };
  }
  const locked = seats.filter((s) => !failed.has(Number(s.seatNumber)));
  if (locked.length) {
    await Promise.all(locked.map((seat) => api('POST', '/json/buy-tickets/occupy-seat', {
      sessionId,
      body: {
        buySessionId: sessionId,
        eventId: Number(eventId),
        occupy: true,
        seatNumber: seat.seatNumber,
        ticketTypeId: seat.ticketTypeId,
        distributionType,
      },
    }).catch(() => null)));
  }
  return { locked, failed: [...failed], raw: bulk };
}

/**
 * Параллельный occupy одних и тех же мест с нескольких сессий.
 * Победитель = первая сессия с locked.length > 0.
 */
async function raceOccupy(eventId, chosen, {
  raceSessions = 1,
  distributionType = 'Widget',
  seedBuy = null,
} = {}) {
  const raceN = Math.max(1, Math.min(Number(raceSessions) || 1, 8));
  const pooled = poolGet(eventId);

  if (raceN <= 1) {
    let sessionId = seedBuy?.sessionId || pooled[0]?.sessionId || getWarmBuySession(eventId)?.sessionId;
    let buy = seedBuy || pooled[0]?.buy || getWarmBuySession(eventId)?.buy;
    if (!sessionId) {
      buy = await api('GET', `/buy-tickets/${eventId}?distributionType=Widget&skipEventsInGroup=true`);
      sessionId = buy.sessionId;
    }
    const r = await occupySeatsReliable(sessionId, { eventId, seats: chosen, distributionType });
    return { ...r, buy, sessionId };
  }

  // Добиваем пул свежими GET до raceN, потом ВСЕ долбят occupy параллельно.
  const have = [...pooled];
  const needFresh = Math.max(0, raceN - have.length);
  const freshBuys = needFresh
    ? await Promise.all(
      Array.from({ length: needFresh }, () =>
        api('GET', `/buy-tickets/${eventId}?distributionType=Widget&skipEventsInGroup=true`).catch(() => null),
      ),
    )
    : [];
  const sessions = [
    ...have.map((p) => ({ sessionId: p.sessionId, buy: p.buy })),
    ...freshBuys.filter((b) => b?.sessionId).map((buy) => ({ sessionId: buy.sessionId, buy })),
  ];
  if (seedBuy?.sessionId && !sessions.some((s) => s.sessionId === seedBuy.sessionId)) {
    sessions.unshift({ sessionId: seedBuy.sessionId, buy: seedBuy });
  }
  if (!sessions.length && seedBuy?.sessionId) sessions.push({ sessionId: seedBuy.sessionId, buy: seedBuy });
  if (!sessions.length) {
    const buy = await api('GET', `/buy-tickets/${eventId}?distributionType=Widget&skipEventsInGroup=true`);
    sessions.push({ sessionId: buy.sessionId, buy });
  }

  poolPut(eventId, sessions);

  const raced = await Promise.all(
    sessions.slice(0, raceN).map(async (s) => {
      const r = await occupySeatsReliable(s.sessionId, {
        eventId,
        seats: chosen,
        distributionType: s.buy?.distributionType || distributionType,
      });
      return { ...s, ...r };
    }),
  );

  const win = raced.find((r) => r.locked?.length);
  if (win) {
    return {
      locked: win.locked,
      failed: win.failed || [],
      buy: win.buy,
      sessionId: win.sessionId,
      raw: win.raw,
    };
  }
  return {
    locked: [],
    failed: [...new Set(raced.flatMap((r) => r.failed || chosen.map((s) => s.seatNumber)))],
    buy: sessions[0]?.buy || seedBuy,
    sessionId: sessions[0]?.sessionId || null,
  };
}

/**
 * @param {number} eventId
 * @param {{ maxTickets?: number, passportsFile?: string, dryRun?: boolean, preferSeatNumbers?: number[], force?: boolean, raceSessions?: number, useWarm?: boolean, forceFresh?: boolean, skipPreview?: boolean }} [opts]
 */
export async function bookRadarioEvent(eventId, opts = {}) {
  const passports = loadPassports(opts.passportsFile);
  const maxTickets = Math.min(
    Number(opts.maxTickets || passports.length),
    passports.length,
    10,
  );
  const skipPreview = opts.skipPreview !== false;
  const raceN = Math.max(1, Math.min(Number(opts.raceSessions) || 1, 8));
  const isRace = raceN > 1;

  let buy;
  let sessionId;
  let free = [];

  if (isRace) {
    // EDGE/probe: сразу N параллельных GET — без sequential warm/forceFresh перед ними.
    const buys = await Promise.all(
      Array.from({ length: raceN }, () =>
        api('GET', `/buy-tickets/${eventId}?distributionType=Widget&skipEventsInGroup=true`).catch(() => null),
      ),
    );
    const alive = buys.filter((b) => b?.sessionId);
    if (!alive.length) {
      return { ok: false, reason: 'no_session', ticketCount: 0 };
    }
    poolPut(eventId, alive.map((b) => ({ sessionId: b.sessionId, buy: b })));
    // Берём buy с максимальным числом free (на EDGE места только что вспыхнули).
    alive.sort((a, b) => extractFreeSeats(b).length - extractFreeSeats(a).length);
    buy = alive[0];
    sessionId = buy.sessionId;
    free = extractFreeSeats(buy).filter((s) => s.occupied !== true);
    warmCache.set(Number(eventId), { sessionId, buy, free, at: Date.now() });
  } else {
    const warm = opts.useWarm !== false ? getWarmBuySession(eventId) : null;
    if (warm?.sessionId && !opts.forceFresh) {
      buy = warm.buy;
      sessionId = warm.sessionId;
      free = extractFreeSeats(buy).filter((s) => s.occupied !== true);
    }
    if (!sessionId || !free.length || opts.forceFresh) {
      buy = await api('GET', `/buy-tickets/${eventId}?distributionType=Widget&skipEventsInGroup=true`);
      sessionId = buy.sessionId;
      free = extractFreeSeats(buy).filter((s) => s.occupied !== true);
      if (sessionId) {
        warmCache.set(Number(eventId), { sessionId, buy, free, at: Date.now() });
        poolPut(eventId, [{ sessionId, buy }]);
      }
    }
  }

  if (!sessionId) throw new Error('no sessionId from buy-tickets');

  const event = buy.event || {};
  const distributionType = buy.distributionType || 'Widget';
  if (event.salesStopped) throw new Error('salesStopped');

  if (Number(event.ticketCount || buy.event?.ticketCount || 0) <= 0 && !opts.force && !free.length) {
    return { ok: false, reason: 'no_tickets', ticketCount: 0, sessionId };
  }
  if (!free.length) {
    return {
      ok: false,
      reason: 'no_free_seats_in_payload',
      ticketCount: buy.event?.ticketCount ?? event.ticketCount,
      sessionId,
      buyingUrl: buy.ticketBuyingUrl,
      reserveDurationMinutes: buy.reserveDurationMinutes ?? null,
    };
  }

  const prefer = (opts.preferSeatNumbers || []).map(Number).filter(Number.isFinite);
  const need = Math.min(maxTickets, Math.max(1, free.length));
  const chosen = pickAdjacent(free, need, prefer);
  if (opts.dryRun) {
    return { ok: true, dryRun: true, chosen, sessionId, passports: passports.slice(0, chosen.length).map((p) => p.fullName) };
  }

  const occ = await raceOccupy(eventId, chosen, {
    raceSessions: raceN,
    distributionType,
    seedBuy: buy,
  });
  const locked = occ.locked || [];
  const failed = occ.failed || [];
  if (occ.buy?.sessionId) {
    buy = occ.buy;
    sessionId = occ.sessionId;
  }

  if (!locked.length) {
    warmCache.delete(Number(eventId));
    return {
      ok: false,
      reason: 'soft_lock',
      sessionId,
      tried: chosen,
      failed,
      ticketCount: buy.event?.ticketCount ?? event.ticketCount,
      reserveDurationMinutes: buy.reserveDurationMinutes ?? null,
    };
  }

  warmCache.set(Number(eventId), {
    sessionId,
    buy,
    free: extractFreeSeats(buy).filter((s) => s.occupied !== true),
    at: Date.now(),
  });

  const people = passports.slice(0, locked.length);
  const buyer = people[0];
  const tickets = buildTicketsPayload(locked, people);
  const paymentType = (() => {
    const allowed = buy.allowedPaymentTypes || {};
    const def = Object.entries(allowed).find(([, v]) => v && v.default);
    return String(def?.[0] || 'alfaSBP').toLowerCase();
  })();

  const orderBody = {
    distributionType,
    distributionSubtype: null,
    eventId: Number(eventId),
    email: buyer.email,
    phone: buyer.phone,
    promocode: null,
    paymentType,
    buySessionId: sessionId,
    tickets,
    discountType: 'None',
    userName: buyer.fullName,
    isAgreeAds: false,
    isAgreeSpecialOffer: false,
    isAgreeNotToFillInPersonalData: false,
  };

  if (!skipPreview) {
    await api('POST', '/json/ticketOrder/preview', {
      sessionId,
      body: {
        eventId: Number(eventId),
        buySessionId: sessionId,
        tickets,
        autoPromoCodeCanceled: true,
        distributionType,
        paymentType,
      },
    }).catch(() => null);
  }

  const orderUrl = buy.ticketBuyingUrl || '/json/widget/ticketOrder';
  let order;
  try {
    order = await api('POST', orderUrl, { body: orderBody, sessionId });
  } catch (err) {
    const code = err?.data?.errorCode;
    const msg = err?.message || '';
    if (code === 2003 || /уже пытается/i.test(msg)) {
      return {
        ok: false,
        reason: 'soft_lock',
        sessionId,
        tried: locked,
        failed,
        error: msg,
        ticketCount: event.ticketCount,
      };
    }
    return {
      ok: false,
      reason: 'order_rejected',
      sessionId,
      tried: locked,
      error: msg,
      data: err?.data || null,
      ticketCount: event.ticketCount,
    };
  }

  const orderId = order?.orderId ?? order?.id ?? null;
  const orderHash = order?.orderHash ?? order?.hash ?? null;
  const amount = order?.amount ?? null;
  let redirectUrl = order?.redirectUrl || order?.paymentUrl || null;
  let qrId = null;
  let qrPngBase64 = null;
  let sbp = null;

  if (orderId && paymentType === 'alfasbp') {
    sbp = await fetchAlfaSbpPayment(sessionId, orderId);
    qrId = sbp.qrId;
    qrPngBase64 = sbp.renderedQr || null;
    if (sbp.redirectUrl) redirectUrl = sbp.redirectUrl;
  }

  return {
    ok: true,
    sessionId,
    orderId,
    orderHash,
    redirectUrl,
    qrId,
    qrPngBase64,
    paymentType,
    seats: locked,
    buyers: people.map((p) => p.fullName),
    amount,
    raw: order,
    sbp,
  };
}

async function fetchAlfaSbpPayment(sessionId, orderId) {
  const qr = await api('POST', '/payments/alfasbp/qr', {
    sessionId,
    body: { orderId, qrHeight: 250, qrWidth: 250 },
  });
  const qrId = qr?.qrId ?? qr?.qrStatus?.qrId ?? null;
  let redirectUrl = qr?.redirectUrl || null;
  let status = null;
  if (qrId) {
    for (let i = 0; i < 5; i++) {
      status = await api('POST', '/payments/alfasbp/qr/status', {
        sessionId,
        body: { orderId, qrId },
      }).catch(() => null);
      redirectUrl = status?.redirectUrl || status?.qrStatus?.redirectUrl || redirectUrl;
      if (redirectUrl) break;
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  return {
    qrId,
    renderedQr: qr?.renderedQr || null,
    qrStatus: qr?.qrStatus || status?.qrStatus || null,
    redirectUrl: redirectUrl || null,
    rawQr: qr,
    rawStatus: status,
  };
}

export { loadPassports };
