/**
 * Радиусы точек схемы (canvas). Геометрию (x/y) не трогаем — только диаметр.
 *
 * Театр: серые и saleable — ОДИН размер (solid).
 * ~¼ старого SVG circle (r≈2.86*scale) / половина прежнего canvas 1.45 → coeff 0.72.
 * Выбранное: ×1.22 сверху.
 */

export type SeatRadiusOpts = {
  theater?: boolean;
};

/** Единый радиус театра (grey + saleable). */
export function theaterSeatRadiusPx(scalePx: number, active = false): number {
  let r = Math.max(0.55, Math.min(6, scalePx * 0.72));
  if (active) r *= 1.22;
  return r;
}

export function stadiumSeatCanvasRadiusPx(
  zoom: number,
  layerWidth: number,
  svgViewBoxWidth: number,
  active: boolean,
  _mapZoomed?: boolean,
  opts?: SeatRadiusOpts,
): number {
  const scalePx = (layerWidth * zoom) / Math.max(1, svgViewBoxWidth);
  if (opts?.theater) {
    return theaterSeatRadiusPx(scalePx, active);
  }
  let r = Math.max(1.0, Math.min(3.2, scalePx * 4));
  if (active) r *= 1.22;
  return r;
}

/** Серые точки чаши стадиона. */
export function hallBackgroundSeatRadiusPx(
  scalePx: number,
  dense: boolean,
  _mapZoomed = false,
): number {
  return dense
    ? Math.max(0.5, Math.min(2.2, scalePx * 3.6))
    : Math.max(0.85, Math.min(2.6, scalePx * 5.5));
}

/** @deprecated use theaterSeatRadiusPx — оставлен для call-sites серого фона. */
export function theaterBackgroundSeatRadiusPx(scalePx: number, _seatCount?: number): number {
  return theaterSeatRadiusPx(scalePx, false);
}
