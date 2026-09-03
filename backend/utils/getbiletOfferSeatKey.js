/**
 * Ключ сеанса + места для сравнения своих офферов с чужими.
 */
import { strictSeatKey } from './ticketHallSectorNormalize.js';

/**
 * @param {Record<string, unknown>} row
 */
export function offerEventDateTime(row) {
  if (!row || typeof row !== 'object') return '';
  const raw = row.EventDateTime ?? row.eventDateTime ?? row.BeginDateTime ?? row.beginDateTime;
  return raw == null ? '' : String(raw).trim();
}

/**
 * @param {Record<string, unknown>} row
 * @returns {string[]}
 */
export function offerSeatTokens(row) {
  if (!row || typeof row !== 'object') return [];
  const sl = row.SeatList ?? row.seatList ?? row.Seats;
  if (Array.isArray(sl) && sl.length > 0) {
    return sl.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof sl === 'string' && sl.trim()) {
    return sl.split(/[,\s]+/).filter(Boolean);
  }
  const one = row.Seat ?? row.seat;
  if (one != null && String(one).trim()) return [String(one).trim()];
  return [];
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} seat
 */
export function competitorSeatKey(row, seat) {
  const dt = offerEventDateTime(row);
  const sector = row.Sector ?? row.sector ?? '';
  const rowLabel = row.Row ?? row.row ?? '';
  return `${dt}|${strictSeatKey(sector, rowLabel, seat)}`;
}

/**
 * @param {Record<string, unknown>} row
 * @returns {string[]}
 */
export function competitorSeatKeysForRow(row) {
  return offerSeatTokens(row).map((seat) => competitorSeatKey(row, seat));
}
