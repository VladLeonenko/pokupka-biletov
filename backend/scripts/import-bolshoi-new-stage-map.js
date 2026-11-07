/**
 * Большой — Новая сцена: импорт мест напрямую из Afisha hallplan JSON
 * (без rect↔label NN / align-shift, в отличие от Исторической).
 *
 *   # только SVG + счётчики (без БД):
 *   APPLY_DB=0 node scripts/import-bolshoi-new-stage-map.js
 *
 *   # upsert getbilet_stage_maps + SVG + editor bundle:
 *   APPLY_DB=1 node scripts/import-bolshoi-new-stage-map.js
 *
 * Env:
 *   STAGE_MAP_STAGE_ID=bolshoi-new-stage
 *   STAGE_MAP_TITLE=Большой театр — Новая сцена
 *   STAGE_MAP_AFISHA_JSON=backend/data/bolshoi-new/afisha-hallplan-levels.json
 *   STAGE_MAP_SVG_PATH=frontend/public/hall-maps/bolshoi-new-stage.svg
 *   STAGE_MAP_BUNDLE_PATH=backend/data/bolshoi-geodesy/hand/bolshoi-new-stage-seats.bundle.json
 *
 * Места: hallplan x_coord/y_coord as-is (НЕ двигать).
 * Серые зоны + ⬡ = level.outline (тот же path, без отдельного hull-stroke).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ticketPool from '../ticketDb.js';
import { buildBolshoiSectors } from '../utils/bolshoiHistoricalHallSvg.js';
import { buildSectorsFromAfishaOutlines } from '../utils/bolshoiNewStageAfishaOutlines.js';
import {
  BOLSHOI_NEW_STAGE_PARTER_FILL,
  collapseBolshoiNewStageToParterMid,
} from '../utils/bolshoiNewStageParterCheckout.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const STAGE_ID = process.env.STAGE_MAP_STAGE_ID?.trim() || 'bolshoi-new-stage';
const TITLE = process.env.STAGE_MAP_TITLE?.trim() || 'Большой театр — Новая сцена';
/** Все сектора — белые «карточки» на сером viewport (как Яндекс Афиша). */
const SECTOR_FILL = '#ffffff';
const HALL_VIEWPORT_BG = '#e8e8e8';
const SECTOR_STROKE = 'rgba(0,0,0,0.06)';

function optionalEnv(name, fallback = null) {
  return process.env[name]?.trim() || fallback;
}

