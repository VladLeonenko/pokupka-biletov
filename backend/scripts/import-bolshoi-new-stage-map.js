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
 *   STAGE_MAP_INCLUDE_DECOR=0  (default) — НЕ клеить afisha-xyz-hallscheme (чужой crop/coords)
 *   STAGE_MAP_DECOR_SVG=…     — только если INCLUDE_DECOR=1
 *   STAGE_MAP_SVG_PATH=frontend/public/hall-maps/bolshoi-new-stage.svg
 *   STAGE_MAP_BUNDLE_PATH=backend/data/bolshoi-geodesy/hand/bolshoi-new-stage-seats.bundle.json
 *
 * Контуры секторов в SVG = convex hull от тех же seat x/y (редактируются в hall editor mode ⬡).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ticketPool from '../ticketDb.js';
import { buildBolshoiSectors } from '../utils/bolshoiHistoricalHallSvg.js';
import { collapseBolshoiNewStageToParterMid } from '../utils/bolshoiNewStageParterCheckout.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const STAGE_ID = process.env.STAGE_MAP_STAGE_ID?.trim() || 'bolshoi-new-stage';
const TITLE = process.env.STAGE_MAP_TITLE?.trim() || 'Большой театр — Новая сцена';

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

function parseHallDimsFromSvg(markup, fallbackW, fallbackH) {
  const vb = markup.match(/viewBox\s*=\s*["']\s*0\s+0\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/i);
  if (vb) {
    return { hallWidth: Math.round(Number(vb[1])), hallHeight: Math.round(Number(vb[2])) };
  }
  const w = markup.match(/<svg\b[^>]*\bwidth="(\d+(?:\.\d+)?)/i);
  const h = markup.match(/<svg\b[^>]*\bheight="(\d+(?:\.\d+)?)/i);
  return {
    hallWidth: w ? Math.round(Number(w[1])) : fallbackW,
    hallHeight: h ? Math.round(Number(h[1])) : fallbackH,
  };
}

/** Decorative Afisha hallscheme (paths/labels) without nested <svg>. */
function extractDecorInner(markup) {
  if (!markup) return '';
  const m = markup.match(/<svg\b[^>]*>([\s\S]*)<\/svg>/i);
  let inner = m ? m[1] : markup;
  // drop nested svg if any
  inner = inner.replace(/<\/?svg\b[^>]*>/gi, '');
  return inner.trim();
}

/**
 * @param {{ levels: Array<{ id?: number, name: string, seats: Array<{ place: string, row: string, x_coord: number, y_coord: number }> }>, stage?: object }} hallplan
 * @param {{ hallWidth: number, hallHeight: number, decorInner?: string }} opts
 */
export function buildTheaterLayoutFromAfishaHallplan(hallplan, opts) {
  const { hallWidth, hallHeight, decorInner = '' } = opts;
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

  const sectors = buildBolshoiSectors(places);
  const rDot = Math.max(2.4, Math.min(hallWidth, hallHeight) * 0.0026);
  const circles = places
    .map(
      (p) =>
        `    <circle cx="${p.cx.toFixed(2)}" cy="${p.cy.toFixed(2)}" r="${rDot.toFixed(2)}" place-name="${esc(p.section)}" row="${esc(p.row)}" place="${esc(p.seat)}" fill="#c8ccd4" stroke="none"/>`,
    )
    .join('\n');

  const stage = hallplan.stage && typeof hallplan.stage === 'object' ? hallplan.stage : null;
  const stageX = stage && Number.isFinite(Number(stage.x_coord))
    ? Number(stage.x_coord) + (Number(stage.width) || 0) / 2
    : hallWidth / 2;
  const stageY = stage && Number.isFinite(Number(stage.y_coord))
    ? Number(stage.y_coord) + 8
    : Math.round(hallHeight * 0.97);

  const decorBlock = decorInner
    ? `  <g id="bolshoi-new-stage-decor" opacity="0.55" pointer-events="none">\n${decorInner}\n  </g>\n`
    : '';

  const sectorOutlines = sectors
    .map(
      (s) =>
        `    <path class="sector-contour" d="${esc(s.path)}" fill="none" stroke="rgba(15,23,42,0.45)" stroke-width="1.6" data-sector="${esc(s.label)}" pointer-events="stroke"/>`,
    )
    .join('\n');

  const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${hallWidth} ${hallHeight}" width="${hallWidth}" height="${hallHeight}">
  <title>${esc(TITLE)}</title>
  <desc>Yandex Afisha hallplan levels JSON — labeled seats, no NN align</desc>
${decorBlock}  <g id="bolshoi-new-stage-scene">
    <text x="${stageX.toFixed(1)}" y="${stageY.toFixed(1)}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" font-weight="600" fill="rgba(15, 23, 42, 0.45)">Сцена</text>
  </g>
  <g id="bolshoi-new-stage-sector-outlines" fill="none">
${sectorOutlines}
  </g>
  <g id="bolshoi-new-stage-seats" fill="#c8ccd4" stroke="none">
${circles}
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
    source: 'bolshoi-new-stage-afisha-levels',
    sectors: sectors.map((s) => ({
      id: s.id,
      label: s.label,
      path: s.path,
      maxQuantity: Math.min(8, Math.max(1, s.totalSeats || 8)),
    })),
  };

  return {
    hallWidth,
    hallHeight,
    places,
    sectors,
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

  const includeDecor = truthyEnv('STAGE_MAP_INCLUDE_DECOR', false);
  const decorRel =
    optionalEnv('STAGE_MAP_DECOR_SVG') ||
    'backend/data/bolshoi-new/afisha-xyz-hallscheme.svg';
  const decorAbs = path.isAbsolute(decorRel) ? decorRel : path.join(REPO_ROOT, decorRel);
  /** По умолчанию без xyz-декора: чужая СК → контуры «плывут» относительно кружков мест. */
  const decorMarkup =
    includeDecor && fs.existsSync(decorAbs) ? fs.readFileSync(decorAbs, 'utf8') : '';

  const dims = decorMarkup
    ? parseHallDimsFromSvg(decorMarkup, 1373, 1107)
    : { hallWidth: 1373, hallHeight: 1107 };
  const hallWidth = Number(optionalEnv('STAGE_MAP_HALL_WIDTH', String(dims.hallWidth)));
  const hallHeight = Number(optionalEnv('STAGE_MAP_HALL_HEIGHT', String(dims.hallHeight)));

  const hallplan = JSON.parse(fs.readFileSync(jsonAbs, 'utf8'));
  const built = buildTheaterLayoutFromAfishaHallplan(hallplan, {
    hallWidth,
    hallHeight,
    decorInner: decorMarkup ? extractDecorInner(decorMarkup) : '',
  });

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
    note: 'afisha hallplan levels → seats (no NN align)',
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
    hallViewportBackground: '#ffffff',
    preferLayoutSeatPositions: true,
    /** Как Историческая: qty по сектору, без выбора конкретного места. */
    hallPreviewSectorCheckout: true,
    seatSelectionDisabled: true,
    hideSeatList: true,
    sectorMode: built.sectorMode,
    pbilet: {
      hallWidth: built.hallWidth,
      hallHeight: built.hallHeight,
    },
    bolshoiNewStage: {
      sourceJson: path.relative(REPO_ROOT, jsonAbs),
      decorSvg: decorMarkup ? path.relative(REPO_ROOT, decorAbs) : null,
      includeDecor,
      hallWidth: built.hallWidth,
      hallHeight: built.hallHeight,
      placeCount: built.places.length,
      sectorCount: built.sectorMode.sectors.length,
      sectorCounts: built.sectorCounts,
      importedAt: new Date().toISOString(),
      pipeline: 'afisha-json-direct-hulls',
    },
    note: 'bolshoi-new: Afisha hallplan JSON seats + hull paths from same coords (no xyz decor)',
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
        `Bolshoi new-stage Afisha import: places=${built.places.length}; sectors=${built.sectorMode.sectors.length}; from ${path.basename(jsonAbs)}`,
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
