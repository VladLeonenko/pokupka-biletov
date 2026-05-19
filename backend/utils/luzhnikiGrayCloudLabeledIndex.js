/**
 * Sellable из bundle редактора (hand/bundle-luzhniki-gray-cloud-labeled-seats.json).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildLabeledSeatIndex, collectIndexSeatsForRow } from './hallSeatGeodesyMatch.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_BUNDLE = path.join(
  __dirname,
  '../data/luzhniki-geodesy/hand/bundle-luzhniki-gray-cloud-labeled-seats.json',
);

/** @type {{ mtime: number, index: Map<string, { sector: string, row: string, seat: string, xPct: number, yPct: number }> | null, seatCount: number, bundleMode: string | null }} */
const state = { mtime: 0, index: null, seatCount: 0, bundleMode: null };

/** Автоген ~75k из fieldGrid — не для checkout; только editor-svg-extract после hover.html. */
export function isEditorLabeledBundle(raw) {
  if (!raw || typeof raw !== 'object') return false;
  const mode = String(raw.mode ?? '').trim();
  if (mode === 'editor-svg-extract') return true;
  if (/fieldgrid|sector-axes|canonical-overlay/i.test(mode)) return false;
  const n = Array.isArray(raw.seats) ? raw.seats.length : 0;
  if (n > 8000) return false;
  return n > 0;
}

function allowAutoGrayBundle() {
  const v = process.env.LUZHNIKI_USE_AUTO_GRAY_BUNDLE?.trim();
  return v === '1' || v === 'true';
}

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

/** По умолчанию only, если не выключено явно (LUZHNIKI_SELLABLE_GRAY_CLOUD_ONLY=0). */
export function grayCloudLabeledOnlyMode() {
  const v = process.env.LUZHNIKI_SELLABLE_GRAY_CLOUD_ONLY?.trim();
  if (v === '0' || v === 'false') return false;
  if (v === '1' || v === 'true') return true;
  return true;
}

/** API seat 28..31 → N-я точка ряда в bundle (места 1..N из редактора). */
export function useGrayCloudRowZip() {
  const v = process.env.LUZHNIKI_GRAY_CLOUD_ROW_ZIP?.trim();
  if (v === '0' || v === 'false') return false;
  return true;
}

/** Ряд есть в bundle редактора — не подменять cloudRowSeat/radial. */
export function editorBundleHasRow(index, sector, row) {
  if (!index?.size) return false;
  return collectIndexSeatsForRow(index, sector, row).length > 0;
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
    state.bundleMode = String(raw?.mode ?? '').trim() || null;

    if (!isEditorLabeledBundle(raw) && !allowAutoGrayBundle()) {
      state.index = new Map();
      state.mtime = mtime;
      state.seatCount = 0;
      return state.index;
    }

    const seats = Array.isArray(raw?.seats) ? raw.seats : Array.isArray(raw) ? raw : [];
    const filtered = seats.filter(
      (s) =>
        s?.sector &&
        s?.row != null &&
        s?.seat != null &&
        Number.isFinite(Number(s.xPct)) &&
        Number.isFinite(Number(s.yPct)),
    );
    state.index = buildLabeledSeatIndex(filtered);
    state.mtime = mtime;
    state.seatCount = filtered.length;
    return state.index;
  } catch {
    return null;
  }
}

export function getGrayCloudBundleMode() {
  getCachedGrayCloudLabeledIndex();
  return state.bundleMode;
}

export function getGrayCloudLabeledSeatCount() {
  getCachedGrayCloudLabeledIndex();
  return state.seatCount;
}

export function resetGrayCloudLabeledIndexCache() {
  state.mtime = 0;
  state.index = null;
  state.seatCount = 0;
  state.bundleMode = null;
}
