/**
 * Sellable из bundle редактора (hand/bundle-luzhniki-gray-cloud-labeled-seats.json).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import { buildLabeledSeatIndex, collectIndexSeatsForRow } from './hallSeatGeodesyMatch.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_BUNDLE = path.join(
  __dirname,
  '../data/luzhniki-geodesy/hand/bundle-luzhniki-gray-cloud-labeled-seats.json',
);

/** @type {{ mtime: number, index: Map<string, { sector: string, row: string, seat: string, xPct: number, yPct: number }> | null, seatCount: number, bundleMode: string | null }} */
const state = { mtime: 0, index: null, seatCount: 0, bundleMode: null };
/** @type {Promise<Map<string, { sector: string, row: string, seat: string, xPct: number, yPct: number }> | null> | null} */
let warmupPromise = null;

const MAX_EDITOR_BUNDLE_SEATS = 120000;
const MIN_STRICT_ONLY_BUNDLE_SEATS = 4000;

function manualEditorSeats(seats) {
  return (seats || []).filter((s) => String(s?.geodesySource ?? '').includes('manual'));
}

/** Автоген ~75k fieldGrid — не editor bundle; только manual из hover.html. */
export function isEditorLabeledBundle(raw) {
  if (!raw || typeof raw !== 'object') return false;
  const mode = String(raw.mode ?? '').trim();
  const seats = Array.isArray(raw.seats) ? raw.seats : [];
  if (mode === 'editor-svg-extract') {
    const manual = manualEditorSeats(seats);
    if (manual.length > 0 && manual.length <= MAX_EDITOR_BUNDLE_SEATS) return true;
    // Worker уже отфильтровал fieldGrid; geodesySource мог быть снят при clone.
    return seats.length > 0 && seats.length <= MAX_EDITOR_BUNDLE_SEATS;
  }
  if (/fieldgrid|sector-axes|canonical-overlay/i.test(mode)) return false;
  if (seats.length > MAX_EDITOR_BUNDLE_SEATS) return false;
  return seats.length > 0;
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

export function getGrayCloudLabeledBundleVersion() {
  const filePath = resolveBundlePath();
  if (!filePath) return 'missing';
  try {
    const st = fs.statSync(filePath);
    return `${Math.round(st.mtimeMs)}:${st.size}`;
  } catch {
    return 'missing';
  }
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

/**
 * ONLY без pbilet-fallback — только если bundle большой ручной слой (не 1 ряд, не 75k fieldGrid).
 */
export function grayCloudLabeledStrictOnlyMode() {
  if (!grayCloudLabeledOnlyMode()) return false;
  const n = getGrayCloudLabeledSeatCount();
  return n >= MIN_STRICT_ONLY_BUNDLE_SEATS && n <= MAX_EDITOR_BUNDLE_SEATS;
}

/**
 * Частичная правка в hover (сотни мест, не весь стадион).
 * По умолчанию sellable только с coords из bundle — без pbilet/cloud «в никуда».
 * LUZHNIKI_PARTIAL_MANUAL_ONLY_SELLABLE=0 — вернуть cloud для неразмеченных рядов.
 */
export function partialManualEditorBundleActive() {
  const v = process.env.LUZHNIKI_PARTIAL_MANUAL_ONLY_SELLABLE?.trim();
  if (v === '0' || v === 'false') return false;
  if (v === '1' || v === 'true') return true;
  const n = getGrayCloudLabeledSeatCount();
  return n > 0 && n < MIN_STRICT_ONLY_BUNDLE_SEATS;
}

export function useGrayCloudRowZipForBundle() {
  if (!useGrayCloudRowZip()) return false;
  return getGrayCloudLabeledSeatCount() > 0;
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

export function isGrayCloudLabeledIndexReady() {
  const filePath = resolveBundlePath();
  if (!filePath) return false;
  try {
    return Boolean(state.index && state.mtime === fs.statSync(filePath).mtimeMs);
  } catch {
    return false;
  }
}

/** 14MB JSON в worker — event loop свободен, /map не стоит 15с. */
export function warmupGrayCloudLabeledIndex() {
  if (isGrayCloudLabeledIndexReady()) {
    return Promise.resolve(state.index);
  }
  if (warmupPromise) return warmupPromise;
  const filePath = resolveBundlePath();
  if (!filePath) return Promise.resolve(null);
  let mtime = 0;
  try {
    mtime = fs.statSync(filePath).mtimeMs;
  } catch {
    return Promise.resolve(null);
  }
  const started = Date.now();
  const workerPath = fileURLToPath(new URL('./luzhnikiGrayCloudIndexWorker.js', import.meta.url));
  warmupPromise = new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const worker = new Worker(workerPath, { workerData: { filePath } });
    worker.once('message', (msg) => {
      if (!msg?.ok) {
        console.warn('[luzhniki] gray-cloud worker', msg?.error);
        finish(null);
        return;
      }
      const raw = { mode: msg.bundleMode, seats: msg.seats };
      if (!isEditorLabeledBundle(raw) && !allowAutoGrayBundle()) {
        console.warn(
          `[luzhniki] gray-cloud bundle rejected mode=${msg.bundleMode || 'null'} seats=${msg.seats?.length ?? 0}`,
        );
        state.index = new Map();
        state.mtime = mtime;
        state.seatCount = 0;
        state.bundleMode = msg.bundleMode;
        finish(state.index);
        return;
      }
      state.bundleMode = msg.bundleMode;
      state.index = buildLabeledSeatIndex(msg.seats);
      state.mtime = mtime;
      state.seatCount = msg.seats.length;
      console.log(`[luzhniki] gray-cloud index warmup ${Date.now() - started}ms seats=${state.seatCount}`);
      finish(state.index);
    });
    worker.once('error', (err) => {
      console.warn('[luzhniki] gray-cloud worker error', err?.message || err);
      finish(null);
    });
    worker.once('exit', (code) => {
      if (code !== 0) finish(null);
    });
  }).finally(() => {
    warmupPromise = null;
  });
  return warmupPromise;
}

/**
 * Только память. Парс 14MB — через warmupGrayCloudLabeledIndex (worker).
 * @returns {Map<string, { sector: string, row: string, seat: string, xPct: number, yPct: number }> | null}
 */
export function getCachedGrayCloudLabeledIndex() {
  if (isGrayCloudLabeledIndexReady()) return state.index;
  warmupGrayCloudLabeledIndex();
  return state.index && isGrayCloudLabeledIndexReady() ? state.index : null;
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
  warmupPromise = null;
}
