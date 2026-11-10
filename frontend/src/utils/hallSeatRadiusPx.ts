/**
 * Радиусы точек схемы (canvas). Геометрию (x/y) не трогаем — только диаметр.
 *
 * МХТ: мелкие solid grey+saleable (canvas-only, без SVG-кружков).
 * Большой / прочие: saleable ≈ нативный SVG seat r≈2.86 (серые рисует SVG).
 * Выбранное: ×1.22 сверху.
 */

export type SeatRadiusOpts = {
  theater?: boolean;
  /** Только МХТ им. Чехова — урезанный единый размер. */
  mhtChekhov?: boolean;
};

/** GetBilet/наши схемы Большого: типичный r кружка места в SVG. */
const SVG_SEAT_R_MATCH = 2.86;

/**
 * Единый радиус театра (grey == saleable).
 * МХТ SVG seat r≈4 → половина визуала = scale*2; не 0.72 (крошки на фоне SVG r=4).
 */
export function theaterSeatRadiusPx(
  scalePx: number,
  active = false,
  opts?: Pick<SeatRadiusOpts, 'mhtChekhov'>,
): number {
  let r = opts?.mhtChekhov
    ? Math.max(0.7, Math.min(8, scalePx * 2.0))
    : Math.max(0.85, Math.min(10, scalePx * SVG_SEAT_R_MATCH));
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
  if (opts?.theater || opts?.mhtChekhov) {
    return theaterSeatRadiusPx(scalePx, active, { mhtChekhov: opts?.mhtChekhov });
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

/** @deprecated use theaterSeatRadiusPx */
export function theaterBackgroundSeatRadiusPx(scalePx: number, _seatCount?: number): number {
  return theaterSeatRadiusPx(scalePx, false);
}
