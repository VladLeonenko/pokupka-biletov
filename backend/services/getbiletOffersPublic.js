/**
 * Публичные офферы: кэш GetBilet + наценка (единая точка — нельзя забыть apply markup в роуте).
 */
import { getOfferListByRepertoireIdCached } from './getbiletOffersCache.js';
import {
  applyGetbiletMarkupToOfferPayload,
  getGetbiletMarkupRuleForRepertoire,
} from './getbiletMarkupPublic.js';

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
  const markupRule = await getGetbiletMarkupRuleForRepertoire(repertoireId);
  const payload = applyGetbiletMarkupToOfferPayload(data, markupRule);
  if (!markupRule) {
    console.warn('[getbilet] public offers without markup rule:', repertoireId);
  }
  return { payload, meta, markupRule };
}
