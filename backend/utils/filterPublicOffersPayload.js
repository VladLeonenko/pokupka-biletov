import { filterOffersForSuperfinalSession } from './superfinalOffersFilter.js';

/**
 * Срез офферов GetBilet для публичных API (page/offers/map) — один канонический сеанс суперфинала.
 * @param {unknown} payload
 * @param {string | null | undefined} repertoireId
 */
export function filterPublicOffersPayload(payload, repertoireId) {
  if (!payload || typeof payload !== 'object') return payload;
  const rows = Array.isArray(payload.ResultData) ? payload.ResultData : [];
  if (rows.length < 1) return payload;
  const filtered = filterOffersForSuperfinalSession(rows, repertoireId);
  return { ...payload, ResultData: filtered };
}
