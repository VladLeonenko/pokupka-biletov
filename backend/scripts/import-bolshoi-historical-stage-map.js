/**
 * Импорт Исторической сцены Большого из HTML/SVG ticket.bolshoi.ru
 * (как import-ticketland-stage-map.js для Кремля).
 *
 *   STAGE_MAP_STAGE_ID=bolshoi-historical-stage \
 *   STAGE_MAP_TITLE="Большой театр — Историческая сцена" \
 *   node scripts/import-bolshoi-historical-stage-map.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ticketPool from '../ticketDb.js';
import { buildTheaterLayoutFromBolshoiMarkup } from '../utils/bolshoiHistoricalHallSvg.js';
import {
  remapBolshoiSeatsToSellableLabels,
  buildBolshoiSellableSectorMode,
  BOLSHOI_HALL_MAP_LABELS,
} from '../utils/bolshoiSellableSectors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

function optionalEnv(name, fallback = null) {
  return process.env[name]?.trim() || fallback;
}

function requiredEnv(name) {
  const v = optionalEnv(name);
  if (!v) throw new Error(`${name} обязателен`);
  return v;
}

function truthyEnv(name) {
  const v = process.env[name]?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

async function main() {
  const htmlPath =
    optionalEnv('STAGE_MAP_BOLSHOI_HTML_PATH') ||
    path.join(REPO_ROOT, 'backend/data/bolshoi-historical/bolshoi-source.html');
  const absPath = path.isAbsolute(htmlPath) ? htmlPath : path.resolve(REPO_ROOT, htmlPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Нет HTML/SVG Большого: ${absPath}`);
  }

  const labeledPath =
    optionalEnv('STAGE_MAP_BOLSHOI_LABELED_PATH') ||
    path.join(REPO_ROOT, 'backend/data/bolshoi-historical/historical-circles-labeled.svg');
  const labeledAbs = path.isAbsolute(labeledPath)
    ? labeledPath
    : path.resolve(REPO_ROOT, labeledPath);

  const markup = fs.readFileSync(absPath, 'utf8');
  const labeled = fs.existsSync(labeledAbs) ? fs.readFileSync(labeledAbs, 'utf8') : '';
  const stageId = requiredEnv('STAGE_MAP_STAGE_ID');
  const title = requiredEnv('STAGE_MAP_TITLE');

  const built = buildTheaterLayoutFromBolshoiMarkup(markup, labeled);
  let svgMarkup = built.svgMarkup;

  const svgOutRel =
    optionalEnv('STAGE_MAP_SVG_PATH') || 'frontend/public/hall-maps/bolshoi-historical-stage.svg';
  const svgOut = path.isAbsolute(svgOutRel) ? svgOutRel : path.join(REPO_ROOT, svgOutRel);
  fs.mkdirSync(path.dirname(svgOut), { recursive: true });
  fs.writeFileSync(svgOut, `${svgMarkup}\n`, 'utf8');
  svgMarkup = fs.readFileSync(svgOut, 'utf8');

  const seats = remapBolshoiSeatsToSellableLabels(built.seats);
  const sectorMode = buildBolshoiSellableSectorMode(seats, built.hallWidth, built.hallHeight);

  const maxZoom = Number(optionalEnv('STAGE_MAP_MAX_ZOOM_MULTIPLIER', '2'));
  const layoutJson = {
    layoutMode: 'svgNative',
    showUnavailableSeats: true,
    grayHallWhenNoOffers: true,
    showSeatsAtOverview: true,
    allSeatCoordinates: built.allSeatCoordinates,
    seats,
    maxZoomMultiplier: Number.isFinite(maxZoom) ? maxZoom : 2,
    sectorFocusZoomMultiplier: Number.isFinite(maxZoom) ? maxZoom : 2,
    hallKind: optionalEnv('STAGE_MAP_HALL_KIND', 'theater'),
    hallViewportBackground: '#ffffff',
    /** Remap sellable-лейблы ↔ офферы; иначе SVG «Партер» не матчится с «Партер (середина)». */
    preferLayoutSeatPositions: true,
    /**
     * Продажа по сектору + qty (не конкретное место).
     * Схема/места остаются превью; клик по зоне → модалка количества.
     */
    hallPreviewSectorCheckout: true,
    seatSelectionDisabled: true,
    hideSeatList: true,
    sectorMode,
    hallMapLabels: BOLSHOI_HALL_MAP_LABELS,
    categoryCheckoutDefaults: {
      previewImageUrl: '/hall-maps/bolshoi-views/view-parter-a.jpg',
    },
    bolshoiHistorical: {
      sourceHtml: path.relative(REPO_ROOT, absPath),
      hallWidth: built.hallWidth,
      hallHeight: built.hallHeight,
      rectCount: built.rectCount,
      placeCount: built.places.length,
      labeledCount: built.labeledCount,
      sectorCount: sectorMode.sectors.length,
      importedAt: new Date().toISOString(),
    },
    pbilet: {
      hallWidth: built.hallWidth,
      hallHeight: built.hallHeight,
    },
    note: 'bolshoi: official coords + labeled sellable TZ zones + view-from-hall previews',
  };

  const result = await ticketPool.query(
    `INSERT INTO getbilet_stage_maps (
       stage_external_id, place_external_id, title, svg_markup, layout_json,
       notes_internal, external_plan_url, updated_at
     )
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, NOW())
     ON CONFLICT (stage_external_id) DO UPDATE SET
       title = EXCLUDED.title,
       svg_markup = EXCLUDED.svg_markup,
       layout_json = EXCLUDED.layout_json,
       notes_internal = EXCLUDED.notes_internal,
       external_plan_url = EXCLUDED.external_plan_url,
       updated_at = NOW()
     RETURNING id, stage_external_id, title`,
    [
      stageId,
      optionalEnv('STAGE_MAP_PLACE_ID'),
      title,
      svgMarkup,
      JSON.stringify(layoutJson),
      `Bolshoi historical import: places=${built.places.length}; rects=${built.rectCount}; sectors=${built.sectors.length}; from ${path.basename(absPath)}`,
      optionalEnv('STAGE_MAP_EXTERNAL_PLAN_URL', 'https://ticket.bolshoi.ru/'),
    ],
  );

  console.log(
    JSON.stringify(
      {
        saved: result.rows[0],
        places: built.places.length,
        rects: built.rectCount,
        labeled: built.labeledCount,
        allSeatCoordinates: built.allSeatCoordinates.length,
        sectors: sectorMode.sectors?.length ?? built.sectors.length,
        hallWidth: built.hallWidth,
        hallHeight: built.hallHeight,
        svg: path.relative(REPO_ROOT, svgOut),
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
