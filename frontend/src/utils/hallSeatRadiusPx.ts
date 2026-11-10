/**
 * Радиусы точек схемы (canvas). Геометрию (x/y) не трогаем — только диаметр.
 *
 * Театр: grey == saleable. Радиус ограничен плотностью сетки (не слипаются на 100%).
 * МХТ: плотнее/мельче. Большой: ближе к SVG r≈2.86, но тоже с density cap.
 * Выбранное: ×1.22 сверху.
 */

export type SeatRadiusOpts = {
  theater?: boolean;
  mhtChekhov?: boolean;
  /** Мин. шаг центров мест в координатах SVG (viewBox units). */
  spacingSvg?: number;
};

const SVG_SEAT_R_MATCH = 2.86;

/** Оценка min spacing по xPct/yPct (выборка, без полного O(n²) на 2k). */
export function estimateMinSeatSpacingSvg(
  seats: Array<{ xPct: number; yPct: number }>,
  vbW: number,
  vbH: number,
): number {
  const n = seats.length;
  if (n < 2 || !(vbW > 0) || !(vbH > 0)) return 10;
  const step = n > 500 ? 4 : n > 200 ? 2 : 1;
  let min = Infinity;
  for (let i = 0; i < n; i += step) {
    const a = seats[i];
    const ax = (a.xPct / 100) * vbW;
    const ay = (a.yPct / 100) * vbH;
    for (let j = i + step; j < n; j += step) {
      const b = seats[j];
      const d = Math.hypot(ax - (b.xPct / 100) * vbW, ay - (b.yPct / 100) * vbH);
      if (d > 0.35 && d < min) min = d;
    }
  }
  return Number.isFinite(min) && min < Infinity ? min : 10;
}

export function theaterSeatRadiusPx(
  scalePx: number,
  active = false,
  opts?: Pick<SeatRadiusOpts, 'mhtChekhov' | 'spacingSvg'>,
): number {
  const spacing = opts?.spacingSvg;
  /** Диаметр ≤ ~70% шага — на 100% точки не слипаются в «кашу». */
  const densCap =
    spacing != null && spacing > 0 ? Math.max(0.45, spacing * scalePx * 0.34) : Infinity;
  let r = opts?.mhtChekhov
    ? Math.max(0.55, Math.min(3.2, scalePx * 1.05, densCap))
    : Math.max(0.75, Math.min(5.5, scalePx * SVG_SEAT_R_MATCH, densCap));
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
    return theaterSeatRadiusPx(scalePx, active, {
      mhtChekhov: opts?.mhtChekhov,
      spacingSvg: opts?.spacingSvg,
    });
  }
  let r = Math.max(1.0, Math.min(3.2, scalePx * 4));
  if (active) r *= 1.22;
  return r;
}

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
