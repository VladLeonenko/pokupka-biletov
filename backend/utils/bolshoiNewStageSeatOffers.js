/**
 * Новая сцена: сид кладёт один оффер «Партер (середина)» с SeatList ['1'…'8']
 * (это потолок количества для предзаказа зоны, не номера мест).
 * Для seat-checkout раскладываем его в ряды 1–8 с реальными номерами мест схемы.
 * Историческая сцена сюда не попадает: у неё несколько секторов.
 */
import {
  BOLSHOI_NEW_STAGE_PARTER_LABEL,
  isBolshoiNewStageParterSellableRow,
  remapBolshoiNewStageParterSeatsToMid,
} from './bolshoiNewStageParterCheckout.js';

/** @param {unknown[]} rows */
export function offersAreNewStageZonePlaceholders(rows) {
  if (!Array.isArray(rows) || rows.length < 1) return false;
  /** @type {Map<string, Set<string>>} */
  const rowsByDt = new Map();
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') return false;
    const off = /** @type {Record<string, unknown>} */ (raw);
    if (String(off.Sector || '').trim() !== BOLSHOI_NEW_STAGE_PARTER_LABEL) return false;
    const dt = String(off.EventDateTime || '');
    const set = rowsByDt.get(dt) ?? new Set();
    set.add(String(off.Row || ''));
    rowsByDt.set(dt, set);
  }
  for (const set of rowsByDt.values()) {
    if (set.size > 1) return false;
  }
  return true;
}

/**
 * @param {Record<string, unknown>[]} offers
 * @param {unknown[]} seats
 */
export function expandBolshoiNewStageZoneOffers(offers, seats) {
  const remapped = remapBolshoiNewStageParterSeatsToMid(seats);
  /** @type {Map<string, string[]>} */
  const byRow = new Map();
  for (const raw of Array.isArray(remapped) ? remapped : []) {
    if (!raw || typeof raw !== 'object') continue;
    const s = /** @type {Record<string, unknown>} */ (raw);
    if (String(s.sector || '').trim() !== BOLSHOI_NEW_STAGE_PARTER_LABEL) continue;
    if (!isBolshoiNewStageParterSellableRow(s.row)) continue;
    const row = String(s.row ?? '').trim();
    const seat = String(s.seat ?? '').trim();
    if (!row || !seat) continue;
    const list = byRow.get(row) ?? [];
    list.push(seat);
    byRow.set(row, list);
  }
  if (byRow.size < 1) return offers;

  /** @type {Map<string, Record<string, unknown>>} */
  const protoByDt = new Map();
  for (const off of offers) {
    const dt = String(off.EventDateTime || '');
    if (!protoByDt.has(dt)) protoByDt.set(dt, off);
  }

  /** @type {Record<string, unknown>[]} */
  const next = [];
  for (const [dt, proto] of protoByDt) {
    const day = String(dt).slice(0, 10) || 'day';
    const baseId = String(proto.Id || `parter-${day}`);
    for (const [row, seatList] of byRow) {
      const unique = [...new Set(seatList)];
      next.push({
        ...proto,
        Id: `${baseId}-r${row}`.replace(/\s+/g, '_'),
        Sector: BOLSHOI_NEW_STAGE_PARTER_LABEL,
        Row: row,
        SeatList: unique,
        MaxQuantity: unique.length,
        LocalOffer: true,
        EventDateTime: proto.EventDateTime,
      });
    }
  }
  return next.length ? next : offers;
}
