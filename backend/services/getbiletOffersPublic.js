/**
 * Публичные офферы: кэш GetBilet + ручные VIP + наценка (единая точка).
 */
import { getOfferListByRepertoireIdCached } from './getbiletOffersCache.js';
import {
  applyGetbiletMarkupToOfferPayload,
  getGetbiletMarkupRuleForRepertoire,
} from './getbiletMarkupPublic.js';
import {
  loadManualOffersForRepertoire,
  mergeManualOffersIntoPayload,
} from './getbiletManualOffers.js';

/**
 * @param {string} repertoireId
 * @param {{ forceRefresh?: boolean }} [opts]
 * @returns {Promise<{
 *   payload: unknown;
 *   meta: { cache?: string; ageMs?: number };
 *   markupRule: import('./getbiletMarkupPublic.js').GetbiletMarkupRule | null;
 * }>}
 */
export async function getPublicOffersForRepertoire(repertoireId, opts = {}) {
  const { data, meta } = await getOfferListByRepertoireIdCached(repertoireId, opts);
  const manual = await loadManualOffersForRepertoire(repertoireId);
  const merged = mergeManualOffersIntoPayload(data, manual);
  const markupRule = await getGetbiletMarkupRuleForRepertoire(repertoireId);
  const payload = applyGetbiletMarkupToOfferPayload(merged, markupRule);
  if (!markupRule) {
    console.warn('[getbilet] public offers without markup rule:', repertoireId);
  }
  return { payload, meta, markupRule };
}
