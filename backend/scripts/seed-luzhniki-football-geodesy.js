/**
 * Каноническая карта luzhniki-football только из реальной геодезии (файлы в репозитории / CI).
 *
 * GetBilet отдаёт только доступные места — полную чашу (~81k) один раз импортируем из снимка
 * билетной геометрии (pbilet или свой bundle JSON).
 *
 * Режим 1 — единый бандл:
 *   LUZHNIKI_GEODESY_BUNDLE_JSON=backend/data/luzhniki-geodesy/bundle.json
 *
 * Режим 2 — два снимка pbilet (как import-pbilet-stage-map, но только локальные файлы):
 *   LUZHNIKI_PBILET_TICKETS_JSON=…/tickets-full.json
 *   LUZHNIKI_PBILET_COORDINATES_JSON=…/coordinates.json
 *
 * SVG подложка: coordinates.bg (fetch) или LUZHNIKI_GEODESY_SVG_PATH=frontend/public/maps/foo.svg
 *
 * Проверка объёма: LUZHNIKI_GEODESY_MIN_SEATS (по умолчанию 80000).
 *
 * Пример:
 *   cd backend && LUZHNIKI_GEODESY_BUNDLE_JSON=../backend/data/luzhniki-geodesy/example.bundle.json npm run seed:luzhniki-football-map
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ticketPool from '../ticketDb.js';
import { LUZHNIKI_FOOTBALL_STAGE_MAP_KEY } from '../services/luzhnikiFootballStageMap.js';
import { normalizeHallSvgDataIds } from '../utils/normalizeHallSvgDataIds.js';
import {
  countSvgNativeSeatCircles,
  injectPbiletSeatsIntoSvg,
  parseSvgNativeSeatCircles,
} from '../utils/hallSeatGeodesyFromSvgCircles.js';
import {
  buildStadiumLayoutSeatsFromDotGrid,
  mergeLayoutSeatsPreferPbiletStrict,
} from '../utils/hallSeatGeodesyLuzhnikiGrid.js';
import {
  extractPbiletCoordinateCategoriesSectorPaths,
  extractPbiletCoordinatesSeatDots,
  extractPbiletTicketsSeatGeodesy,
  extractPbiletTicketSectorPaths,
  mergeSectorMetaPreferTickets,
} from '../utils/luzhnikiPbiletGeodesyExtract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

function optionalEnv(name) {
  return process.env[name]?.trim() || null;
}

function requiredFile(relOrAbs, label) {
  const candidates = path.isAbsolute(relOrAbs)
    ? [relOrAbs]
    : [
        path.resolve(repoRoot, relOrAbs),
        path.resolve(process.cwd(), relOrAbs),
        path.resolve(repoRoot, 'backend', relOrAbs),
      ];
  const abs = candidates.find((p) => fs.existsSync(p));
  if (!abs) {
    throw new Error(
      `${label}: файл не найден. Пробовали:\n${candidates.map((p) => `  - ${p}`).join('\n')}\n` +
        `На сервере: LUZHNIKI_PBILET_TICKETS_JSON=/var/pokupka-biletov/tickets.json (не ../tickets.json)`,
    );
  }
  return abs;
}

function readJson(abs) {
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      accept: 'image/svg+xml,text/plain,*/*',
      'user-agent': 'pokupka-biletov-geodesy-seed/1.0',
    },
  });
  if (!res.ok) throw new Error(`SVG bg HTTP ${res.status}: ${url}`);
  return res.text();
}

