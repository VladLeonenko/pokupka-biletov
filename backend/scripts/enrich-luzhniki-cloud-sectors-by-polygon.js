#!/usr/bin/env node
/**
 * Cloud-кружки без data-sector → data-sector по попаданию (cx,cy) в контур sector.o.
 *
 *   node scripts/enrich-luzhniki-cloud-sectors-by-polygon.js
 *   node scripts/enrich-luzhniki-cloud-sectors-by-polygon.js --in hand/luzhniki-gray-cloud-enriched.svg
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cheerio from 'cheerio';

import { escSvgAttr } from '../utils/luzhnikiPilotSeatSvg.js';
import {
  buildSectorPolygonIndex,
  findSectorNameForPoint,
} from '../utils/luzhnikiSectorPolygon.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const handDir = path.join(repoRoot, 'backend/data/luzhniki-geodesy/hand');

function parseArgs() {
  const get = (flag) => {
    const i = process.argv.indexOf(flag);
    return i >= 0 ? process.argv[i + 1] : '';
  };
  const inRel = get('--in');
  const outRel = get('--out');
  const defaultIn = path.join(handDir, 'luzhniki-gray-cloud-enriched.svg');
  const inPath = inRel ? path.resolve(repoRoot, inRel) : defaultIn;
  return {
    ticketsPath: get('--tickets') || path.join(repoRoot, 'tickets.json'),
    inPath,
    outPath: outRel
      ? path.resolve(repoRoot, outRel)
      : inPath.replace(/\.svg$/i, '-cloud-sector.svg'),
  };
}

function enrichCloudCirclesByPolygon(svgMarkup, sectorIndex) {
  const $ = cheerio.load(String(svgMarkup), { xml: true });
  const stats = { matched: 0, notFound: 0, skipped: 0 };

  $('circle').each((_, el) => {
    const c = $(el);
    const source = c.attr('data-source') || '';
    if (source !== 'cloud') {
      stats.skipped += 1;
      return;
    }
    if (c.attr('data-sector')) {
      stats.skipped += 1;
      return;
    }

    const cx = Number.parseFloat(c.attr('cx') || '');
    const cy = Number.parseFloat(c.attr('cy') || '');
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
      stats.notFound += 1;
      return;
    }

    const sectorName = findSectorNameForPoint(cx, cy, sectorIndex);
    if (!sectorName) {
      stats.notFound += 1;
      return;
    }

    c.attr('data-sector', escSvgAttr(sectorName));
    c.attr('place-name', escSvgAttr(sectorName));
    c.attr('data-source', 'cloud-polygon');
    c.removeAttr('data-unlabeled');
    stats.matched += 1;
  });

  return { svg: $.xml ? $.xml() : $.html(), stats };
}

async function main() {
  const args = parseArgs();
  const ticketsPayload = JSON.parse(fs.readFileSync(args.ticketsPath, 'utf8'));
  const sectorIndex = buildSectorPolygonIndex(ticketsPayload);
  const svg = fs.readFileSync(args.inPath, 'utf8');
  const { svg: outSvg, stats } = enrichCloudCirclesByPolygon(svg, sectorIndex);

  fs.mkdirSync(path.dirname(args.outPath), { recursive: true });
  fs.writeFileSync(args.outPath, outSvg, 'utf8');

  console.log(
    JSON.stringify(
      {
        ok: true,
        sectorPolygons: sectorIndex.length,
        inPath: args.inPath,
        outPath: args.outPath,
        ...stats,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
