/**
 * Сопоставление офферов GetBilet с координатами из layout_json.seats (pbilet tickets).
 * Только подписанные сектор+ряд+место — без интерполяции по облаку точек (овал ломает боковые сектора).
 */

import {
  luzhnikiSectorLookupNorms,
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

function seatKeysForSectorNorm(sectorNorm, row, seat) {
  const keys = new Set();
  const r = normalizeRowLabel(row);
  const st = normalizeSeatToken(seat);
  keys.add(`${sectorNorm}|${r}|${st}`);
  keys.add(`${sectorNorm}|${normalizeRowNumber(row)}|${normalizeSeatNumber(seat)}`);
  keys.add(`${sectorNorm}|${r}|${normalizeSeatNumber(seat)}`);
  keys.add(`${sectorNorm}|${normalizeRowNumber(row)}|${st}`);
  return keys;
}

/** Ключи для поиска: strict + числовые варианты + алиасы Лужников (vipc138 ↔ c138). */
export function labeledSeatLookupKeys(sector, row, seat) {
  const keys = new Set();
  const norms = new Set([
    normalizeSectorLabel(sector),
    ...luzhnikiSectorLookupNorms(sector),
  ]);
  for (const norm of norms) {
    for (const k of seatKeysForSectorNorm(norm, row, seat)) keys.add(k);
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

function seatSortKey(a, b) {
  const na = Number.parseInt(String(a).replace(/\D/g, ''), 10);
  const nb = Number.parseInt(String(b).replace(/\D/g, ''), 10);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return String(a).localeCompare(String(b), 'ru', { numeric: true });
}

/** Все точки индекса в данном секторе+ряду (уникальные по координатам). */
export function collectIndexSeatsForRow(index, sector, row) {
  const norms = new Set([
    normalizeSectorLabel(sector),
    ...luzhnikiSectorLookupNorms(sector),
  ]);
  const wantRow = normalizeRowNumber(row);
  const out = [];
  const seen = new Set();
  for (const val of index.values()) {
    if (!norms.has(normalizeSectorLabel(val.sector))) continue;
    if (normalizeRowNumber(val.row) !== wantRow) continue;
    const sig = `${val.xPct.toFixed(4)}|${val.yPct.toFixed(4)}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(val);
  }
  return out;
}

/**
 * Точное sector+row+seat, иначе i-е место в ряду по X ↔ i-е в SeatList (если ошибочно пронумеровали 1..N).
 * @param {Map<string, { sector: string, row: string, seat: string, xPct: number, yPct: number }>} index
 * @param {string[]} [offerSeatList]
 */
export function lookupSeatByRowPositionZip(index, sector, row, seat, offerSeatList) {
  const exact = lookupLabeledSeat(index, sector, row, seat);
  if (exact) return exact;
  if (!index?.size || !Array.isArray(offerSeatList) || offerSeatList.length < 1) return null;

  const rowDots = collectIndexSeatsForRow(index, sector, row);
  if (rowDots.length < 1) return null;
  rowDots.sort((a, b) => a.xPct - b.xPct || a.yPct - b.yPct);

  const sortedApi = [...offerSeatList].map(String).filter(Boolean).sort(seatSortKey);
  const seatNorm = normalizeSeatNumber(seat);
  let idx = sortedApi.findIndex((s) => normalizeSeatNumber(s) === seatNorm);
  if (idx < 0) {
    idx = sortedApi.findIndex((s) => normalizeSeatToken(s) === normalizeSeatToken(seat));
  }
  if (idx < 0 || idx >= rowDots.length) return null;

  const dot = rowDots[idx];
  return {
    sector: dot.sector,
    row: dot.row,
    seat: String(seat),
    xPct: dot.xPct,
    yPct: dot.yPct,
  };
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
        geodesySource: 'strict',
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
