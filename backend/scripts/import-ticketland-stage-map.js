/**
 * Импорт схемы Ticketland (rect.place) в getbilet_stage_maps.
 *
 * Запуск из backend/:
 *   STAGE_MAP_TICKETLAND_HTML_PATH=../path/to/hall.html \
 *   STAGE_MAP_STAGE_ID=kremlin-palace \
 *   STAGE_MAP_TITLE="Государственный Кремлёвский дворец — Большой зал" \
 *   node scripts/import-ticketland-stage-map.js
 *
 * HTML — фрагмент со страницы покупки Ticketland (Network → hall-scheme-svg или DOM #hall-scheme-svg).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ticketPool from '../ticketDb.js';
import { buildTheaterHallSectorMode } from '../utils/theaterHallSvgSectorMode.js';
import { buildTheaterLayoutFromTicketlandMarkup } from '../utils/ticketlandHallSvg.js';

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
    optionalEnv('STAGE_MAP_TICKETLAND_HTML_PATH') ||
    path.join(REPO_ROOT, 'backend/data/kremlin-palace/ticketland-source.html');
  const absPath = path.isAbsolute(htmlPath) ? htmlPath : path.resolve(REPO_ROOT, htmlPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Нет HTML Ticketland: ${absPath}`);
  }

  const markup = fs.readFileSync(absPath, 'utf8');
  const stageId = requiredEnv('STAGE_MAP_STAGE_ID');
  const title = requiredEnv('STAGE_MAP_TITLE');
  const externalPlanUrl = optionalEnv(
    'STAGE_MAP_EXTERNAL_PLAN_URL',
    'https://www.kremlinpalace.org/',
  );

  const built = buildTheaterLayoutFromTicketlandMarkup(markup);
  let svgMarkup = built.svgMarkup;
  const svgOutRel = optionalEnv('STAGE_MAP_SVG_PATH');
  if (svgOutRel) {
    const svgOut = path.isAbsolute(svgOutRel)
      ? svgOutRel
      : path.join(REPO_ROOT, svgOutRel);
    fs.mkdirSync(path.dirname(svgOut), { recursive: true });
    fs.writeFileSync(svgOut, `${svgMarkup}\n`, 'utf8');
    svgMarkup = fs.readFileSync(svgOut, 'utf8');
  }

  const sectorMode = buildTheaterHallSectorMode(svgMarkup, { source: 'ticketland-hull' });
  if (!sectorMode.enabled) {
    throw new Error('Не удалось собрать sectorMode из SVG');
  }

  const maxZoom = Number(optionalEnv('STAGE_MAP_MAX_ZOOM_MULTIPLIER', '2'));
  const layoutJson = {
    layoutMode: 'svgNative',
    showUnavailableSeats: false,
    grayHallWhenNoOffers: true,
    allSeatCoordinates: built.allSeatCoordinates,
    maxZoomMultiplier: Number.isFinite(maxZoom) ? maxZoom : 2,
    sectorFocusZoomMultiplier: Number.isFinite(maxZoom) ? maxZoom : 2,
    hallKind: optionalEnv('STAGE_MAP_HALL_KIND', 'theater'),
    preferLayoutSeatPositions: truthyEnv('STAGE_MAP_PREFER_LAYOUT_SEATS'),
    sectorMode,
    ticketland: {
      sourceHtml: path.relative(REPO_ROOT, absPath),
      hallWidth: built.hallWidth,
      hallHeight: built.hallHeight,
      placeCount: built.places.length,
      sectorCount: built.sectors.length,
      importedAt: new Date().toISOString(),
    },
    pbilet: {
      hallWidth: built.hallWidth,
      hallHeight: built.hallHeight,
    },
    note: 'ticketland import: координаты из rect.place; доступность из GetBilet',
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
      optionalEnv('STAGE_MAP_PLACE_ID', '5e81e2e0930af7003040129c'),
      title,
      svgMarkup,
      JSON.stringify(layoutJson),
      `Ticketland import: places=${built.places.length}; sectors=${built.sectors.length}; hull from ${path.basename(absPath)}`,
      externalPlanUrl,
    ],
  );

  console.log(
    JSON.stringify(
      {
        saved: result.rows[0],
        places: built.places.length,
        allSeatCoordinates: built.allSeatCoordinates.length,
        sectors: sectorMode.sectors.length,
        hallWidth: built.hallWidth,
        hallHeight: built.hallHeight,
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
