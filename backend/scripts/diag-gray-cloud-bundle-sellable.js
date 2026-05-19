#!/usr/bin/env node
/**
 * Сверка bundle редактора vs sellable на /map.
 *   cd backend && node scripts/diag-gray-cloud-bundle-sellable.js a101 34
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getPublicOffersForRepertoire } from '../services/getbiletOffersPublic.js';
import {
  adaptLuzhnikiStageMapForLiveOffers,
  loadLuzhnikiFootballStageMapRow,
} from '../services/luzhnikiFootballStageMap.js';
import {
  getCachedGrayCloudLabeledIndex,
  getGrayCloudBundleMode,
  isEditorLabeledBundle,
} from '../utils/luzhnikiGrayCloudLabeledIndex.js';
import { lookupLabeledSeat } from '../utils/hallSeatGeodesyMatch.js';
import { normalizeSectorLabel } from '../utils/ticketHallSectorNormalize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../..');
const REPERTOIRE = process.env.GETBILET_LUZHNIKI_REPERTOIRE_ID?.trim() || '6a05d17b46a4d000309ecf4e';

const sectorArg = process.argv[2] || 'a101';
const rowArg = process.argv[3] || '';

async function main() {
  const idx = getCachedGrayCloudLabeledIndex();
  const bundlePath =
    process.env.LUZHNIKI_GRAY_CLOUD_LABELED_SEATS_JSON ||
    path.join(REPO, 'backend/data/luzhniki-geodesy/hand/bundle-luzhniki-gray-cloud-labeled-seats.json');

  let raw = null;
  try {
    if (fs.existsSync(bundlePath)) raw = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
  } catch {
    /* noop */
  }
  console.log(
    'bundle:',
    bundlePath,
    'exists:',
    fs.existsSync(bundlePath),
    'fileMode:',
    raw?.mode ?? null,
    'fileSeats:',
    Array.isArray(raw?.seats) ? raw.seats.length : 0,
    'indexUsed:',
    idx?.size ?? 0,
    'editorBundleAccepted:',
    raw ? isEditorLabeledBundle(raw) : false,
    'indexBundleMode:',
    getGrayCloudBundleMode(),
  );

  const row = await loadLuzhnikiFootballStageMapRow();
  const { payload } = await getPublicOffersForRepertoire(REPERTOIRE);
  const offers = Array.isArray(payload?.ResultData) ? payload.ResultData : [];
  const adapted = adaptLuzhnikiStageMapForLiveOffers(row, offers);
  let layout = adapted?.layout_json;
  if (typeof layout === 'string') layout = JSON.parse(layout);

  const geo = layout?.offerSeatGeodesy ?? {};
  const sellable = Array.isArray(layout?.sellableSeats) ? layout.sellableSeats : [];
  const norm = normalizeSectorLabel(sectorArg);

  const bundleRow = [];
  if (idx) {
    for (const v of idx.values()) {
      if (normalizeSectorLabel(v.sector) !== norm) continue;
      if (rowArg && String(v.row) !== String(rowArg)) continue;
      bundleRow.push(v);
    }
  }

  const sellableRow = sellable.filter(
    (s) =>
      normalizeSectorLabel(s.sector) === norm &&
      (!rowArg || String(s.row) === String(rowArg)),
  );

  const sources = {};
  for (const s of sellableRow) {
    const src = String(s.geodesySource ?? '?');
    sources[src] = (sources[src] ?? 0) + 1;
  }

  let missInBundle = 0;
  let missCoords = 0;
  for (const s of sellableRow) {
    const b = lookupLabeledSeat(idx, s.sector, s.row, s.seat);
    if (!b) missInBundle += 1;
    else if (Math.abs(b.xPct - s.xPct) > 0.05 || Math.abs(b.yPct - s.yPct) > 0.05) {
      missCoords += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        offerSeatGeodesy: {
          grayCloudLabeledMatched: geo.grayCloudLabeledMatched,
          grayCloudMatched: geo.grayCloudMatched,
          cloudRowSeatMatched: geo.cloudRowSeatMatched,
          sellableGeodesyMode: layout?.sellableGeodesyMode,
        },
        sector: sectorArg,
        row: rowArg || '*',
        bundleSeats: bundleRow.length,
        sellableSeats: sellableRow.length,
        sellableSources: sources,
        sellableNotInBundle: missInBundle,
        sellableCoordsDriftFromBundle: missCoords,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
