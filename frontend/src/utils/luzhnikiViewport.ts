/**
 * Viewport Лужников — зеркало backend/utils/luzhnikiViewport.js + TicketHallInteractiveBlock.
 */

export const LUZHNIKI_VIEWBOX_WIDTH = 11413;
export const LUZHNIKI_VIEWBOX_HEIGHT = 9676;

export type HallLayerBase = { x: number; y: number; width: number; height: number };

export function pctToViewBoxUnits(
  xPct: number,
  yPct: number,
  hallWidth = LUZHNIKI_VIEWBOX_WIDTH,
  hallHeight = LUZHNIKI_VIEWBOX_HEIGHT,
) {
  return {
    x: (xPct / 100) * hallWidth,
    y: (yPct / 100) * hallHeight,
  };
}

/** Экранные px: base fit + pan + zoom (как paintHallCanvas / layersStyle matrix). */
export function pctToScreenPx(
  xPct: number,
  yPct: number,
  layerBase: HallLayerBase,
  zoom: number,
  pan: { x: number; y: number },
) {
  const z = zoom > 0 ? zoom : 1;
  return {
    sx: layerBase.x + pan.x + (xPct / 100) * layerBase.width * z,
    sy: layerBase.y + pan.y + (yPct / 100) * layerBase.height * z,
  };
}
