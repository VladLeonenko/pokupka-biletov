import { SUPERKUP_NN_STAGE_MAP_KEY } from './footballStadiumRepertoires.js';

/** Флаги layout_json для canvas-чекаута футбольного стадиона (как Лужники / Portalbilet). */
export function footballStadiumCheckoutLayoutFlags(base = {}, stadiumMapKey = SUPERKUP_NN_STAGE_MAP_KEY) {
  const categoryCheckout = base.pbiletCategoryCheckout === true;
  return {
    ...base,
    stadiumMapKey,
    luzhnikiStadiumCheckout: true,
    pbiletCategoryCheckout: categoryCheckout,
    uniformHallSeatAppearance: true,
    omitClientSeatCoordinateCloud: categoryCheckout,
    disableStadiumCanvas: false,
    grayHallWhenNoOffers: false,
    disablePositionalSeatZip: true,
    preferExactOfferSeatMatch: !categoryCheckout,
    hallBackgroundFromLabeledSeats: false,
    /** 1200% от fit — как Лужники на стадионах. */
    maxZoomMultiplier: Number.isFinite(Number(base.maxZoomMultiplier))
      ? Number(base.maxZoomMultiplier)
      : 12,
    sectorFocusZoomMultiplier: Number.isFinite(Number(base.sectorFocusZoomMultiplier))
      ? Number(base.sectorFocusZoomMultiplier)
      : 12,
  };
}
