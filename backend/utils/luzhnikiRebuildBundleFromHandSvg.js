/**
 * Пересборка bundle-luzhniki-gray-cloud-labeled-seats.json из hand SVG (без редактора).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractLabeledSeatsFromSvgMarkup } from './luzhnikiExtractSeatsFromEnrichedSvg.js';
import { resetGrayCloudLabeledIndexCache } from './luzhnikiGrayCloudLabeledIndex.js';
import { normalizeLuzhnikiGrayCloudSvgSectorAttrs } from './luzhnikiNormalizeGrayCloudSvgSectors.js';
import {
  getCachedTicketsSectorLabelByNorm,
  resolveCanonicalSectorLabel,
} from './luzhnikiSectorDisplayLabel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
export const LUZHNIKI_HAND_SVG = path.join(
  REPO_ROOT,
  'backend/data/luzhniki-geodesy/hand/luzhniki-gray-cloud-enriched.svg',
);
export const LUZHNIKI_SEATS_BUNDLE = path.join(
  REPO_ROOT,
  'backend/data/luzhniki-geodesy/hand/bundle-luzhniki-gray-cloud-labeled-seats.json',
);

function countManualAttrsInSvg(svg) {
  return (String(svg).match(/data-source="manual/g) || []).length;
}

export function rebuildLuzhnikiBundleFromHandSvg() {
  if (!fs.existsSync(LUZHNIKI_HAND_SVG)) {
    return { ok: false, reason: 'no-hand-svg' };
  }
  let xml = fs.readFileSync(LUZHNIKI_HAND_SVG, 'utf8');
  const sectorNorm = normalizeLuzhnikiGrayCloudSvgSectorAttrs(xml);
  xml = sectorNorm.xml;

  const extracted = extractLabeledSeatsFromSvgMarkup(xml);
  const labeledCount = extracted.labeledCount ?? extracted.seats.length;
  if (labeledCount < 1) {
    return { ok: false, reason: 'no-labeled-seats', svgManual: countManualAttrsInSvg(xml) };
  }

  const byNorm = getCachedTicketsSectorLabelByNorm();
  const seats = extracted.seats.map((s) => ({
    ...s,
    sector: resolveCanonicalSectorLabel(s.sector, byNorm),
  }));

  const bundlePayload = {
    builtAt: new Date().toISOString(),
    mode: 'editor-svg-extract',
    source: 'rebuild-from-hand-svg',
    hallWidth: extracted.hallWidth,
    hallHeight: extracted.hallHeight,
    seatCount: seats.length,
    labeledSeatCount: labeledCount,
    seats,
  };

  fs.mkdirSync(path.dirname(LUZHNIKI_SEATS_BUNDLE), { recursive: true });
  fs.writeFileSync(LUZHNIKI_SEATS_BUNDLE, `${JSON.stringify(bundlePayload, null, 2)}\n`, 'utf8');
  resetGrayCloudLabeledIndexCache();

  return {
    ok: true,
    labeledSeats: labeledCount,
    svgManual: countManualAttrsInSvg(xml),
    builtAt: bundlePayload.builtAt,
  };
}

/**
 * @param {{ force?: boolean }} [opts]
 */
export function rebuildLuzhnikiBundleFromHandSvgIfNeeded(opts = {}) {
  const { force = false } = opts;
  if (!fs.existsSync(LUZHNIKI_HAND_SVG)) {
    return { ok: false, skipped: true, reason: 'no-hand-svg' };
  }

  const svgStat = fs.statSync(LUZHNIKI_HAND_SVG);
  const svg = fs.readFileSync(LUZHNIKI_HAND_SVG, 'utf8');
  const svgManual = countManualAttrsInSvg(svg);
  if (svgManual < 1 && !force) {
    return { ok: false, skipped: true, reason: 'no-manual-in-svg' };
  }

  let bundleMtime = 0;
  let bundleSeats = 0;
  if (fs.existsSync(LUZHNIKI_SEATS_BUNDLE)) {
    const bStat = fs.statSync(LUZHNIKI_SEATS_BUNDLE);
    bundleMtime = bStat.mtimeMs;
    try {
      const raw = JSON.parse(fs.readFileSync(LUZHNIKI_SEATS_BUNDLE, 'utf8'));
      bundleSeats = Array.isArray(raw?.seats) ? raw.seats.length : 0;
    } catch {
      bundleSeats = 0;
    }
  }

  const needs =
    force ||
    bundleSeats < 1 ||
    svgStat.mtimeMs > bundleMtime + 500 ||
    (svgManual > 0 && bundleSeats < Math.min(svgManual, 8));

  if (!needs) {
    return { ok: true, skipped: true, reason: 'fresh', bundleSeats, svgManual };
  }

  const result = rebuildLuzhnikiBundleFromHandSvg();
  return { ...result, skipped: false };
}
