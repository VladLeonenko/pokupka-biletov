import { SUPERKUP_NN_STAGE_MAP_KEY } from './footballStadiumRepertoires.js';

/** Флаги layout_json для canvas-чекаута футбольного стадиона (как Лужники / Portalbilet). */
export function footballStadiumCheckoutLayoutFlags(base = {}, stadiumMapKey = SUPERKUP_NN_STAGE_MAP_KEY) {
  return {
    ...base,
    stadiumMapKey,
    luzhnikiStadiumCheckout: true,
    uniformHallSeatAppearance: true,
    omitClientSeatCoordinateCloud: false,
    disableStadiumCanvas: false,
    grayHallWhenNoOffers: false,
    disablePositionalSeatZip: true,
    preferExactOfferSeatMatch: true,
    hallBackgroundFromLabeledSeats: false,
  };
}
