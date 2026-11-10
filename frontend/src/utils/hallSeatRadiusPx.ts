/**
 * Радиусы точек схемы (canvas). Геометрию (x/y) не трогаем — только диаметр.
 *
 * Зум: r ∝ scalePx (место/шаг как на ПК). Без скачка mapZoomed.
 * Театр: sellable ≈ серые + чуть крупнее (не stadium ×5 / cap 5.5 — blobs на 100%).
 * Выбранное: ×1.22 сверху.
 */

export type SeatRadiusOpts = {
  /** МХТ/Вахтангов/Большой — плотная сетка, мелкие точки. */
  theater?: boolean;
};

export function stadiumSeatCanvasRadiusPx(
  zoom: number,
  layerWidth: number,
  svgViewBoxWidth: number,
  active: boolean,
  _mapZoomed?: boolean,
  opts?: SeatRadiusOpts,
): number {
  const scalePx = (layerWidth * zoom) / Math.max(1, svgViewBoxWidth);
  let r = opts?.theater
    ? Math.max(0.65, Math.min(2.15, scalePx * 3.2))
    : Math.max(1.0, Math.min(3.2, scalePx * 4));
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

/** Серые точки театра — sellable должен быть чуть крупнее этого. */
export function theaterBackgroundSeatRadiusPx(scalePx: number, seatCount: number): number {
  const dense = seatCount >= 600;
  return dense
    ? Math.max(0.55, Math.min(1.45, scalePx * 2.8))
    : Math.max(0.7, Math.min(1.75, scalePx * 3.4));
}
