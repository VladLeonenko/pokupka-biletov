import type { SvgNativePlacement, SvgNativeSeat } from './svgNativeSeatLayout';

/** Сколько DOM-кнопок мест допустимо на touch; выше — делегирование клика по viewport. */
export const HALL_MAP_DELEGATED_HIT_MIN = 300;

export type HallSectorPathBBox = { minX: number; minY: number; maxX: number; maxY: number };

/** Bbox path сектора в координатах viewBox SVG. */
export function parseHallSectorPathBBox(path: string): HallSectorPathBBox | null {
  const nums = path.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
  if (nums.length < 2) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i];
    const y = nums[i + 1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }
  return { minX, minY, maxX, maxY };
}

/** Точка места (xPct/yPct 0–100) внутри bbox полигона сектора. */
export function seatPctInSectorBBox(
  xPct: number,
  yPct: number,
  bbox: HallSectorPathBBox,
  viewBoxWidth: number,
  viewBoxHeight: number,
  marginPct = 0.12,
): boolean {
  const w = Math.max(1, viewBoxWidth);
  const h = Math.max(1, viewBoxHeight);
  const minX = (bbox.minX / w) * 100 - marginPct;
  const maxX = (bbox.maxX / w) * 100 + marginPct;
  const minY = (bbox.minY / h) * 100 - marginPct;
  const maxY = (bbox.maxY / h) * 100 + marginPct;
  return xPct >= minX && xPct <= maxX && yPct >= minY && yPct <= maxY;
}

export function filterPlacementsInSectorPath(
  placements: SvgNativePlacement[],
  path: string,
  viewBoxWidth: number,
  viewBoxHeight: number,
): SvgNativePlacement[] {
  const bbox = parseHallSectorPathBBox(path);
  if (!bbox) return placements;
  return placements.filter((p) =>
    seatPctInSectorBBox(p.xPct, p.yPct, bbox, viewBoxWidth, viewBoxHeight),
  );
}

export function filterSeatsInSectorPath(
  seats: SvgNativeSeat[],
  path: string,
  viewBoxWidth: number,
  viewBoxHeight: number,
): SvgNativeSeat[] {
  const bbox = parseHallSectorPathBBox(path);
  if (!bbox) return seats;
  return seats.filter((s) =>
    seatPctInSectorBBox(s.xPct, s.yPct, bbox, viewBoxWidth, viewBoxHeight),
  );
}

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
