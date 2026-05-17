/**
 * Подмена координат в layout.seats точными sellable (pbilet strict / интерполяция).
 */

import { buildLabeledSeatIndex, lookupLabeledSeat } from './hallSeatGeodesyMatch.js';

/**
 * @param {{ sector: string, row: string, seat: string, xPct: number, yPct: number, geodesySource?: string }[]} layoutSeats
 * @param {{ sector: string, row: string, seat: string, xPct: number, yPct: number, geodesySource?: string }[]} sellableSeats
 */
export function mergeSellableSeatsIntoLayout(layoutSeats, sellableSeats) {
  if (!Array.isArray(layoutSeats) || layoutSeats.length < 1) return layoutSeats;
  if (!Array.isArray(sellableSeats) || sellableSeats.length < 1) return layoutSeats;

  const index = buildLabeledSeatIndex(layoutSeats);
  let patched = 0;
  for (const s of sellableSeats) {
    const hit = lookupLabeledSeat(index, s.sector, s.row, s.seat);
    if (!hit || !Number.isFinite(s.xPct) || !Number.isFinite(s.yPct)) continue;
    hit.xPct = s.xPct;
    hit.yPct = s.yPct;
    if (s.geodesySource) hit.geodesySource = s.geodesySource;
    patched += 1;
  }
  return { layoutSeats, patched };
}
