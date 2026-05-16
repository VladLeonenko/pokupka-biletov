import type { SvgNativePlacement } from './svgNativeSeatLayout';

/** Сколько DOM-кнопок мест допустимо на touch; выше — делегирование клика по viewport. */
export const HALL_MAP_DELEGATED_HIT_MIN = 300;

export function isCoarsePointerDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

export function hallMapCanvasDevicePixelRatio(): number {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  return isCoarsePointerDevice() ? Math.min(1.5, dpr) : Math.min(3, dpr);
}

export function pickPlacementAtLayerPoint(
  placements: SvgNativePlacement[],
  layerX: number,
  layerY: number,
  layerWidth: number,
  layerHeight: number,
  viewBoxWidth: number,
): SvgNativePlacement | null {
  const scalePx = layerWidth / Math.max(1, viewBoxWidth);
  const hitR = Math.max(10, Math.min(32, scalePx * 14));
  let best: SvgNativePlacement | null = null;
  let bestD = hitR;
  for (const p of placements) {
    if (p.previewOnly) continue;
    const px = (p.xPct / 100) * layerWidth;
    const py = (p.yPct / 100) * layerHeight;
    const d = Math.hypot(layerX - px, layerY - py);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}
