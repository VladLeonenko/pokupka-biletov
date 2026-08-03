import ticketPool from '../ticketDb.js';
import { GetbiletValidationError } from '../services/getbiletClient.js';
import {
  restV2MakeOrder,
  restV2CancelOrder,
  restV2GetOfferById,
} from '../services/getbiletRestV2.js';
import {
  applyGetbiletMarkupToOfferPayload,
  applyGetbiletMarkupToSupplierUnit,
  getGetbiletMarkupRuleForRepertoire,
} from '../services/getbiletMarkupPublic.js';

const DEMO_REPERTOIRE_ID = process.env.TBANK_DEMO_REPERTOIRE_ID?.trim() || 'tbank-demo-event';

/** TTL брони на витрине (сек). По умолчанию 13 мин — чуть меньше типичных 15 мин у оператора. */
export const TICKET_SEAT_HOLD_SECONDS = Math.max(
  60,
  Math.min(3600, Number(process.env.GETBILET_SEAT_HOLD_SECONDS) || 13 * 60),
);

export const TICKET_SEAT_HOLD_MS = TICKET_SEAT_HOLD_SECONDS * 1000;

function requireNonEmptyString(v, name) {
  const s = typeof v === 'string' ? v.trim() : v != null ? String(v).trim() : '';
  if (!s) throw new GetbiletValidationError(`${name} обязателен`);
  return s;
}

export function pickGetbiletOrderId(data) {
  if (!data || typeof data !== 'object') return null;
  const rd = data.ResultData;
  if (rd && typeof rd === 'object' && !Array.isArray(rd)) {
    const id = rd.OrderId ?? rd.Id ?? rd.orderId;
    if (id != null && id !== '') return String(id);
  }
  if (Array.isArray(rd) && rd[0] && typeof rd[0] === 'object') {
    const id = rd[0].OrderId ?? rd[0].Id;
    if (id != null) return String(id);
  }
  const id = data.OrderId ?? data.Id;
  return id != null && id !== '' ? String(id) : null;
}

function parseOfferRow(offerPayload) {
  const row = Array.isArray(offerPayload?.ResultData)
    ? offerPayload.ResultData[0]
    : offerPayload?.ResultData;
  if (!row || typeof row !== 'object') return null;
  const unit = Number(row.AgentPrice ?? row.NominalPrice ?? 0);
  if (!Number.isFinite(unit) || unit < 0) return null;
  return { row, unitRub: unit };
}

function isDemoCheckoutPayload(repertoireId, offerId) {
  return repertoireId === DEMO_REPERTOIRE_ID && String(offerId).startsWith('tb-demo-');
}

async function loadCachedOfferRowById(repertoireId, offerId) {
  const r = await ticketPool.query(
    `SELECT payload_json FROM getbilet_repertoire_offers_cache WHERE repertoire_external_id = $1`,
    [repertoireId],
  );
  const payload = r.rows[0]?.payload_json;
  const rows = Array.isArray(payload?.ResultData) ? payload.ResultData : [];
  const id = String(offerId ?? '');
  return rows.find((row) => row && typeof row === 'object' && String(row.Id ?? '') === id) || null;
}

async function resolveOfferUnitRub({ offerId, repertoireId }) {
  if (isDemoCheckoutPayload(repertoireId, offerId)) {
    const row = await loadCachedOfferRowById(repertoireId, offerId);
    if (!row) throw new GetbiletValidationError('Тестовое предложение не найдено');
    const unitRub = Number(row.AgentPrice ?? row.NominalPrice ?? 0);
    if (!Number.isFinite(unitRub) || unitRub <= 0) {
      throw new GetbiletValidationError('Некорректная цена тестового предложения');
    }
    return { unitRub, isDemo: true, cachedRow: row };
  }

  let offerPayload = await restV2GetOfferById(offerId);
  const markupRule = await getGetbiletMarkupRuleForRepertoire(repertoireId);
  offerPayload = applyGetbiletMarkupToOfferPayload(offerPayload, markupRule);
  const parsed = parseOfferRow(offerPayload);
  if (!parsed) {
    throw new GetbiletValidationError('Не удалось получить цену предложения');
  }

  let unitRub = parsed.unitRub;
  const cachedRow = await loadCachedOfferRowById(repertoireId, offerId);
  if (cachedRow) {
    const supplier = Number(cachedRow.AgentPrice ?? cachedRow.NominalPrice ?? 0);
    if (Number.isFinite(supplier) && supplier >= 0) {
      const fromList = applyGetbiletMarkupToSupplierUnit(supplier, markupRule);
      if (Number.isFinite(fromList) && fromList > 0) {
        unitRub = fromList;
      }
    }
  }

  return { unitRub, isDemo: false, cachedRow };
}

