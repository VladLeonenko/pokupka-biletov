/** Свои места GetBilet: OwnOffer с бэкенда (AgentId не отдаём на витрину). */

export type OwnOfferLike = {
  OwnOffer?: boolean;
  ownOffer?: boolean;
  ManualOffer?: boolean;
  manualOffer?: boolean;
  AgentPrice?: string | number;
  NominalPrice?: string | number;
};

export function isOwnOfferLike(row: OwnOfferLike | null | undefined): boolean {
  if (!row) return false;
  return row.OwnOffer === true || row.ownOffer === true || row.ManualOffer === true || row.manualOffer === true;
}

/**
 * На схеме одно физическое место = один оффер.
 * Свои всегда важнее чужих; среди своих/чужих без флага — как раньше (дороже), иначе дешевле.
 */
export function shouldReplaceMappedOffer<T>(
  prev: T,
  next: T,
  getPrice: (o: T) => string | number,
  isOwn: (o: T) => boolean = (o) => isOwnOfferLike(o as OwnOfferLike),
): boolean {
  const ownNext = isOwn(next);
  const ownPrev = isOwn(prev);
  if (ownNext || ownPrev) {
    if (ownNext !== ownPrev) return ownNext;
    const pn = Number(getPrice(next));
    const pp = Number(getPrice(prev));
    if (Number.isFinite(pn) && Number.isFinite(pp) && pn !== pp) return pn < pp;
    return false;
  }
  const nextPrice = Number(getPrice(next));
  const prevPrice = Number(getPrice(prev));
  if (Number.isFinite(nextPrice) && Number.isFinite(prevPrice) && nextPrice !== prevPrice) {
    return nextPrice > prevPrice;
  }
  return false;
}

export function sortOwnOffersFirst<T>(rows: T[], isOwn: (o: T) => boolean = (o) => isOwnOfferLike(o as OwnOfferLike)): T[] {
  return [...rows].sort((a, b) => Number(isOwn(b)) - Number(isOwn(a)));
}
