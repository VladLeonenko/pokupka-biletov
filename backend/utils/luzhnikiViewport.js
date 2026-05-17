/**
 * Viewport Лужников: viewBox pbilet и цепочка координат до экрана (как TicketHallInteractiveBlock).
 *
 * Подложка: viewBox 0 0 11413 9676 (px pbilet, не 1000×820).
 * Zoom/pan: CSS transform matrix(zoom, 0, 0, zoom, pan.x, pan.y) на слое схемы, transformOrigin 0 0.
 * Canvas: sx = base.x + pan.x + (xPct/100) * base.width * zoom (то же для y).
 */

export const LUZHNIKI_VIEWBOX_WIDTH = 11413;
export const LUZHNIKI_VIEWBOX_HEIGHT = 9676;

export function pctToViewBoxUnits(xPct, yPct, hallWidth, hallHeight) {
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : LUZHNIKI_VIEWBOX_WIDTH;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : LUZHNIKI_VIEWBOX_HEIGHT;
  return {
    x: (Number(xPct) / 100) * w,
    y: (Number(yPct) / 100) * h,
  };
}

export function viewBoxUnitsToPct(x, y, hallWidth, hallHeight) {
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : LUZHNIKI_VIEWBOX_WIDTH;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : LUZHNIKI_VIEWBOX_HEIGHT;
  return { xPct: (x / w) * 100, yPct: (y / h) * 100 };
}

/**
 * @param {{ x: number, y: number, width: number, height: number }} layerBase — fit слоя в viewport
 * @param {number} zoom
 * @param {{ x: number, y: number }} pan
 */
export function pctToScreenPx(xPct, yPct, layerBase, zoom, pan) {
  const z = Number(zoom) > 0 ? Number(zoom) : 1;
  const px = pan?.x ?? 0;
  const py = pan?.y ?? 0;
  return {
    sx: layerBase.x + px + (Number(xPct) / 100) * layerBase.width * z,
    sy: layerBase.y + py + (Number(yPct) / 100) * layerBase.height * z,
  };
}
