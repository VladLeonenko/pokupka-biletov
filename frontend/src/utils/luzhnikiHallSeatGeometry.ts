/** Радиус круга места в единицах viewBox — как diagnostic / luzhnikiNativeSeatCircleRadius. */
export function luzhnikiHallSeatDotRadiusViewBox(viewBoxWidth: number, viewBoxHeight = 9676): number {
  const w = Math.max(1, viewBoxWidth);
  const h = Math.max(1, viewBoxHeight);
  return Math.round(Math.min(w, h) * 0.0029 * 100) / 100;
}
