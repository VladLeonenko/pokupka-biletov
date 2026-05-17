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
