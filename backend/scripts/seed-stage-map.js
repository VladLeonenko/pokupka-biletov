/**
 * Универсальная загрузка SVG-схемы GetBilet stage в getbilet_stage_maps.
 *
 * Пример:
 *   STAGE_MAP_STAGE_ID=66f16a8c09a369003081a02f \
 *   STAGE_MAP_TITLE="Лукойл Арена — Спартак - ЦСКА" \
 *   STAGE_MAP_SVG_PATH=../frontend/public/hall-maps/lukoil-arena-spartak-cska.svg \
 *   npm run seed:stage-map
 *
 * Экспорт с чужого билетного фронта (pbilet-подобные data-id="385480_uuid"):
 *   STAGE_MAP_NORMALIZE_DATA_IDS=1 — убрать числовой префикс перед «_» в data-id (как у import:pbilet-stage-map).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ticketPool from '../ticketDb.js';
import { normalizeHallSvgDataIds } from '../utils/normalizeHallSvgDataIds.js';
import { buildTheaterHallSectorMode } from '../utils/theaterHallSvgSectorMode.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} обязателен`);
  }
  return value;
}

function optionalEnv(name) {
  return process.env[name]?.trim() || null;
}

function truthyEnv(name) {
  const v = process.env[name]?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function resolveFromRepo(value) {
  if (path.isAbsolute(value)) return value;
  return path.resolve(repoRoot, value);
}

function countNativeSeatCircles(svg) {
  const placeNameCount = (svg.match(/<circle\b[^>]*\bplace-name=/gi) || []).length;
  const dataReplacedCount = (svg.match(/<circle\b[^>]*\bdata-replaced=/gi) || []).length;
  return placeNameCount + dataReplacedCount;
}

function countSectorPaths(svg) {
  return (svg.match(/<path\b[^>]*\bdata-id=/gi) || []).length;
}

function parseLayoutJson(nativeSeatCount, sectorPathCount, svgMarkup) {
  const raw = optionalEnv('STAGE_MAP_LAYOUT_JSON');
  if (raw) return JSON.parse(raw);

  const requestedMode = optionalEnv('STAGE_MAP_LAYOUT_MODE');
  const layoutMode =
    requestedMode || (nativeSeatCount >= 2 ? 'svgNative' : 'grid');

  const layout = {
    layoutMode,
    nativeSeatCount,
    sectorPathCount,
    note:
      nativeSeatCount >= 2
        ? 'svgNative: места берутся из circle[place-name] или circle[data-replaced]'
        : 'grid: в SVG нет координат мест; нужна sector/path-разметка или overlayRect для точной кликабельности',
  };

  if (truthyEnv('STAGE_MAP_SECTOR_MODE_FROM_SVG')) {
    const sectorMode = buildTheaterHallSectorMode(svgMarkup, { source: 'svg-paths' });
    if (!sectorMode.enabled) {
      throw new Error('STAGE_MAP_SECTOR_MODE_FROM_SVG: в SVG нет path[data-id][data-name]');
    }
    const excludeReRaw = optionalEnv('STAGE_MAP_SECTOR_EXCLUDE_LABEL_RE');
    if (excludeReRaw) {
      const excludeRe = new RegExp(excludeReRaw, 'i');
      sectorMode.sectors = sectorMode.sectors.filter((s) => !excludeRe.test(String(s.label || '')));
      sectorMode.enabled = sectorMode.sectors.length > 0;
      if (!sectorMode.enabled) {
        throw new Error('STAGE_MAP_SECTOR_EXCLUDE_LABEL_RE: после фильтра не осталось секторов');
      }
    }
    layout.sectorMode = sectorMode;
    layout.layoutMode = requestedMode || 'svgNative';
    layout.note =
      nativeSeatCount >= 2
        ? layout.note
        : 'svgNative + sectorMode: клик по секторам из path[data-id][data-name]; места без координат — из офферов';
  }

  const hallKind = optionalEnv('STAGE_MAP_HALL_KIND');
  if (hallKind) layout.hallKind = hallKind;

  const hallWidth = Number(optionalEnv('STAGE_MAP_HALL_WIDTH') || '');
  const hallHeight = Number(optionalEnv('STAGE_MAP_HALL_HEIGHT') || '');
  if (Number.isFinite(hallWidth) && hallWidth > 0 && Number.isFinite(hallHeight) && hallHeight > 0) {
    layout.pbilet = {
      ...(layout.pbilet && typeof layout.pbilet === 'object' ? layout.pbilet : {}),
      hallWidth,
      hallHeight,
    };
  }

  const maxZoom = Number(optionalEnv('STAGE_MAP_MAX_ZOOM_MULTIPLIER') || '');
  if (Number.isFinite(maxZoom) && maxZoom >= 1) {
    layout.maxZoomMultiplier = maxZoom;
    layout.sectorFocusZoomMultiplier = maxZoom;
  }

  if (truthyEnv('STAGE_MAP_PREFER_LAYOUT_SEATS')) {
    layout.preferLayoutSeatPositions = true;
  }

  if (truthyEnv('STAGE_MAP_GRAY_HALL_WHEN_NO_OFFERS')) {
    layout.grayHallWhenNoOffers = true;
  }

  return layout;
}

async function main() {
  const stageId = requiredEnv('STAGE_MAP_STAGE_ID');
  const title = requiredEnv('STAGE_MAP_TITLE');
  const svgPath = resolveFromRepo(requiredEnv('STAGE_MAP_SVG_PATH'));
  const placeExternalId = optionalEnv('STAGE_MAP_PLACE_ID');
  const notesInternal = optionalEnv('STAGE_MAP_NOTES');
  const externalPlanUrl = optionalEnv('STAGE_MAP_EXTERNAL_PLAN_URL');

  if (!fs.existsSync(svgPath)) {
    throw new Error(`SVG-файл не найден: ${svgPath}`);
  }

  let svgMarkup = fs.readFileSync(svgPath, 'utf-8').trim();
  if (truthyEnv('STAGE_MAP_NORMALIZE_DATA_IDS')) {
    const before = svgMarkup;
    svgMarkup = normalizeHallSvgDataIds(svgMarkup);
    const n = [...before.matchAll(/\bdata-id\s*=\s*["'](\d+)_/gi)].length;
    if (n) console.log(`[seed-stage-map] STAGE_MAP_NORMALIZE_DATA_IDS: нормализовано data-id с числовым префиксом: ~${n}`);
  }
  if (!svgMarkup.includes('<svg')) {
    throw new Error(`Файл не похож на SVG: ${svgPath}`);
  }

  const nativeSeatCount = countNativeSeatCircles(svgMarkup);
  const sectorPathCount = countSectorPaths(svgMarkup);
  const layoutJson = parseLayoutJson(nativeSeatCount, sectorPathCount, svgMarkup);

  if (nativeSeatCount < 2) {
    console.warn(
      '[seed-stage-map] SVG не содержит координаты отдельных мест.',
      `path[data-id]: ${sectorPathCount}.`,
      'Для точной схемы нужен STAGE_MAP_LAYOUT_JSON с координатами/маппингом или SVG с атрибутами мест.',
    );
  }

  const r = await ticketPool.query(
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
     RETURNING id, stage_external_id, title,
       (svg_markup IS NOT NULL AND length(trim(svg_markup)) > 0) AS has_svg,
       layout_json`,
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

  const saved = r.rows[0] || {};
  const sectorModeCount = Array.isArray(saved.layout_json?.sectorMode?.sectors)
    ? saved.layout_json.sectorMode.sectors.length
    : 0;
  console.log(
    JSON.stringify(
      {
        saved: {
          id: saved.id,
          stage_external_id: saved.stage_external_id,
          title: saved.title,
          has_svg: saved.has_svg,
          sectorModeCount,
          layoutMode: saved.layout_json?.layoutMode ?? null,
          hallKind: saved.layout_json?.hallKind ?? null,
        },
        source: path.relative(repoRoot, svgPath),
        nativeSeatCount,
        sectorPathCount,
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
