/**
 * Радиусы точек схемы (canvas). Геометрию (x/y) не трогаем — только диаметр.
 *
 * Зум пальцами: r ∝ scalePx = layerWidth*zoom/viewBox.
 * Кружки НЕ уменьшаем «под экран» при приближении — иначе сломается
 * отношение место/шаг (как на ПК). Пинч-скачок убран: нет ветки mapZoomed×2.
 *
 * Выбранное: ×1.22 + обводка сверху (Яндекс-like).
 */
export function stadiumSeatCanvasRadiusPx(
  zoom: number,
  layerWidth: number,
  svgViewBoxWidth: number,
  active: boolean,
  _mapZoomed?: boolean,
): number {
  const scalePx = (layerWidth * zoom) / Math.max(1, svgViewBoxWidth);
  let r = Math.max(1.3, Math.min(5.5, scalePx * 5));
  if (active) r *= 1.22;
  return r;
}

/** Серые точки чаши: без mode-скачка при пересечении fitZoom. */
export function hallBackgroundSeatRadiusPx(
  scalePx: number,
  dense: boolean,
  _mapZoomed = false,
): number {
  return dense
    ? Math.max(0.5, Math.min(2.4, scalePx * 3.6))
    : Math.max(0.85, Math.min(2.8, scalePx * 5.5));
}
