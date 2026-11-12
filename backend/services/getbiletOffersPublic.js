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
import { sanitizePublicOffersPayload } from './getbiletOwnOffers.js';
import { applyExternalSiteUndercutToPayload } from './externalCompetitorPrices.js';

/**
 * @param {string} repertoireId
 * @param {{ forceRefresh?: boolean, cacheOnly?: boolean, skipExternalUndercut?: boolean }} [opts]
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
  let marked = applyGetbiletMarkupToOfferPayload(merged, markupRule);
  if (!opts.skipExternalUndercut) {
    marked = await applyExternalSiteUndercutToPayload(repertoireId, marked);
  }
  const payload = sanitizePublicOffersPayload(marked);
  if (!markupRule) {
    console.warn('[getbilet] public offers without markup rule:', repertoireId);
  }
  return { payload, meta, markupRule };
}