function truthyEnv(name, defaultTrue = false) {
  const raw = process.env[name];
  if (raw == null || raw === '') return defaultTrue;
  const v = String(raw).trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function sectionIdFromLabel(sector) {
  return (
    String(sector)
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64) || 'sector'
  );
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * @param {{ levels: Array<{ id?: number, name: string, outline?: string, seats: Array<{ place: string, row: string, x_coord: number, y_coord: number }> }>, stage?: object }} hallplan
 * @param {{ hallWidth: number, hallHeight: number }} opts
 */
export function buildTheaterLayoutFromAfishaHallplan(hallplan, opts) {
  const { hallWidth, hallHeight } = opts;
  const levels = Array.isArray(hallplan?.levels) ? hallplan.levels : [];
  if (!levels.length) throw new Error('afisha hallplan: нет levels');

  /** @type {Map<string, number>} */
  const sectorCounts = new Map();
  const places = [];

  for (const level of levels) {
    const section = String(level?.name || '').trim();
    if (!section) continue;
    const sectionId = sectionIdFromLabel(section);
    const seats = Array.isArray(level.seats) ? level.seats : [];
    sectorCounts.set(section, (sectorCounts.get(section) || 0) + seats.length);

    for (const s of seats) {
      const x = Number(s.x_coord);
      const y = Number(s.y_coord);
      const row = String(s.row ?? '').trim();
      const seat = String(s.place ?? s.seat ?? '').trim();
      if (!Number.isFinite(x) || !Number.isFinite(y) || !row || !seat) continue;
      places.push({
        id: `${section}|${row}|${seat}`,
        sectionId,
        section,
        row,
        seat,
        x,
        y,
        w: 12,
        h: 12,
        cx: x,
        cy: y,
      });
    }
  }

  if (places.length < 50) {
    throw new Error(`afisha hallplan: слишком мало мест (${places.length})`);
  }

  const outlineBuilt = buildSectorsFromAfishaOutlines(levels, buildBolshoiSectors);
  const sectors = outlineBuilt.sectors;
  if (!sectors.length) throw new Error('afisha hallplan: нет outline-секторов');

  const rDot = Math.max(2.4, Math.min(hallWidth, hallHeight) * 0.0026);
  const circles = places
    .map(
      (p) =>
        `    <circle cx="${p.cx.toFixed(2)}" cy="${p.cy.toFixed(2)}" r="${rDot.toFixed(2)}" place-name="${esc(p.section)}" row="${esc(p.row)}" place="${esc(p.seat)}" fill="#f97316" stroke="none"/>`,
    )
    .join('\n');

  const stage = hallplan.stage && typeof hallplan.stage === 'object' ? hallplan.stage : null;
  const stageX = stage && Number.isFinite(Number(stage.x_coord))
    ? Number(stage.x_coord) + (Number(stage.width) || 0) / 2
    : hallWidth / 2;
  const stageY = stage && Number.isFinite(Number(stage.y_coord))
    ? Number(stage.y_coord) + 8
    : Math.round(hallHeight * 0.97);

  /**
   * ONE path per sector: white fill + sector-contour (same d).
   * Labels group AFTER seats so names paint above dots (SVG paint order).
   * No separate hull stroke layer — that was the bad «линии».
   */
  const sectorPaths = sectors
    .map((s) => {
      const fill = /^партер/i.test(String(s.label || ''))
        ? BOLSHOI_NEW_STAGE_PARTER_FILL
        : SECTOR_FILL;
      return `    <path class="sector-contour" d="${esc(s.path)}" fill="${fill}" fill-opacity="1" stroke="${SECTOR_STROKE}" stroke-width="1" data-sector="${esc(s.label)}" pointer-events="fill"/>`;
    })
    .join('\n');

  const sectorLabels = sectors
    .map((s) => {
      const fsPx = s.totalSeats <= 8 ? 9 : s.totalSeats <= 20 ? 10 : 11;
      return `    <text x="${s.centroid.x.toFixed(1)}" y="${s.centroid.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,Helvetica,sans-serif" font-size="${fsPx}" fill="rgba(90,90,86,0.8)" pointer-events="none">${esc(s.label)}</text>`;
    })
    .join('\n');

  const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${hallWidth} ${hallHeight}" width="${hallWidth}" height="${hallHeight}" style="background:${HALL_VIEWPORT_BG}">
  <title>${esc(TITLE)}</title>
  <desc>Afisha seats as-is + white sector fills on gray viewport (Yandex-like); labels above seats</desc>
  <rect width="100%" height="100%" fill="${HALL_VIEWPORT_BG}" pointer-events="none"/>
  <g id="bolshoi-new-stage-sector-outlines">
${sectorPaths}
  </g>
  <g id="bolshoi-new-stage-scene">
    <text x="${stageX.toFixed(1)}" y="${stageY.toFixed(1)}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" font-weight="600" fill="rgba(90,90,86,0.55)">Сцена</text>
  </g>
  <g id="bolshoi-new-stage-seats" fill="#f97316" stroke="none">
${circles}
  </g>
  <g id="bolshoi-new-stage-sector-labels" pointer-events="none">
${sectorLabels}
  </g>
</svg>
`;

  const allSeatCoordinates = places.map((p) => ({
    xPct: (p.cx / hallWidth) * 100,
    yPct: (p.cy / hallHeight) * 100,
  }));
  const seats = places.map((p) => ({
    sector: p.section,
    row: p.row,
    seat: p.seat,
    xPct: (p.cx / hallWidth) * 100,
    yPct: (p.cy / hallHeight) * 100,
  }));

  const sectorMode = {
    enabled: true,
    source: 'bolshoi-new-stage-afisha-outlines',
    sectors: sectors.map((s) => ({
      id: s.id,
      label: s.label,
      path: s.path,
      maxQuantity: Math.min(8, Math.max(1, s.totalSeats || 8)),
      totalSeats: s.totalSeats,
    })),
  };

  return {
    hallWidth,
    hallHeight,
    places,
    sectors,
    outlineBuilt,
    sectorCounts: Object.fromEntries([...sectorCounts.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ru'))),
    svgMarkup,
    allSeatCoordinates,
    seats,
    sectorMode,
  };
}

async function main() {
  const jsonRel =
    optionalEnv('STAGE_MAP_AFISHA_JSON') ||
    'backend/data/bolshoi-new/afisha-hallplan-levels.json';
  const jsonAbs = path.isAbsolute(jsonRel) ? jsonRel : path.join(REPO_ROOT, jsonRel);
  if (!fs.existsSync(jsonAbs)) throw new Error(`Нет Afisha JSON: ${jsonAbs}`);

  const hallWidth = Number(optionalEnv('STAGE_MAP_HALL_WIDTH', '1373'));
  const hallHeight = Number(optionalEnv('STAGE_MAP_HALL_HEIGHT', '1107'));

  const hallplan = JSON.parse(fs.readFileSync(jsonAbs, 'utf8'));
  const built = buildTheaterLayoutFromAfishaHallplan(hallplan, {
    hallWidth,
    hallHeight,
  });
  console.log(
    `[import-bolshoi-new-stage] transform=${built.outlineBuilt.transform} containment=${built.outlineBuilt.overallPct.toFixed(1)}% (${built.outlineBuilt.insideTotal}/${built.outlineBuilt.seatTotal})`,
  );
  for (const m of built.outlineBuilt.metrics) {
    console.log(`  ${m.label}: ${m.pct}% (${m.inside}/${m.seats}) ${m.source}`);
  }

  const svgOutRel =
    optionalEnv('STAGE_MAP_SVG_PATH') || 'frontend/public/hall-maps/bolshoi-new-stage.svg';
  const svgOut = path.isAbsolute(svgOutRel) ? svgOutRel : path.join(REPO_ROOT, svgOutRel);
  fs.mkdirSync(path.dirname(svgOut), { recursive: true });
  fs.writeFileSync(svgOut, `${built.svgMarkup}\n`, 'utf8');

  const bundleRel =
    optionalEnv('STAGE_MAP_BUNDLE_PATH') ||
    'backend/data/bolshoi-geodesy/hand/bolshoi-new-stage-seats.bundle.json';
  const bundleOut = path.isAbsolute(bundleRel) ? bundleRel : path.join(REPO_ROOT, bundleRel);
  const bundle = {
    builtAt: new Date().toISOString(),
    stageExternalId: STAGE_ID,
    hallWidth: built.hallWidth,
    hallHeight: built.hallHeight,
    note: 'afisha hallplan seats as-is + level.outline gray fills (no hulls, no seat move)',
    seats: built.seats,
  };
  fs.mkdirSync(path.dirname(bundleOut), { recursive: true });
  fs.writeFileSync(bundleOut, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');

  const enrichedOut = path.join(REPO_ROOT, 'frontend/public/tools/bolshoi-new-stage-enriched.svg');
  try {
    fs.mkdirSync(path.dirname(enrichedOut), { recursive: true });
    fs.writeFileSync(enrichedOut, `${built.svgMarkup}\n`, 'utf8');
  } catch {
    /* optional */
  }

  const maxZoom = Number(optionalEnv('STAGE_MAP_MAX_ZOOM_MULTIPLIER', '2'));
  let layoutJson = {
    layoutMode: 'svgNative',
    showUnavailableSeats: true,
    grayHallWhenNoOffers: true,
    showSeatsAtOverview: true,
    allSeatCoordinates: built.allSeatCoordinates,
    seats: built.seats,
    maxZoomMultiplier: Number.isFinite(maxZoom) ? maxZoom : 2,
    sectorFocusZoomMultiplier: Number.isFinite(maxZoom) ? maxZoom : 2,
    hallKind: optionalEnv('STAGE_MAP_HALL_KIND', 'theater'),
    hallViewportBackground: HALL_VIEWPORT_BG,
    preferLayoutSeatPositions: true,
    /** Как Историческая: qty по сектору, без выбора конкретного места. */
    hallPreviewSectorCheckout: true,
    seatSelectionDisabled: true,
    hideSeatList: true,
    /** Надписи поверх canvas-точек (sectorLayer hallMapLabels, z > seats). */
    hallMapLabels: (built.sectors || [])
      .map((s) => {
        const fsPx = (s.totalSeats || 0) <= 8 ? 9 : (s.totalSeats || 0) <= 20 ? 10 : 11;
        const cx = s.centroid?.x;
        const cy = s.centroid?.y;
        if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
        return { text: s.label, x: cx, y: cy, fontSize: fsPx, plate: false };
      })
      .filter(Boolean),
    sectorMode: built.sectorMode,
    pbilet: {
      hallWidth: built.hallWidth,
      hallHeight: built.hallHeight,
    },
    bolshoiNewStage: {
      sourceJson: path.relative(REPO_ROOT, jsonAbs),
      hallWidth: built.hallWidth,
      hallHeight: built.hallHeight,
      placeCount: built.places.length,
      sectorCount: built.sectorMode.sectors.length,
      sectorCounts: built.sectorCounts,
      transform: built.outlineBuilt.transform,
      containmentPct: built.outlineBuilt.overallPct,
      containmentMetrics: built.outlineBuilt.metrics,
      importedAt: new Date().toISOString(),
      pipeline: 'afisha-outline-fills-no-hull-strokes',
    },
    note: 'bolshoi-new: seats as-is; gray fills+⬡ = level.outline; no convex-hull strokes',
  };

  /** Продажа: один сектор «Партер (середина)» = лейбл ManualOffer из seed. */
  const collapsed = collapseBolshoiNewStageToParterMid(layoutJson);
  layoutJson = collapsed.layout;
  console.log(`[import-bolshoi-new-stage] parter collapse: ${collapsed.reason}`);

  const applyDb = truthyEnv('APPLY_DB', false);
  let saved = null;
  if (applyDb) {
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
        STAGE_ID,
        optionalEnv('STAGE_MAP_PLACE_ID'),
        TITLE,
        built.svgMarkup,
        JSON.stringify(layoutJson),
        `Bolshoi new-stage: places=${built.places.length}; outline sectors=${built.sectorMode.sectors.length}; containment=${built.outlineBuilt.overallPct.toFixed(1)}%; no hull strokes`,
        optionalEnv(
          'STAGE_MAP_EXTERNAL_PLAN_URL',
          'https://bolshoi.ru/visit/halls/new_stage/',
        ),
      ],
    );
    saved = result.rows[0];
  }

  console.log(
    JSON.stringify(
      {
        saved,
        applyDb,
        places: built.places.length,
        sectors: built.sectorMode.sectors.length,
        transform: built.outlineBuilt.transform,
        containmentPct: built.outlineBuilt.overallPct,
        sectorCounts: built.sectorCounts,
        hallWidth: built.hallWidth,
        hallHeight: built.hallHeight,
        svg: path.relative(REPO_ROOT, svgOut),
        bundle: path.relative(REPO_ROOT, bundleOut),
        svgBytes: built.svgMarkup.length,
      },
      null,
      2,
    ),
  );
}

main()
  .then(async () => {
    try {
      await ticketPool.end();
    } catch {
      /* ignore */
    }
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    try {
      await ticketPool.end();
    } catch {
      /* ignore */
    }
    process.exit(1);
  });
