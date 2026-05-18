/**
 * Поиск координат layout.seats по офферу — как backend/utils/hallSeatGeodesyMatch.js
 */
import type { SvgNativeSeat } from './svgNativeSeatLayout';
import {
  luzhnikiSectorLookupNorms,
  normalizeRowLabel,
  normalizeSeatToken,
  normalizeSectorLabel,
} from './ticketHallSectorNormalize';

function normalizeSeatNumber(value: unknown): string {
  const raw = normalizeSeatToken(value);
  const n = Number.parseInt(raw.replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? String(n) : raw;
}

function normalizeRowNumber(value: unknown): string {
  const raw = normalizeRowLabel(value);
  const n = Number.parseInt(raw.replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? String(n) : raw;
}

function seatKeysForSectorNorm(sectorNorm: string, row: unknown, seat: unknown): string[] {
  const keys = new Set<string>();
  const r = normalizeRowLabel(row);
  const st = normalizeSeatToken(seat);
  keys.add(`${sectorNorm}|${r}|${st}`);
  keys.add(`${sectorNorm}|${normalizeRowNumber(row)}|${normalizeSeatNumber(seat)}`);
  keys.add(`${sectorNorm}|${r}|${normalizeSeatNumber(seat)}`);
  keys.add(`${sectorNorm}|${normalizeRowNumber(row)}|${st}`);
  return [...keys];
}

export function labeledSeatLookupKeys(sector: unknown, row: unknown, seat: unknown): string[] {
  const keys = new Set<string>();
  const norms = new Set([
    normalizeSectorLabel(sector),
    ...luzhnikiSectorLookupNorms(sector),
  ]);
  for (const norm of norms) {
    for (const k of seatKeysForSectorNorm(norm, row, seat)) keys.add(k);
  }
  return [...keys];
}

export function buildLabeledSeatIndex(layoutSeats: SvgNativeSeat[]): Map<string, SvgNativeSeat> {
  const byKey = new Map<string, SvgNativeSeat>();
  for (const s of layoutSeats) {
    if (!Number.isFinite(s.xPct) || !Number.isFinite(s.yPct)) continue;
    for (const key of labeledSeatLookupKeys(s.sector, s.row, s.seat)) {
      if (!byKey.has(key)) byKey.set(key, s);
    }
  }
  return byKey;
}

export function lookupLabeledSeat(
  index: Map<string, SvgNativeSeat>,
  sector: unknown,
  row: unknown,
  seat: unknown,
): SvgNativeSeat | null {
  for (const key of labeledSeatLookupKeys(sector, row, seat)) {
    const hit = index.get(key);
    if (hit) return hit;
  }
  return null;
}

function seatSortKey(a: string, b: string): number {
  const na = Number.parseInt(a.replace(/\D/g, ''), 10);
  const nb = Number.parseInt(b.replace(/\D/g, ''), 10);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return a.localeCompare(b, 'ru', { numeric: true });
}

export function collectIndexSeatsForRow(
  index: Map<string, SvgNativeSeat>,
  sector: unknown,
  row: unknown,
): SvgNativeSeat[] {
  const norms = new Set([
    normalizeSectorLabel(sector),
    ...luzhnikiSectorLookupNorms(sector),
  ]);
  const wantRow = normalizeRowNumber(row);
  const out: SvgNativeSeat[] = [];
  const seen = new Set<string>();
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

/** i-я точка ряда по X ↔ i-е место в SeatList (если в SVG места 1..N, в оффере 20..). */
export function lookupSeatByRowPositionZip(
  index: Map<string, SvgNativeSeat>,
  sector: unknown,
  row: unknown,
  seat: unknown,
  offerSeatList: string[],
): SvgNativeSeat | null {
  const exact = lookupLabeledSeat(index, sector, row, seat);
  if (exact) return exact;
  if (!offerSeatList.length) return null;

  const rowDots = collectIndexSeatsForRow(index, sector, row);
  if (!rowDots.length) return null;
  rowDots.sort((a, b) => a.xPct - b.xPct || a.yPct - b.yPct);

  const sortedApi = [...offerSeatList].filter(Boolean).sort(seatSortKey);
  const seatNorm = normalizeSeatNumber(seat);
  let idx = sortedApi.findIndex((s) => normalizeSeatNumber(s) === seatNorm);
  if (idx < 0) idx = sortedApi.findIndex((s) => normalizeSeatToken(s) === normalizeSeatToken(seat));
  if (idx < 0 || idx >= rowDots.length) return null;

  const dot = rowDots[idx];
  return { ...dot, seat: String(seat) };
}
