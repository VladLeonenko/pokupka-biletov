/**
 * Читает enriched SVG редактора Лужников с диска или генерирует из luzhniki.txt + tickets.json.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

import cheerio from 'cheerio';

import { resetGrayDotsLabelerCache } from './luzhnikiGrayDotsLabeler.js';
import {
  buildEnrichedGrayCloudSeatIndexes,
  buildEnrichedGrayCloudSvg,
  LUZHNIKI_GRAY_CLOUD_LAYER_ID,
} from './luzhnikiEnrichSvgCirclesFromTickets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

export const LUZHNIKI_HAND_SVG = path.join(
  REPO_ROOT,
  'backend/data/luzhniki-geodesy/hand/luzhniki-gray-cloud-enriched.svg',
);
export const LUZHNIKI_PUBLIC_SVG = path.join(
  REPO_ROOT,
  'frontend/public/tools/luzhniki-gray-cloud-enriched.svg',
);

const COORDS_PATH = path.join(REPO_ROOT, 'luzhniki.txt');
const TICKETS_PATH = path.join(REPO_ROOT, 'tickets.json');
const STADIUM_SVG = path.join(REPO_ROOT, 'frontend/public/hall-maps/luzhniki-football-stadium.svg');

/** @type {Promise<string> | null} */
let generatePromise = null;

function writeSvgFiles(filePath, xml) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, xml, 'utf8');
  fs.writeFileSync(`${filePath}.gz`, zlib.gzipSync(xml, { level: 9 }));
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

async function generateEnrichedSvgMarkup() {
  if (!fs.existsSync(COORDS_PATH) || !fs.existsSync(TICKETS_PATH)) {
    throw new Error(
      'SVG не найден на диске. На сервере: cd backend && npm run enrich:luzhniki-gray-circles-svg -- --merge ../frontend/public/hall-maps/luzhniki-football-stadium.svg',
    );
  }

  const coordinatesPayload = JSON.parse(fs.readFileSync(COORDS_PATH, 'utf8'));
  const ticketsPayload = JSON.parse(fs.readFileSync(TICKETS_PATH, 'utf8'));

  let baseSvg = '';
  if (fs.existsSync(STADIUM_SVG)) {
    baseSvg = fs.readFileSync(STADIUM_SVG, 'utf8');
  }

  resetGrayDotsLabelerCache();
  const indexes = await buildEnrichedGrayCloudSeatIndexes({
    ticketsPayload,
    coordinatesPayload,
    svgMarkup: baseSvg,
    useCanonicalCloudLabels: true,
  });

  const built = buildEnrichedGrayCloudSvg(coordinatesPayload, indexes, { matchTolPx: 1.5 });
  let svg = built.svg;
  if (baseSvg) {
    svg = await mergeLayerIntoBase(baseSvg, svg);
  }

  writeSvgFiles(LUZHNIKI_HAND_SVG, svg);
  writeSvgFiles(LUZHNIKI_PUBLIC_SVG, svg);
  return svg;
}

/**
 * @returns {Promise<string>} SVG markup
 */
export async function readLuzhnikiGrayCloudEnrichedSvgMarkup() {
  if (fs.existsSync(LUZHNIKI_HAND_SVG)) {
    return fs.readFileSync(LUZHNIKI_HAND_SVG, 'utf8');
  }
  if (fs.existsSync(LUZHNIKI_PUBLIC_SVG)) {
    return fs.readFileSync(LUZHNIKI_PUBLIC_SVG, 'utf8');
  }
  if (!generatePromise) {
    generatePromise = generateEnrichedSvgMarkup().finally(() => {
      generatePromise = null;
    });
  }
  return generatePromise;
}
