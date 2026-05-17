/**
 * Эталон координат с прода: layout_json.seats sidecar (как /map superfinal).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadSeatsArrayFromLayout } from './luzhnikiSeatIndexCache.js';
import { LUZHNIKI_PILOT_SEATS_REL_PATH } from './luzhnikiSeatIndexCache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const DEFAULT_PILOT_SEATS = path.join(
  repoRoot,
  'backend/data/luzhniki-geodesy/hand/bundle-luzhniki-stadium-pilot-seats.json',
);

function normalizeSeatRecord(item) {
  if (!item || typeof item !== 'object') return null;
  const sector = String(item.sector ?? item.Sector ?? '').trim();
  const row = String(item.row ?? item.Row ?? '').trim();
  const seat = String(item.seat ?? item.Seat ?? item.place ?? '').trim();
  const xPct = Number(item.xPct ?? item.x_pct);
  const yPct = Number(item.yPct ?? item.y_pct);
  if (!sector || !row || row === '—' || !seat || !Number.isFinite(xPct) || !Number.isFinite(yPct)) {
    return null;
  }
  return {
    sector,
    row,
    seat,
    xPct,
    yPct,
    geodesySource: item.geodesySource ?? 'layout',
  };
}

/**
 * Primary source: bundle-luzhniki-stadium-pilot-seats.json (42k+, как на biletvsem.com/map).
 */
export function loadProdLayoutSeats(options = {}) {
  const hallWidth = Number(options.hallWidth) > 0 ? Number(options.hallWidth) : 11413;
  const hallHeight = Number(options.hallHeight) > 0 ? Number(options.hallHeight) : 9676;

  const envPath = process.env.LUZHNIKI_PROD_LAYOUT_SEATS_JSON?.trim();
  const filePath =
    (envPath && fs.existsSync(envPath) ? envPath : null) ||
    (fs.existsSync(DEFAULT_PILOT_SEATS) ? DEFAULT_PILOT_SEATS : null);

  let raw = [];
  if (filePath) {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    raw = Array.isArray(parsed) ? parsed : [];
  } else {
    raw = loadSeatsArrayFromLayout({
      luzhnikiPilotSeatsFile: LUZHNIKI_PILOT_SEATS_REL_PATH,
    });
  }

  const seats = [];
  const seen = new Set();
  for (const item of raw) {
    const s = normalizeSeatRecord(item);
    if (!s) continue;
    const key = `${s.sector}\0${s.row}\0${s.seat}`;
    if (seen.has(key)) continue;
    seen.add(key);
    seats.push(s);
  }

  return {
    seats,
    hallWidth,
    hallHeight,
    sourceFile: filePath ? path.basename(filePath) : 'layout',
    seatCount: seats.length,
  };
}
