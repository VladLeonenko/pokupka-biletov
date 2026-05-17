/**
 * Правила схемы стадиона «Лужники» (luzhniki-football) на чекауте.
 * Серая чаша = layout.seats (как tickets.json: сектор/ряд/место + xPct/yPct).
 * Цветные точки = sellable из GetBilet с тем же ключом места.
 */

export const LUZHNIKI_FOOTBALL_STAGE_MAP_KEY = 'luzhniki-football';

export function isLuzhnikiStadiumCheckoutLayout(layout: unknown): boolean {
  if (!layout || typeof layout !== 'object') return false;
  const r = layout as Record<string, unknown>;
  return (
    r.stadiumMapKey === LUZHNIKI_FOOTBALL_STAGE_MAP_KEY ||
    r.luzhnikiStadiumCheckout === true
  );
}

/** Флаги layout_json для канонического чекаута Лужников (не отключать canvas/облако). */
export function luzhnikiStadiumCheckoutLayoutFlags(
  base: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ...base,
    stadiumMapKey: LUZHNIKI_FOOTBALL_STAGE_MAP_KEY,
    luzhnikiStadiumCheckout: true,
    uniformHallSeatAppearance: true,
    omitClientSeatCoordinateCloud: false,
    disableStadiumCanvas: false,
    grayHallWhenNoOffers: false,
    disablePositionalSeatZip: true,
    preferExactOfferSeatMatch: true,
    /** Фон чаши — подписанные места из tickets (layout.seats), не безымянное облако coordinates. */
    hallBackgroundFromLabeledSeats: true,
  };
}

export function parseHallBackgroundFromLabeledSeats(layout: unknown): boolean {
  if (!layout || typeof layout !== 'object') return false;
  const r = layout as Record<string, unknown>;
  return (
    r.hallBackgroundFromLabeledSeats === true ||
    isLuzhnikiStadiumCheckoutLayout(layout)
  );
}