/** @param {unknown} body */
export function normalizeOfferSelections(body) {
  const rawSelections = Array.isArray(body?.offerSelections) ? body.offerSelections : [];
  const source =
    rawSelections.length > 0
      ? rawSelections
      : [
          {
            offerId: body?.offerId,
            seats: body?.seats,
          },
        ];

  const grouped = new Map();
  for (const item of source) {
    const offerId = requireNonEmptyString(item?.offerId, 'offerId');
    const seatsRaw = item?.seats;
    if (!Array.isArray(seatsRaw) || seatsRaw.length === 0) {
      throw new GetbiletValidationError('Выберите хотя бы одно место');
    }
    const seats = seatsRaw.map((s) => String(s).trim()).filter(Boolean);
    if (seats.length === 0) throw new GetbiletValidationError('Некорректный список мест');
    const existing = grouped.get(offerId) ?? [];
    for (const seat of seats) {
      if (!existing.includes(seat)) existing.push(seat);
    }
    grouped.set(offerId, existing);
  }

  return [...grouped.entries()].map(([offerId, seats]) => ({ offerId, seats }));
}

export function selectionKeyForOfferSelections(offerSelections) {
  return offerSelections
    .map(({ offerId, seats }) => `${offerId}:${[...seats].sort().join(',')}`)
    .sort()
    .join('|');
}

async function assertSeatsInCachedOffer({ offerId, repertoireId, seats, cachedRow }) {
  const row = cachedRow || (await loadCachedOfferRowById(repertoireId, offerId));
  if (!row) return;
  const availableSeats = Array.isArray(row.SeatList) ? row.SeatList.map(String) : null;
  if (!availableSeats) return;
  const unavailable = seats.filter((seat) => !availableSeats.includes(String(seat)));
  if (unavailable.length > 0) {
    throw new GetbiletValidationError(`Места недоступны: ${unavailable.join(', ')}`);
  }
}

/**
 * Локальный soft-hold: цена и проверка мест без MakeOrder у GetBilet.
 * Партнёрская бронь уходит только после оплаты.
 */
export async function prepareLocalSeatHold({ offerSelections, repertoireId }) {
  let baseRub = 0;
  let isDemo = true;
  const softRows = [];

  for (const selection of offerSelections) {
    const { unitRub, isDemo: demoOffer, cachedRow } = await resolveOfferUnitRub({
      offerId: selection.offerId,
      repertoireId,
    });
    await assertSeatsInCachedOffer({
      offerId: selection.offerId,
      repertoireId,
      seats: selection.seats,
      cachedRow,
    });
    baseRub += unitRub * selection.seats.length;
    isDemo = isDemo && demoOffer;
    for (const seat of selection.seats) {
      softRows.push({ OfferId: selection.offerId, Seat: String(seat), SoftHold: true });
    }
  }

  return {
    baseRub,
    makeData: {
      Success: true,
      Method: 'LocalSoftHold',
      ResultData: softRows,
    },
    getbiletOrderIds: [],
    isDemo,
    reservations: offerSelections.map((selection) => ({
      offerId: selection.offerId,
      seats: selection.seats,
      makeData: null,
      getbiletOrderId: null,
    })),
  };
}

