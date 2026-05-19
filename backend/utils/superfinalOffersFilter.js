/**
 * Синхронно с frontend/src/utils/superfinalOffersFilter.ts
 * GetBilet иногда отдаёт офферы с другим EventDateTime в том же repertoireId.
 */

import { isFanIdRequiredForRepertoire } from './fanIdRequiredRepertoire.js';

export const SUPERFINAL_MOSCOW_DATE_KEY = '2026-05-24';

function moscowDateKey(iso) {
  if (!iso?.trim()) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Europe/Moscow' });
}

/**
 * @template T
 * @param {T[]} offers
 * @param {string | null | undefined} repertoireId
 * @returns {T[]}
 */
export function filterOffersForSuperfinalSession(offers, repertoireId) {
  if (!isFanIdRequiredForRepertoire(repertoireId)) return offers;
  const filtered = offers.filter((o) => moscowDateKey(o.EventDateTime) === SUPERFINAL_MOSCOW_DATE_KEY);
  return filtered.length > 0 ? filtered : offers;
}
