/**
 * Радиусы точек схемы (canvas). Геометрию (x/y) не трогаем — только диаметр.
 *
 * Театр: серые и saleable — ОДИН размер (solid), без SVG-бубликов под ними.
 * ~половина старых SVG circle (r≈2.86 → screen 2.86*scale) ⇒ coeff ≈1.45.
 * Cap высокий: на pinch 300% старый min(3) оставлял canvas-крошки на фоне SVG.
 * Выбранное: ×1.22 сверху.
 */

export type SeatRadiusOpts = {
  theater?: boolean;
};

/** Единый радиус театра (grey + saleable). */
export function theaterSeatRadiusPx(scalePx: number, active = false): number {
  let r = Math.max(0.85, Math.min(12, scalePx * 1.45));
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
