#!/usr/bin/env node
/**
 * Единый place-name / data-sector / bundle.sector (как в tickets.json).
 * Lookup на checkout уже по norm (a101); скрипт выравнивает строки в файлах.
 *
 *   cd backend && node scripts/normalize-luzhniki-gray-cloud-sector-labels.js
 *   node scripts/normalize-luzhniki-gray-cloud-sector-labels.js --dry-run
 *   node scripts/normalize-luzhniki-gray-cloud-sector-labels.js --bundle-only
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cheerio from 'cheerio';

import { resetGrayCloudLabeledIndexCache } from '../utils/luzhnikiGrayCloudLabeledIndex.js';
import { extractLabeledSeatsFromSvgMarkup } from '../utils/luzhnikiExtractSeatsFromEnrichedSvg.js';
import {
  getCachedTicketsSectorLabelByNorm,
  resolveCanonicalSectorLabel,
} from '../utils/luzhnikiSectorDisplayLabel.js';
import { normalizeSectorLabel, sectorNormsMatch } from '../utils/ticketHallSectorNormalize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const HAND_SVG = path.join(REPO_ROOT, 'backend/data/luzhniki-geodesy/hand/luzhniki-gray-cloud-enriched.svg');
const PUBLIC_SVG = path.join(REPO_ROOT, 'frontend/public/tools/luzhniki-gray-cloud-enriched.svg');
const BUNDLE = path.join(
  REPO_ROOT,
  'backend/data/luzhniki-geodesy/hand/bundle-luzhniki-gray-cloud-labeled-seats.json',
);

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    bundleOnly: argv.includes('--bundle-only'),
    svgOnly: argv.includes('--svg-only'),
    tickets: argv.find((a, i) => argv[i - 1] === '--tickets') || path.join(REPO_ROOT, 'tickets.json'),
  };
}

function normalizeSvgFile(filePath, byNorm, dryRun) {
  if (!fs.existsSync(filePath)) {
    console.warn('skip missing', filePath);
    return { changed: 0, samples: [] };
  }
  const xml = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(xml, { xml: true });
  let changed = 0;
  const samples = [];

  $('circle').each((_, el) => {
    const c = $(el);
    const cur =
      c.attr('data-sector') ||
      c.attr('place-name') ||
      c.attr('placeName') ||
      '';
    if (!cur.trim()) return;
    const next = resolveCanonicalSectorLabel(cur, byNorm);
    if (!next || sectorNormsMatch(cur, next)) return;
    changed += 1;
    if (samples.length < 8) {
      samples.push({ from: cur, to: next, norm: normalizeSectorLabel(cur) });
    }
    if (!dryRun) {
      c.attr('place-name', next);
      c.attr('data-sector', next);
    }
  });

  if (!dryRun && changed > 0) {
    fs.writeFileSync(filePath, $.xml(), 'utf8');
  }
  return { changed, samples };
}

function normalizeBundle(filePath, byNorm, dryRun) {
  if (!fs.existsSync(filePath)) {
    console.warn('skip missing', filePath);
    return { changed: 0, samples: [] };
  }
  const bundle = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const seats = Array.isArray(bundle.seats) ? bundle.seats : [];
  let changed = 0;
  const samples = [];

  for (const s of seats) {
    const cur = String(s.sector ?? '');
    if (!cur.trim()) continue;
    const next = resolveCanonicalSectorLabel(cur, byNorm);
    if (!next || sectorNormsMatch(cur, next)) continue;
    changed += 1;
    if (samples.length < 8) {
      samples.push({ from: cur, to: next, norm: normalizeSectorLabel(cur) });
    }
    if (!dryRun) s.sector = next;
  }

  if (!dryRun && changed > 0) {
    bundle.sectorLabelsNormalizedAt = new Date().toISOString();
    const extracted = extractLabeledSeatsFromSvgMarkup(
      fs.existsSync(HAND_SVG) ? fs.readFileSync(HAND_SVG, 'utf8') : '',
    );
    if (extracted.seats.length >= seats.length * 0.9) {
      bundle.seats = extracted.seats;
      bundle.labeledSeatCount = extracted.labeledCount;
    }
    fs.writeFileSync(filePath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
    resetGrayCloudLabeledIndexCache();
  }

  return { changed, samples };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const byNorm = getCachedTicketsSectorLabelByNorm(opts.tickets);
  console.log('tickets sector norms:', byNorm.size);
  if (byNorm.has('a101')) console.log('  a101 →', byNorm.get('a101'));

  const report = { dryRun: opts.dryRun };

  if (!opts.bundleOnly) {
    report.handSvg = normalizeSvgFile(HAND_SVG, byNorm, opts.dryRun);
    report.publicSvg = normalizeSvgFile(PUBLIC_SVG, byNorm, opts.dryRun);
  }
  if (!opts.svgOnly) {
    report.bundle = normalizeBundle(BUNDLE, byNorm, opts.dryRun);
  }

  console.log(JSON.stringify(report, null, 2));

  if (opts.dryRun) {
    console.log('\n(dry-run — файлы не записаны; убери --dry-run для записи)');
  }
}

main();