async function prepareTicketReservation({ offerId, repertoireId, seats }) {
  const { unitRub, isDemo, cachedRow } = await resolveOfferUnitRub({ offerId, repertoireId });

  if (isDemo) {
    await assertSeatsInCachedOffer({ offerId, repertoireId, seats, cachedRow });
    return {
      baseRub: unitRub * seats.length,
      makeData: {
        Success: true,
        Method: 'DemoMakeOrder',
        ResultData: seats.map((seat) => ({
          TicketId: `demo-${offerId}-${seat}`,
          OfferId: offerId,
          Seat: String(seat),
        })),
      },
      getbiletOrderId: null,
      isDemo: true,
    };
  }

  const makeData = await restV2MakeOrder(offerId, seats);
  return {
    baseRub: unitRub * seats.length,
    makeData,
    getbiletOrderId: pickGetbiletOrderId(makeData),
    isDemo: false,
  };
}

/** Достаёт ticket refs из ответа MakeOrder (один объект или массив чанков). */
export function extractTicketRefsFromMakeData(makeData) {
  const ticketRefs = [];
  if (makeData == null || typeof makeData !== 'object') return ticketRefs;
  const chunks = Array.isArray(makeData) ? makeData : [makeData];
  for (const chunk of chunks) {
    if (!chunk || typeof chunk !== 'object') continue;
    if (chunk.Method === 'LocalSoftHold') continue;
    const rd = chunk.ResultData;
    const rows = Array.isArray(rd) ? rd : rd ? [rd] : [];
    for (const r of rows) {
      if (!r || typeof r !== 'object') continue;
      if (r.SoftHold) continue;
      const tid = r.TicketId ?? r.Id ?? r.ticketId;
      if (tid != null) {
        ticketRefs.push({ externalTicketId: String(tid), metadata: r });
      }
    }
  }
  return ticketRefs;
}

/** Только цена без MakeOrder — для checkout с уже активной бронью. */
export async function priceTicketSelections({ offerSelections, repertoireId }) {
  let baseRub = 0;
  let isDemo = true;
  for (const selection of offerSelections) {
    const { unitRub, isDemo: demoOffer } = await resolveOfferUnitRub({
      offerId: selection.offerId,
      repertoireId,
    });
    baseRub += unitRub * selection.seats.length;
    isDemo = isDemo && demoOffer;
  }
  return { baseRub, isDemo };
}

export async function prepareTicketReservations({ offerSelections, repertoireId }) {
  const getbiletOrderIds = [];
  const makeDataList = [];
  let baseRub = 0;
  let isDemo = true;

  try {
    for (const selection of offerSelections) {
      const reservation = await prepareTicketReservation({
        offerId: selection.offerId,
        repertoireId,
        seats: selection.seats,
      });
      baseRub += reservation.baseRub;
      isDemo = isDemo && reservation.isDemo;
      if (reservation.getbiletOrderId) getbiletOrderIds.push(reservation.getbiletOrderId);
      makeDataList.push({
        offerId: selection.offerId,
        seats: selection.seats,
        makeData: reservation.makeData,
        getbiletOrderId: reservation.getbiletOrderId,
      });
    }
  } catch (err) {
    await cancelTicketSeatHolds(getbiletOrderIds);
    throw err;
  }

  return {
    baseRub,
    makeData: makeDataList.length === 1 ? makeDataList[0].makeData : makeDataList,
    getbiletOrderIds,
    isDemo,
    reservations: makeDataList,
  };
}

/** @param {string[]} getbiletOrderIds */
export async function cancelTicketSeatHolds(getbiletOrderIds) {
  const ids = [...new Set((getbiletOrderIds || []).map(String).filter(Boolean))];
  await Promise.all(ids.map((orderId) => restV2CancelOrder(orderId).catch(() => {})));
}

export function buildSeatHoldResponse({ reservation, offerSelections, repertoireId }) {
  const expiresAt = new Date(Date.now() + TICKET_SEAT_HOLD_MS).toISOString();
  return {
    ok: true,
    expiresAt,
    holdSeconds: TICKET_SEAT_HOLD_SECONDS,
    repertoireId,
    offerSelections,
    selectionKey: selectionKeyForOfferSelections(offerSelections),
    baseRub: reservation.baseRub,
    getbiletOrderIds: reservation.getbiletOrderIds,
    makeData: reservation.makeData,
    isDemo: reservation.isDemo,
  };
}
