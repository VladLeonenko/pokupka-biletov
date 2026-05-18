/**
 * O(1) координаты sellable из precomputed облака (тот же индекс, что enrich SVG).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildLabeledSeatIndex } from './hallSeatGeodesyMatch.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_BUNDLE = path.join(
  __dirname,
  '../data/luzhniki-geodesy/hand/bundle-luzhniki-gray-cloud-labeled-seats.json',
);

/** @type {{ mtime: number, index: Map<string, { sector: string, row: string, seat: string, xPct: number, yPct: number }> | null, seatCount: number }} */
const state = { mtime: 0, index: null, seatCount: 0 };

function resolveBundlePath() {
  const fromEnv = process.env.LUZHNIKI_GRAY_CLOUD_LABELED_SEATS_JSON?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  if (fs.existsSync(DEFAULT_BUNDLE)) return DEFAULT_BUNDLE;
  return null;
}

export function useGrayCloudLabeledSellable() {
  const v = process.env.LUZHNIKI_SELLABLE_GRAY_CLOUD_LABELED?.trim();
  if (v === '0' || v === 'false') return false;
  return Boolean(resolveBundlePath());
}

export function grayCloudLabeledOnlyMode() {
  const v = process.env.LUZHNIKI_SELLABLE_GRAY_CLOUD_ONLY?.trim();
  return v === '1' || v === 'true';
}

/**
 * @returns {Map<string, { sector: string, row: string, seat: string, xPct: number, yPct: number }> | null}
 */
export function getCachedGrayCloudLabeledIndex() {
  const filePath = resolveBundlePath();
  if (!filePath) return null;

  let mtime = 0;
  try {
    mtime = fs.statSync(filePath).mtimeMs;
  } catch {
    return null;
  }

  if (state.index && state.mtime === mtime) return state.index;

  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const seats = Array.isArray(raw?.seats) ? raw.seats : Array.isArray(raw) ? raw : [];
    state.index = buildLabeledSeatIndex(
      seats.filter(
        (s) =>
          s?.sector &&
          s?.row != null &&
          s?.seat != null &&
          Number.isFinite(Number(s.xPct)) &&
          Number.isFinite(Number(s.yPct)),
      ),
    );
    state.mtime = mtime;
    state.seatCount = seats.length;
    return state.index;
  } catch {
    return null;
  }
}

export function getGrayCloudLabeledSeatCount() {
  getCachedGrayCloudLabeledIndex();
  return state.seatCount;
}

export function resetGrayCloudLabeledIndexCache() {
  state.mtime = 0;
  state.index = null;
  state.seatCount = 0;
}
