/**
 * Ручные офферы (VIP / доп. места) в getbilet_events.manual_offers_json.
 * Мержатся в публичный GetOfferList; глобальная наценка на них не накладывается повторно.
 */

import ticketPool from '../ticketDb.js';
import { applyGetbiletMarkupToSupplierUnit } from './getbiletMarkupPublic.js';

export const MANUAL_OFFER_MARKER = 'manual-offer';

/**
 * @param {unknown} row
 */
export function isManualOfferRow(row) {
  if (!row || typeof row !== 'object') return false;
  const o = /** @type {Record<string, unknown>} */ (row);
  if (o.ManualOffer === true || o.manualOffer === true) return true;
  const extra = o.Extra;
  if (Array.isArray(extra) && extra.some((x) => String(x).toLowerCase() === MANUAL_OFFER_MARKER)) {
    return true;
  }
  const id = String(o.Id ?? o.id ?? '');
  return id.startsWith('manual-');
}

/**
 * @param {string} repertoireId
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function loadManualOffersForRepertoire(repertoireId) {
  const rid = String(repertoireId || '').trim();
  if (!rid) return [];
  try {
    const r = await ticketPool.query(
      `SELECT manual_offers_json FROM getbilet_events WHERE getbilet_external_id = $1 LIMIT 1`,
      [rid],
    );
    const raw = r.rows[0]?.manual_offers_json;
    if (!Array.isArray(raw)) return [];
    return raw.filter((x) => x && typeof x === 'object');
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && e.code === '42703') return [];
    throw e;
  }
}

/**
 * @param {unknown} data
 * @param {Record<string, unknown>[]} manualOffers
 */
export function mergeManualOffersIntoPayload(data, manualOffers) {
  if (!Array.isArray(manualOffers) || manualOffers.length === 0) return data;
  const base =
    data && typeof data === 'object'
      ? /** @type {Record<string, unknown>} */ ({ .../** @type {object} */ (data) })
      : { Success: true, Method: 'GetOfferListByRepertoireId', ResultData: [] };
  const live = Array.isArray(base.ResultData) ? [...base.ResultData] : [];
  const withoutPrevManual = live.filter((row) => !isManualOfferRow(row));
  base.ResultData = [...withoutPrevManual, ...manualOffers];
  base.ResultCount = base.ResultData.length;
  return base;
}

/**
 * @param {{
 *   sector: string;
 *   row?: string;
 *   seats?: string[];
 *   seatCount?: number;
 *   supplierPrice: number;
 *   markupKind?: 'percent' | 'fixed';
 *   markupValue?: number;
 *   eventDateTime?: string;
 *   label?: string;
 * }} input
 * @param {string} repertoireId
 */
export function buildManualOfferRow(input, repertoireId) {
  const sector = String(input.sector || '').trim() || 'VIP';
  const row = String(input.row || '1').trim() || '1';
  const supplier = Number(input.supplierPrice);
  if (!Number.isFinite(supplier) || supplier < 0) {
    throw new Error('supplierPrice must be >= 0');
  }
  const markupKind = input.markupKind === 'fixed' ? 'fixed' : 'percent';
  const markupValue = Number(input.markupValue ?? 0);
  const retail = applyGetbiletMarkupToSupplierUnit(supplier, {
    markup_kind: markupKind,
    markup_value: Number.isFinite(markupValue) ? markupValue : 0,
  });
  let seats = Array.isArray(input.seats)
    ? input.seats.map((s) => String(s).trim()).filter(Boolean)
    : [];
  if (seats.length === 0) {
    const n = Math.max(1, Math.min(500, Math.floor(Number(input.seatCount) || 1)));
    seats = Array.from({ length: n }, (_, i) => String(i + 1));
  }
  const rid = String(repertoireId || '').trim();
  const id = `manual-${rid.slice(0, 8)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const price = String(Math.round(retail));
  return {
    Id: id,
    ManualOffer: true,
    Extra: [MANUAL_OFFER_MARKER, input.label || sector].filter(Boolean),
    Sector: sector,
    Row: row,
    SeatList: seats,
    SupplierPrice: String(Math.round(supplier)),
    AgentPrice: price,
    NominalPrice: price,
    RepertoireId: rid,
    EventDateTime: input.eventDateTime || undefined,
    MarkupKind: markupKind,
    MarkupValue: Number.isFinite(markupValue) ? markupValue : 0,
  };
}

/**
 * @param {string} repertoireId
 * @param {unknown[]} offers
 */
export async function saveManualOffersForRepertoire(repertoireId, offers) {
  const rid = String(repertoireId || '').trim();
  if (!rid) throw new Error('repertoireId required');
  const list = Array.isArray(offers) ? offers.filter((x) => x && typeof x === 'object') : [];
  const r = await ticketPool.query(
    `UPDATE getbilet_events
     SET manual_offers_json = $2::jsonb, updated_at = NOW()
     WHERE getbilet_external_id = $1
     RETURNING id, getbilet_external_id, manual_offers_json`,
    [rid, JSON.stringify(list)],
  );
  if (!r.rows.length) {
    throw Object.assign(new Error('event_not_found'), { code: 'event_not_found' });
  }
  return r.rows[0];
}
