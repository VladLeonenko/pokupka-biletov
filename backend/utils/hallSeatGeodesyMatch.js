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
/** Последняя запись по sector|row|seat побеждает (редактор пересохранял то же место). */
export function dedupeLabeledSeatsByKey(seats) {
  const byKey = new Map();
  for (const s of seats) {
    if (!Number.isFinite(s.xPct) || !Number.isFinite(s.yPct)) continue;
    byKey.set(strictSeatKey(s.sector, s.row, s.seat), s);
  }
  return [...byKey.values()];
}

export function buildLabeledSeatIndex(layoutSeats) {
  const byKey = new Map();
  for (const s of layoutSeats) {
    if (!Number.isFinite(s.xPct) || !Number.isFinite(s.yPct)) continue;
    for (const key of labeledSeatLookupKeys(s.sector, s.row, s.seat)) {
      byKey.set(key, s);
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

/** Все уникальные точки индекса в секторе+ряду (для «ряд из редактора»). */
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

function seatNumForSort(value) {
  const n = Number.parseInt(normalizeSeatNumber(value).replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

/** Точки ряда в bundle: по возрастанию номера места (как после «Применить ряд» 1..N). */
export function sortLabeledRowSeatsBySeat(dots) {
  return [...dots].sort((a, b) => {
    const d = seatNumForSort(a.seat) - seatNumForSort(b.seat);
    if (d !== 0) return d;
    return a.xPct - b.xPct || a.yPct - b.yPct;
  });
}

function sortOfferSeatTokens(seatList) {
  return [...seatList]
    .map(String)
    .filter((s) => s.trim())
    .sort((a, b) => {
      const d = seatNumForSort(a) - seatNumForSort(b);
      if (d !== 0) return d;
      return a.localeCompare(b, 'ru');
    });
}

/**
 * Sellable GetBilet (места 20..31) → координаты ряда из редактора (места 1..N по порядку).
 * @returns {Map<string, { sector: string, row: string, seat: string, xPct: number, yPct: number }>}
 */
function rowSeatNumbersAreLowConsecutive(rowDots) {
  if (!rowDots.length) return false;
  const nums = rowDots.map((d) => seatNumForSort(d.seat)).sort((a, b) => a - b);
  if (nums[0] !== 1) return false;
  for (let i = 1; i < nums.length; i += 1) {
    if (nums[i] !== nums[i - 1] + 1) return false;
  }
  return true;
}

/**
 * Sellable 28–31 → bundle 1..N по порядку вдоль ряда.
 * Если в bundle уже есть 7,8,9… — только exact lookup, без подмены на «место 1».
 */
export function buildGrayCloudRowZipMap(index, sector, row, seatList) {
  const offers = sortOfferSeatTokens(seatList);
  const map = new Map();
  for (const seat of offers) {
    const hit = lookupLabeledSeat(index, sector, row, seat);
    if (hit) map.set(String(seat).trim(), hit);
  }
  const missing = offers.filter((s) => !map.has(String(s).trim()));
  if (!missing.length) return map;

  const rowDots = sortLabeledRowSeatsBySeat(collectIndexSeatsForRow(index, sector, row));
  if (!rowDots.length || !rowSeatNumbersAreLowConsecutive(rowDots)) {
    return map.size ? map : null;
  }

  const n = Math.min(rowDots.length, missing.length);
  for (let i = 0; i < n; i += 1) {
    map.set(missing[i], rowDots[i]);
  }
  return map.size ? map : null;
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
