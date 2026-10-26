/**
 * Radario (виджет teatrpushkin) — автобронь с паспортными данными (ОКО).
 *
 * Флоу: GET /buy-tickets/:id → occupy-seat(s) → POST /json/widget/ticketOrder (alfasbp).
 * Reservation в виджете выключен → заказ уходит в оплату; места держатся ~reserveDurationMinutes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://radario.ru';
const REFERER = 'https://teatrpushkin.ru/';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';

const DEFAULT_PASSPORTS = path.join(__dirname, '..', 'data', 'radario-passports.json');

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

  // Без явного seats[] — иногда места только в quota / count; тогда нечего занимать по схеме.
  out.sort((a, b) => a.price - b.price || a.seatNumber - b.seatNumber);
  // уникальные seatNumber (первый = дешевле)
  const seen = new Set();
  return out.filter((s) => (seen.has(s.seatNumber) ? false : (seen.add(s.seatNumber), true)));
}

function pickAdjacent(seats, need, preferSeatNumbers = []) {
  if (need <= 0 || !seats.length) return [];
  const byNum = new Map(seats.map((s) => [s.seatNumber, s]));
  // повторная бронь: те же места, если ещё свободны
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
  // пары/группы: соседние id в одном ticketType, иначе просто первые N
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

/**
 * Надёжный occupy: сначала /occupy-seats (без ticketTypeId) — там есть failedToOccupySeatNumbers.
 * Singular /occupy-seat врёт occupied:false даже при чужом soft-lock.
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
  // тариф: singular occupy-seat с ticketTypeId (как в виджете после выбора тарифа)
  for (const seat of locked) {
    await api('POST', '/json/buy-tickets/occupy-seat', {
      sessionId,
      body: {
        buySessionId: sessionId,
        eventId: Number(eventId),
        occupy: true,
        seatNumber: seat.seatNumber,
        ticketTypeId: seat.ticketTypeId,
        distributionType,
      },
    }).catch(() => null);
  }
  return { locked, failed: [...failed], raw: bulk };
}

/**
 * @param {number} eventId
 * @param {{ maxTickets?: number, passportsFile?: string, dryRun?: boolean, preferSeatNumbers?: number[], force?: boolean }} [opts]
 */
export async function bookRadarioEvent(eventId, opts = {}) {
  const passports = loadPassports(opts.passportsFile);
  const maxTickets = Math.min(
    Number(opts.maxTickets || passports.length),
    passports.length,
    10,
  );

  const buy = await api('GET', `/buy-tickets/${eventId}?distributionType=Widget&skipEventsInGroup=true`);
  const sessionId = buy.sessionId;
  if (!sessionId) throw new Error('no sessionId from buy-tickets');

  const event = buy.event || {};
  const distributionType = buy.distributionType || 'Widget';
  if (event.salesStopped) throw new Error('salesStopped');
  if (Number(event.ticketCount || 0) <= 0 && !opts.force) {
    return { ok: false, reason: 'no_tickets', ticketCount: 0, sessionId };
  }

  const free = extractFreeSeats(buy).filter((s) => s.occupied !== true);
  if (!free.length) {
    return {
      ok: false,
      reason: 'no_free_seats_in_payload',
      ticketCount: event.ticketCount,
      sessionId,
      buyingUrl: buy.ticketBuyingUrl,
      reserveDurationMinutes: buy.reserveDurationMinutes ?? null,
    };
  }

  const prefer = (opts.preferSeatNumbers || []).map(Number).filter(Number.isFinite);
  const chosen = pickAdjacent(free, maxTickets, prefer);
  if (opts.dryRun) {
    return { ok: true, dryRun: true, chosen, sessionId, passports: passports.slice(0, chosen.length).map((p) => p.fullName) };
  }

  const { locked, failed } = await occupySeatsReliable(sessionId, {
    eventId,
    seats: chosen,
    distributionType,
  });
  if (!locked.length) {
    return {
      ok: false,
      reason: 'soft_lock', // чужая корзина / race — ретраить
      sessionId,
      tried: chosen,
      failed,
      ticketCount: event.ticketCount,
    };
  }

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
    throw err;
  }

  return {
    ok: true,
    sessionId,
    orderId: order?.orderId ?? order?.id ?? null,
    redirectUrl: order?.redirectUrl || order?.paymentUrl || null,
    paymentType,
    seats: locked,
    buyers: people.map((p) => p.fullName),
    amount: order?.amount ?? null,
    raw: order,
  };
}

export { loadPassports };