async function main() {
  const stageId = optionalEnv('STAGE_MAP_STAGE_ID') || LUZHNIKI_FOOTBALL_STAGE_MAP_KEY;
  const title =
    optionalEnv('STAGE_MAP_TITLE') || 'Стадион «Лужники» — футбол (геодезия)';
  const placeExternalId = optionalEnv('STAGE_MAP_PLACE_ID');
  const notesExtra = optionalEnv('STAGE_MAP_NOTES');
  const externalPlanUrl =
    optionalEnv('STAGE_MAP_EXTERNAL_PLAN_URL') || 'https://tickets-luzhniki.ru/';
  const minSeats = Number(optionalEnv('LUZHNIKI_GEODESY_MIN_SEATS')) || 4000;

  const bundlePath = optionalEnv('LUZHNIKI_GEODESY_BUNDLE_JSON');
  const ticketsPath = optionalEnv('LUZHNIKI_PBILET_TICKETS_JSON');
  const coordinatesPath = optionalEnv('LUZHNIKI_PBILET_COORDINATES_JSON');
  const svgLocalPath = optionalEnv('LUZHNIKI_GEODESY_SVG_PATH');

  /** @type {{ sector: string, row: string, seat: string, xPct: number, yPct: number }[]} */
  let seats = [];
  /** @type {{ xPct: number; yPct: number }[]} */
  let allSeatCoordinates = [];
  /** @type {Record<string, unknown>[]} */
  let sectorsMeta = [];
  let width;
  let height;
  /** @type {string} */
  let svgMarkup = '';
  let provenance = '';

  if (bundlePath) {
    const abs = requiredFile(bundlePath, 'LUZHNIKI_GEODESY_BUNDLE_JSON');
    const bundle = readJson(abs);
    width = Number(bundle.hallWidth);
    height = Number(bundle.hallHeight);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new Error('bundle: нужны положительные числа hallWidth, hallHeight');
    }
    const rawSeats = Array.isArray(bundle.seats) ? bundle.seats : [];
    provenance = `bundle:${abs}`;
    for (const item of rawSeats) {
      if (!item || typeof item !== 'object') continue;
      const sector = String(item.sector ?? item.Sector ?? '').trim();
      const row = String(item.row ?? item.Row ?? '').trim();
      const seat = String(item.seat ?? item.Seat ?? item.place ?? '').trim();
      const x = Number(item.x ?? item.X);
      const y = Number(item.y ?? item.Y);
      const xp = item.xPct ?? item.x_percent;
      const yp = item.yPct ?? item.y_percent;
      if (!sector || !row || !seat) continue;
      let xPct;
      let yPct;
      if (Number.isFinite(xp) && Number.isFinite(yp)) {
        xPct = Number(xp);
        yPct = Number(yp);
        if (xp >= 0 && xp <= 1 && yp >= 0 && yp <= 1) {
          xPct *= 100;
          yPct *= 100;
        }
      } else if (Number.isFinite(x) && Number.isFinite(y)) {
        xPct = (x / width) * 100;
        yPct = (y / height) * 100;
      } else {
        continue;
      }
      seats.push({ sector, row, seat, xPct, yPct });
    }
    sectorsMeta = (Array.isArray(bundle.sectors) ? bundle.sectors : [])
      .map((s) => {
        if (!s || typeof s !== 'object') return null;
        const id = String(s.id ?? s.d ?? '').trim();
        const label = String(s.label ?? s.i ?? '').trim();
        const path = String(s.path ?? s.o ?? '').trim();
        return {
          id,
          label,
          path,
          totalSeats: Number.isFinite(Number(s.totalSeats ?? s.all)) ? Number(s.totalSeats ?? s.all) : null,
          availableSeats: Number(s.availableSeats) || 0,
          minPrice: Number.isFinite(Number(s.minPrice)) ? Number(s.minPrice) : null,
          maxPrice: Number.isFinite(Number(s.maxPrice)) ? Number(s.maxPrice) : null,
        };
      })
      .filter((s) => s && s.id && s.label && s.path);
    const svgInline = typeof bundle.svgMarkup === 'string' ? bundle.svgMarkup.trim() : '';
    if (svgInline.includes('<svg')) {
      svgMarkup = normalizeHallSvgDataIds(svgInline);
    } else if (typeof bundle.bgSvgPath === 'string' && bundle.bgSvgPath.trim()) {
      const pabs = requiredFile(bundle.bgSvgPath.trim(), 'bundle.bgSvgPath');
      svgMarkup = normalizeHallSvgDataIds(fs.readFileSync(pabs, 'utf8').trim());
    }
    if (!svgMarkup && svgLocalPath) {
      const pabs = requiredFile(svgLocalPath, 'LUZHNIKI_GEODESY_SVG_PATH');
      svgMarkup = normalizeHallSvgDataIds(fs.readFileSync(pabs, 'utf8').trim());
    }
    if (!svgMarkup.includes('<svg')) {
      throw new Error('bundle: задайте svgMarkup, bgSvgPath или LUZHNIKI_GEODESY_SVG_PATH с корректным SVG');
    }
  } else if (ticketsPath && coordinatesPath) {
    const tAbs = requiredFile(ticketsPath, 'LUZHNIKI_PBILET_TICKETS_JSON');
    const cAbs = requiredFile(coordinatesPath, 'LUZHNIKI_PBILET_COORDINATES_JSON');
    const ticketsPayload = readJson(tAbs);
    const coordinatesPayload = readJson(cAbs);
    width = Number(coordinatesPayload?.width);
    height = Number(coordinatesPayload?.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new Error('coordinates JSON: некорректные width/height');
    }
    seats = extractPbiletTicketsSeatGeodesy(ticketsPayload, width, height);
    if (optionalEnv('LUZHNIKI_SKIP_COORDINATE_DOTS') !== '1') {
      allSeatCoordinates = extractPbiletCoordinatesSeatDots(coordinatesPayload, width, height);
    }
    const fromTickets = extractPbiletTicketSectorPaths(ticketsPayload);
    const fromCats = extractPbiletCoordinateCategoriesSectorPaths(coordinatesPayload);
    sectorsMeta = mergeSectorMetaPreferTickets(fromTickets, fromCats);
    provenance = `pbilet-files tickets=${tAbs} coordinates=${cAbs}`;

    if (svgLocalPath) {
      const pabs = requiredFile(svgLocalPath, 'LUZHNIKI_GEODESY_SVG_PATH');
      svgMarkup = normalizeHallSvgDataIds(fs.readFileSync(pabs, 'utf8').trim());
    } else {
      const bgUrl = String(coordinatesPayload?.bg ?? '').trim();
      if (!bgUrl) throw new Error('coordinates JSON без bg и не задан LUZHNIKI_GEODESY_SVG_PATH');
      svgMarkup = normalizeHallSvgDataIds((await fetchText(bgUrl)).trim());
    }
    if (!svgMarkup.includes('<svg')) throw new Error('Подложка не похожа на SVG');

    const ticketsSeats = [...seats];
    let gridSeats = [];
    if (allSeatCoordinates.length > 0 && sectorsMeta.length > 0) {
      gridSeats = buildStadiumLayoutSeatsFromDotGrid({
        sectorPaths: sectorsMeta,
        allSeatCoordinates,
        svgMarkup,
        hallWidth: width,
        hallHeight: height,
        ticketsSeats,
      });
      console.log(
        `[luzhniki-geodesy] layout seats: tickets strict=${ticketsSeats.length} grid=${gridSeats.length}`,
      );
    }
    seats = mergeLayoutSeatsPreferPbiletStrict(ticketsSeats, gridSeats);
  } else {
    throw new Error(
      [
        'Нет данных геодезии. Задайте один из вариантов:',
        '  A) LUZHNIKI_GEODESY_BUNDLE_JSON — см. backend/data/luzhniki-geodesy/README.md',
        '  B) LUZHNIKI_PBILET_TICKETS_JSON + LUZHNIKI_PBILET_COORDINATES_JSON (локальные снимки)',
        '',
        'Синтетическая генерация 81k отключена для этой команды; для демо: npm run seed:luzhniki-football-synthetic',
      ].join('\n'),
    );
  }

  if (seats.length < minSeats) {
    throw new Error(
      `Слишком мало мест в снимке: ${seats.length} < min ${minSeats}. Полный стадион ~81k — проверьте источник.`,
    );
  }

  const embedCircles =
    optionalEnv('LUZHNIKI_EMBED_TICKET_CIRCLES_IN_SVG') !== '0' &&
    allSeatCoordinates.length < 5000;
  if (embedCircles && svgMarkup.includes('<svg') && seats.length > 0) {
    const before = countSvgNativeSeatCircles(svgMarkup);
    const injected = injectPbiletSeatsIntoSvg(svgMarkup, seats, width, height, {
      maxCircles: Number(optionalEnv('LUZHNIKI_MAX_SVG_SEAT_CIRCLES')) || 12000,
    });
    if (injected.embedded) {
      svgMarkup = normalizeHallSvgDataIds(injected.svgMarkup);
      const after = parseSvgNativeSeatCircles(svgMarkup, width, height).length;
      console.log(
        `[luzhniki-geodesy] SVG circles: pbilet bg had ${before}, injected ${injected.count}, parsed ${after}`,
      );
    }
  }

  const layoutJson = {
    layoutMode: 'svgNative',
    showUnavailableSeats: true,
    grayHallWhenNoOffers: true,
    nativeSeatCount: seats.length,
    ...(allSeatCoordinates.length > 0
      ? {
          allSeatCoordinates,
          uniformHallSeatAppearance: true,
          hallBackgroundFromLabeledSeats: false,
        }
      : { hallBackgroundFromLabeledSeats: false }),
    sectorPathCount: sectorsMeta.length,
    seats,
    sectorMode: {
      enabled: true,
      source: bundlePath ? 'luzhniki-geodesy-bundle' : 'luzhniki-pbilet-files',
      sectors: sectorsMeta,
    },
    geodesy: {
      provenance,
      hallWidth: width,
      hallHeight: height,
      importedAt: new Date().toISOString(),
      minSeatsExpected: minSeats,
      ...(allSeatCoordinates.length > 0
        ? { coordinateDotsFromHallLayout: allSeatCoordinates.length }
        : {}),
    },
    seatCirclesEmbeddedInSvg: countSvgNativeSeatCircles(svgMarkup),
    layoutSeatsFromGrid: true,
    note:
      'layout.seats = grid (каждая точка сектора: ряд по SVG, место 1…N слева) + strict из tickets.json где есть r[].s[].',
  };

  const notesInternal =
    `geodesy seats=${seats.length}; coordinateDots=${allSeatCoordinates.length}; sectors=${sectorsMeta.length}; ${provenance}` +
    (notesExtra ? `. ${notesExtra}` : '');

  const result = await ticketPool.query(
    `INSERT INTO getbilet_stage_maps (
       stage_external_id, place_external_id, title, svg_markup, layout_json,
       notes_internal, external_plan_url, updated_at
     )
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, NOW())
     ON CONFLICT (stage_external_id) DO UPDATE SET
       place_external_id = EXCLUDED.place_external_id,
       title = EXCLUDED.title,
       svg_markup = EXCLUDED.svg_markup,
       layout_json = EXCLUDED.layout_json,
       notes_internal = EXCLUDED.notes_internal,
       external_plan_url = EXCLUDED.external_plan_url,
       updated_at = NOW()
     RETURNING id, stage_external_id, title`,
    [
      stageId,
      placeExternalId,
      title,
      svgMarkup,
      JSON.stringify(layoutJson),
      notesInternal,
      externalPlanUrl,
    ],
  );

  console.log(
    JSON.stringify(
      {
        saved: result.rows[0],
        seats: seats.length,
        coordinateDots: allSeatCoordinates.length,
        sectors: sectorsMeta.length,
        hall: { width, height },
        provenance,
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
