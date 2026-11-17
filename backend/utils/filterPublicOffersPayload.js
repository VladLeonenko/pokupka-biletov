import { filterOffersForSuperfinalSession } from './superfinalOffersFilter.js';

/**
 * GetBilet иногда отдаёт сектор и цену с SeatList: [].
 * Купить нельзя (MakeOrder требует места), на схему поставить нечего.
 * @param {unknown} row
 */
export function isEmptySeatListOffer(row) {
  if (!row || typeof row !== 'object') return false;
  const o = /** @type {Record<string, unknown>} */ (row);
  const sl = o.SeatList ?? o.seatList;
  if (!Array.isArray(sl)) return false;
  return !sl.some((x) => String(x ?? '').trim());
}

/**
 * Срез офферов GetBilet для публичных API (page/offers/map):
 * канонический сеанс суперфинала и строки без мест.
 * @param {unknown} payload
 * @param {string | null | undefined} repertoireId
 */
export function filterPublicOffersPayload(payload, repertoireId) {
  if (!payload || typeof payload !== 'object') return payload;
  const rows = Array.isArray(payload.ResultData) ? payload.ResultData : [];
  if (rows.length < 1) return payload;
  const filtered = filterOffersForSuperfinalSession(rows, repertoireId).filter(
    (row) => !isEmptySeatListOffer(row),
  );
  return { ...payload, ResultData: filtered };
}
