/**
 * Кэш Map(sector|row|seat) для full pilot — не парсить 80k seats из layout_json на каждый /map.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildLabeledSeatIndex } from './hallSeatGeodesyMatch.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SEATS_PATH = path.join(
  __dirname,
  '../data/luzhniki-geodesy/hand/bundle-luzhniki-stadium-pilot-seats.json',
);

/** @type {{ cacheKey: string | null, index: Map<string, unknown> | null, seatCount: number }} */
const state = { cacheKey: null, index: null, seatCount: 0 };

function resolveSeatsPath(layout) {
  const fromEnv = process.env.LUZHNIKI_PILOT_SEATS_JSON?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  const rel = layout?.luzhnikiPilotSeatsFile;
  if (typeof rel === 'string' && rel.trim()) {
    const candidates = [
      path.isAbsolute(rel) ? rel : path.resolve(process.cwd(), rel),
      path.resolve(__dirname, '..', rel),
      path.join(__dirname, '../data/luzhniki-geodesy/hand', path.basename(rel)),
    ];
    const hit = candidates.find((p) => fs.existsSync(p));
    if (hit) return hit;
  }
  if (fs.existsSync(DEFAULT_SEATS_PATH)) return DEFAULT_SEATS_PATH;
  return null;
}

export function loadSeatsArrayFromLayout(layout) {
  return loadSeatsArray(layout);
}

function loadSeatsArray(layout) {
  const inline = Array.isArray(layout?.seats) ? layout.seats : [];
  if (inline.length > 0 && inline.length <= 12000) return inline;

  const filePath = resolveSeatsPath(layout);
  if (!filePath) return inline.length > 0 ? inline : [];

  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return inline;
  }
}

/**
 * @param {Record<string, unknown>} layout
 * @param {string} [updatedAt]
 */
export function getLuzhnikiLabeledSeatIndex(layout, updatedAt = '') {
  const seats = loadSeatsArray(layout);
  const cacheKey = [
    updatedAt || layout?.luzhnikiPilotMergedAt || '',
    seats.length,
    resolveSeatsPath(layout) || 'inline',
  ].join('|');

  if (state.cacheKey === cacheKey && state.index) {
    return { index: state.index, seatCount: state.seatCount };
  }

  const index = buildLabeledSeatIndex(seats);
  state.cacheKey = cacheKey;
  state.index = index;
  state.seatCount = seats.length;
  return { index, seatCount: seats.length };
}

export function resetLuzhnikiSeatIndexCache() {
  state.cacheKey = null;
  state.index = null;
  state.seatCount = 0;
}

export const LUZHNIKI_PILOT_SEATS_REL_PATH =
  'data/luzhniki-geodesy/hand/bundle-luzhniki-stadium-pilot-seats.json';
