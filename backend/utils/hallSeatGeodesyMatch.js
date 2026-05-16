/**
 * Сопоставление офферов GetBilet с координатами мест из pbilet (layout_json.seats).
 * Только точные совпадения сектор+ряд+место — без «сетки в bbox» и без zip по порядку в ряду.
 */

import {
  normalizeRowLabel,
  normalizeSeatToken,
  normalizeSectorLabel,
  strictSeatKey,
} from './ticketHallSectorNormalize.js';

/**
 * @param {{ sector: string, row: string, seat: string, xPct: number, yPct: number }[]} layoutSeats
 * @param {{ Sector?: string, Row?: string, SeatList?: string[] }[]} offers
 * @returns {{
 *   seats: { sector: string, row: string, seat: string, xPct: number, yPct: number }[],
 *   matched: number,
 *   totalSellable: number,
 *   unmatchedSamples: { sector: string, row: string, seat: string }[],
 * }}
 */
export function buildSellableSeatGeodesy(layoutSeats, offers) {
  const index = new Map();
  for (const s of layoutSeats) {
    const key = strictSeatKey(s.sector, s.row, s.seat);
    if (!index.has(key)) index.set(key, s);
  }

  const seen = new Set();
  const seats = [];
  let matched = 0;
  let totalSellable = 0;
  const unmatchedSamples = [];

  for (const offer of offers) {
    const sector = String(offer.Sector ?? '');
    const row = String(offer.Row ?? '');
    const list = Array.isArray(offer.SeatList) ? offer.SeatList.map(String) : [];
    for (const seat of list) {
      if (!seat.trim()) continue;
      totalSellable += 1;
      const key = strictSeatKey(sector, row, seat);
      const hit = index.get(key);
      if (!hit) {
        if (unmatchedSamples.length < 12) {
          unmatchedSamples.push({ sector, row, seat });
        }
        continue;
      }
      const dedupe = `${key}|${hit.xPct.toFixed(4)}|${hit.yPct.toFixed(4)}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      matched += 1;
      seats.push({
        sector: String(offer.Sector ?? hit.sector),
        row: String(offer.Row ?? hit.row),
        seat,
        xPct: hit.xPct,
        yPct: hit.yPct,
      });
    }
  }

  return { seats, matched, totalSellable, unmatchedSamples };
}

/**
 * Диагностика без изменения layout.
 * @param {unknown} layoutJson
 * @param {unknown[]} offers
 */
export function diagnoseOfferSeatGeodesy(layoutJson, offers) {
  const layout = layoutJson && typeof layoutJson === 'object' ? layoutJson : {};
  const baseSeats = Array.isArray(layout.seats) ? layout.seats : [];
  return buildSellableSeatGeodesy(baseSeats, offers);
}
