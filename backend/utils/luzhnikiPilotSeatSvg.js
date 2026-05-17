/**
 * Пилотные circle в SVG — только для геодезии (координаты sellable).
 * На карте точки рисует canvas из sellableSeats, не эти круги.
 */

/** Как luzhnikiFootballNativeGenerator: min(W,H) * 0.0029 */
export const LUZHNIKI_PILOT_SEATS_LAYER_ID = 'luzhniki-pilot-seats';
export const LUZHNIKI_PILOT_SECTOR_LAYER_ID = 'luzhniki-pilot-sector';

export function luzhnikiNativeSeatCircleRadius(hallWidth, hallHeight) {
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;
  return Math.round(Math.min(w, h) * 0.0029 * 100) / 100;
}

export function escSvgAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Невидимые круги: не портят подложку и processHallSvgForNative. */
export function pilotSeatCircleMarkup(sector, row, seat, cx, cy, hallWidth, hallHeight, extraAttrs = '') {
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;
  const r = luzhnikiNativeSeatCircleRadius(w, h);
  const cxN = Number(cx);
  const cyN = Number(cy);
  return `<circle cx="${cxN.toFixed(2)}" cy="${cyN.toFixed(2)}" r="${r.toFixed(2)}" place-name="${escSvgAttr(sector)}" row="${escSvgAttr(row)}" place="${escSvgAttr(seat)}" fill="none" stroke="none" opacity="0" pointer-events="none"${extraAttrs ? ` ${extraAttrs}` : ''}/>`;
}
