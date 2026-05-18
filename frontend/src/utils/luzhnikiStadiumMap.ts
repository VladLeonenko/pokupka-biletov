/**
 * Правила схемы стадиона «Лужники» (luzhniki-football) на чекауте.
 * Серая чаша = allSeatCoordinates (luzhniki.txt ~77k).
 * Цветные точки = sellable (strict / fieldGrid / anchor).
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
    /** Цветные точки — только SeatList из живых офферов GetBilet, без fuzzy SVG-match. */
    sellableFromGetbiletOffersOnly: true,
    /** Фон чаши — облако luzhniki.txt, не grid layout.seats (~80k). */
    hallBackgroundFromLabeledSeats: false,
  };
}

export function parseSellableFromGetbiletOffersOnly(layout: unknown): boolean {
  if (!isLuzhnikiStadiumCheckoutLayout(layout)) return false;
  const r = layout as Record<string, unknown>;
  return r.sellableFromGetbiletOffersOnly !== false;
}

export function parseHallBackgroundFromLabeledSeats(layout: unknown): boolean {
  if (!layout || typeof layout !== 'object') return false;
  const r = layout as Record<string, unknown>;
  if (r.hallBackgroundFromLabeledSeats === false) return false;
  if (r.hallBackgroundFromLabeledSeats === true) return true;
  return false;
}

function cloudCoordinateCount(layout: Record<string, unknown> | null | undefined): number {
  if (!layout) return 0;
  const cloud = layout.allSeatCoordinates;
  return Array.isArray(cloud) ? cloud.length : 0;
}

/** Чекаут: серая чаша из контекста или /map, sellableSeats — только с живого /map. */
export function mergeLuzhnikiCheckoutLayoutJson(
  ctxLayout: Record<string, unknown> | null | undefined,
  mapLayout: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const ctx = ctxLayout ?? {};
  const map = mapLayout ?? {};
  const ctxCloud = cloudCoordinateCount(ctx);
  const mapCloud = cloudCoordinateCount(map);
  const allSeatCoordinates =
    ctxCloud >= mapCloud && ctxCloud > 0
      ? ctx.allSeatCoordinates
      : mapCloud > 0
        ? map.allSeatCoordinates
        : ctx.allSeatCoordinates ?? map.allSeatCoordinates;

  return {
    ...luzhnikiStadiumCheckoutLayoutFlags({ ...ctx, ...map }),
    ...ctx,
    ...map,
    allSeatCoordinates,
    seats:
      (Array.isArray(ctx.seats) && ctx.seats.length > 0 ? ctx.seats : map.seats) ??
      ctx.seats ??
      map.seats,
    sectorMode: ctx.sectorMode ?? map.sectorMode,
    sellableSeats: Array.isArray(map.sellableSeats) ? map.sellableSeats : [],
  };
}
