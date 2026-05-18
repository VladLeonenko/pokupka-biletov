#!/usr/bin/env node
/**
 * Серая чаша luzhniki.txt → SVG circle с data-sector / data-row / data-seat.
 * Сопоставление cx/cy ↔ tickets.json r[].s[].x/y (±tol), fallback fieldGrid + labeled-dots.
 *
 *   node scripts/enrich-luzhniki-gray-circles-svg.js
 *   node scripts/enrich-luzhniki-gray-circles-svg.js --merge frontend/public/hall-maps/luzhniki-football-stadium.svg
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cheerio from 'cheerio';

import {
  buildEnrichedGrayCloudSeatIndexes,
  buildEnrichedGrayCloudSvg,
  LUZHNIKI_GRAY_CLOUD_LAYER_ID,
  resolveSeatForGrayDot,
  seatCircleDataAttrs,
} from '../utils/luzhnikiEnrichSvgCirclesFromTickets.js';
import { escSvgAttr } from '../utils/luzhnikiPilotSeatSvg.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const outDir = path.join(repoRoot, 'backend/data/luzhniki-geodesy/hand');

function parseArgs() {
  const get = (flag) => {
    const i = process.argv.indexOf(flag);
    return i >= 0 ? process.argv[i + 1] : '';
  };
  return {
    coordsPath: get('--coords') || path.join(repoRoot, 'luzhniki.txt'),
    ticketsPath: get('--tickets') || path.join(repoRoot, 'tickets.json'),
    mergeInto: get('--merge') || '',
    outPath: get('--out') || path.join(outDir, 'luzhniki-gray-cloud-enriched.svg'),
    tolPx: Number(get('--tol')) || 1.5,
    enrichOnly: process.argv.includes('--enrich-existing'),
  };
}

function enrichExistingCirclesInSvg(svgMarkup, indexes, tolPx) {
  const $ = cheerio.load(String(svgMarkup), { xml: true });
  const stats = { total: 0, labeled: 0, skipped: 0 };

  $('circle').each((_, el) => {
    const c = $(el);
    if (c.attr('data-sector') && c.attr('data-row') && c.attr('data-seat')) {
      stats.skipped += 1;
      return;
    }
    const cx = Number.parseFloat(c.attr('cx') || '');
    const cy = Number.parseFloat(c.attr('cy') || '');
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
    stats.total += 1;

    const hit = resolveSeatForGrayDot(indexes, cx, cy, tolPx);
    if (!hit) return;

    const attrs = seatCircleDataAttrs(hit);
    for (const part of attrs.split(/\s+(?=\w)/)) {
      const m = part.match(/^([\w-]+)="(.*)"$/);
      if (m) c.attr(m[1], m[2].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
    }
    stats.labeled += 1;
  });

  return { svg: $.xml ? $.xml() : $.html(), stats };
}

async function mergeLayerIntoBase(baseSvg, layerSvg) {
  const $ = cheerio.load(String(baseSvg).trim(), { xml: true });
  $(`#${LUZHNIKI_GRAY_CLOUD_LAYER_ID}`).remove();
  const $layer = cheerio.load(layerSvg, { xml: true });
  const g = $layer(`#${LUZHNIKI_GRAY_CLOUD_LAYER_ID}`).first();
  if (!g.length) throw new Error('gray cloud layer missing');
  $('svg').first().append($.html(g));
  return $.xml ? $.xml() : $.html();
}

async function main() {
  const args = parseArgs();
  const coordinatesPayload = JSON.parse(fs.readFileSync(args.coordsPath, 'utf8'));
  const ticketsPayload = JSON.parse(fs.readFileSync(args.ticketsPath, 'utf8'));

  let baseSvg = '';
  if (args.mergeInto && fs.existsSync(args.mergeInto)) {
    baseSvg = fs.readFileSync(args.mergeInto, 'utf8');
  }

  const indexes = await buildEnrichedGrayCloudSeatIndexes({
    ticketsPayload,
    coordinatesPayload,
    svgMarkup: baseSvg,
    useFullStadiumFallback: true,
    useLabeledDotsFallback: true,
  });

  let svg;
  let stats;

  if (args.enrichOnly && baseSvg) {
    const enriched = enrichExistingCirclesInSvg(baseSvg, indexes, args.tolPx);
    svg = enriched.svg;
    stats = enriched.stats;
  } else {
    const built = buildEnrichedGrayCloudSvg(coordinatesPayload, indexes, {
      matchTolPx: args.tolPx,
    });
    svg = built.svg;
    stats = built.stats;
    if (args.mergeInto && baseSvg) {
      svg = await mergeLayerIntoBase(baseSvg, svg);
    }
  }

  fs.mkdirSync(path.dirname(args.outPath), { recursive: true });
  fs.writeFileSync(args.outPath, svg, 'utf8');

  const bundlePath = args.outPath.replace(/\.svg$/i, '.bundle.json');
  fs.writeFileSync(
    bundlePath,
    `${JSON.stringify(
      {
        builtAt: new Date().toISOString(),
        coordsPath: args.coordsPath,
        ticketsPath: args.ticketsPath,
        matchTolPx: args.tolPx,
        outSvg: args.outPath,
        mergeInto: args.mergeInto || null,
        stats,
        ticketSeatsIndexed: indexes.ticketBuckets.size,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  console.log(JSON.stringify({ ok: true, outPath: args.outPath, bundlePath, stats }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
