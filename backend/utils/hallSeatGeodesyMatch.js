/**
 * Сопоставление офферов GetBilet с координатами из layout_json.seats (pbilet tickets).
 * Только подписанные сектор+ряд+место — без интерполяции по облаку точек (овал ломает боковые сектора).
 */

import {
  normalizeRowLabel,
  normalizeSeatToken,
  normalizeSectorLabel,
  strictSeatKey,
} from './ticketHallSectorNormalize.js';

function normalizeSeatNumber(value) {
  const raw = normalizeSeatToken(value);
  const n = Number.parseInt(raw.replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? String(n) : raw;
}

function normalizeRowNumber(value) {
  const raw = normalizeRowLabel(value);
  const n = Number.parseInt(raw.replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? String(n) : raw;
}

/** Ключи для поиска: strict + числовые варианты места/ряда («08» = «8»). */
export function labeledSeatLookupKeys(sector, row, seat) {
  const keys = new Set();
  const sk = strictSeatKey(sector, row, seat);
  keys.add(sk);
  const parts = sk.split('|');
  if (parts.length === 3) {
    const [sec, r, st] = parts;
    keys.add(`${sec}|${normalizeRowNumber(row)}|${normalizeSeatNumber(seat)}`);
    keys.add(`${sec}|${r}|${normalizeSeatNumber(seat)}`);
    keys.add(`${sec}|${normalizeRowNumber(row)}|${st}`);
  }
  return keys;
}

/**
 * @param {{ sector: string, row: string, seat: string, xPct: number, yPct: number }[]} layoutSeats
 */
export function buildLabeledSeatIndex(layoutSeats) {
  const byKey = new Map();
  for (const s of layoutSeats) {
    if (!Number.isFinite(s.xPct) || !Number.isFinite(s.yPct)) continue;
    for (const key of labeledSeatLookupKeys(s.sector, s.row, s.seat)) {
      if (!byKey.has(key)) byKey.set(key, s);
    }
  }
  return byKey;
}

/**
 * @param {Map<string, { sector: string, row: string, seat: string, xPct: number, yPct: number }>} index
 */
export function lookupLabeledSeat(index, sector, row, seat) {
  for (const key of labeledSeatLookupKeys(sector, row, seat)) {
    const hit = index.get(key);
    if (hit) return hit;
  }
  return null;
}

/**
 * @param {{ sector: string, row: string, seat: string, xPct: number, yPct: number }[]} layoutSeats
 * @param {{ Sector?: string, Row?: string, SeatList?: string[] }[]} offers
 */
export function buildSellableSeatGeodesy(layoutSeats, offers) {
  const index = buildLabeledSeatIndex(layoutSeats);

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
      const hit = lookupLabeledSeat(index, sector, row, seat);
      if (!hit) {
        if (unmatchedSamples.length < 24) {
          unmatchedSamples.push({ sector, row, seat });
        }
        continue;
      }
      const dedupe = `${strictSeatKey(sector, row, seat)}|${hit.xPct.toFixed(4)}|${hit.yPct.toFixed(4)}`;
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

export function diagnoseOfferSeatGeodesy(layoutJson, offers) {
  const layout = layoutJson && typeof layoutJson === 'object' ? layoutJson : {};
  const baseSeats = Array.isArray(layout.seats) ? layout.seats : [];
  return buildSellableSeatGeodesy(baseSeats, offers);
}
