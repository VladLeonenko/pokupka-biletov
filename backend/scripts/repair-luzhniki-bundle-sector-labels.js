#!/usr/bin/env node
/**
 * Починка sector в bundle после cheerio &#x421;… (→ «Сектор B 147»).
 *   cd backend && node scripts/repair-luzhniki-bundle-sector-labels.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getCachedTicketsSectorLabelByNorm,
  resolveCanonicalSectorLabel,
} from '../utils/luzhnikiSectorDisplayLabel.js';
import { dedupeLabeledSeatsByKey } from '../utils/hallSeatGeodesyMatch.js';
import { normalizeSectorLabel } from '../utils/ticketHallSectorNormalize.js';
import { resetGrayCloudLabeledIndexCache } from '../utils/luzhnikiGrayCloudLabeledIndex.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLE = path.resolve(
  __dirname,
  '../data/luzhniki-geodesy/hand/bundle-luzhniki-gray-cloud-labeled-seats.json',
);

const raw = JSON.parse(fs.readFileSync(BUNDLE, 'utf8'));
const seats = Array.isArray(raw?.seats) ? raw.seats : [];
if (!seats.length) {
  console.error('bundle пуст — восстанови из бэкапа или сохрани из редактора');
  process.exit(1);
}

const byNorm = getCachedTicketsSectorLabelByNorm();
let changed = 0;
for (const s of seats) {
  const before = String(s.sector ?? '');
  const after = resolveCanonicalSectorLabel(before, byNorm);
  if (before !== after) {
    s.sector = after;
    changed += 1;
  }
}

const counts = {};
for (const s of seats) {
  const n = normalizeSectorLabel(s.sector);
  counts[n] = (counts[n] || 0) + 1;
}

const deduped = dedupeLabeledSeatsByKey(seats);
raw.seats = deduped;
raw.seatCount = deduped.length;
raw.labeledSeatCount = deduped.length;
raw.repairedAt = new Date().toISOString();

fs.writeFileSync(BUNDLE, `${JSON.stringify(raw, null, 2)}\n`, 'utf8');
resetGrayCloudLabeledIndexCache();

console.log(
  JSON.stringify(
    { total: deduped.length, dedupedFrom: seats.length, relabeled: changed, b147: counts.b147 ?? 0 },
    null,
    2,
  ),
);
