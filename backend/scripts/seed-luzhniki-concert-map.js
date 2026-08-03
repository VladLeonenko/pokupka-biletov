/**
 * Концертная раскладка БСА Лужники (Баста — Guf и т.п.) на fast-path как НН:
 * sectorMode из концертного SVG → football → поворот «сцена снизу» (как Яндекс),
 * PNG-чаша повёрнута, sellable из pilot seats.
 *
 *   cd backend && npm run seed:luzhniki-concert-map
 *
 * Ключ схемы: luzhniki-concert
 * Репертуар Баста — Guf: 69ac1c5246a4d000309ecd5c
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import ticketPool from '../ticketDb.js';
import { LUZHNIKI_FOOTBALL_STAGE_MAP_KEY } from '../services/luzhnikiFootballStageMap.js';
import { footballStadiumCheckoutLayoutFlags } from '../utils/footballStadiumCheckoutLayout.js';
import { buildTheaterHallSectorMode } from '../utils/theaterHallSvgSectorMode.js';
import {
  LUZHNIKI_CONCERT_STAGE_BOTTOM_VIEWBOX,
  LUZHNIKI_FOOTBALL_VIEWBOX,
  footballPathToConcertStageBottom,
  transformConcertSectorPath,
} from '../utils/luzhnikiConcertToFootballTransform.js';
import { LUZHNIKI_PILOT_SEATS_REL_PATH } from '../utils/luzhnikiSeatIndexCache.js';
import { normalizeSectorLabel } from '../utils/ticketHallSectorNormalize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

export const LUZHNIKI_CONCERT_STAGE_MAP_KEY = 'luzhniki-concert';
export const BASTA_GUF_REPERTOIRE_ID = '69ac1c5246a4d000309ecd5c';
/** Устаревший theater-seed на GetBilet StageId — удаляем при сиде. */
const LEGACY_CONCERT_STAGE_ID = '6400ff2dd6cfc5004d20e9e9';

const CONCERT_SVG_REL = 'frontend/public/hall-maps/luzhniki-concert.svg';
const FOOTBALL_GRAY_BOWL_ABS = path.join(
  repoRoot,
  'frontend/public/hall-maps/luzhniki-football-gray-bowl.png',
);
const CONCERT_GRAY_BOWL_REL = '/hall-maps/luzhniki-concert-gray-bowl.png';
const CONCERT_GRAY_BOWL_ABS = path.join(repoRoot, 'frontend/public', CONCERT_GRAY_BOWL_REL.replace(/^\//, ''));
const PILOT_SEATS_ABS = path.join(repoRoot, 'backend', LUZHNIKI_PILOT_SEATS_REL_PATH);

function escAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function parseLayout(row) {
  let layout = row?.layout_json;
  if (typeof layout === 'string') {
    try {
      layout = JSON.parse(layout);
    } catch {
      layout = {};
    }
  }
  return layout && typeof layout === 'object' ? { ...layout } : {};
}

function pathCentroid(pathD) {
  const nums = String(pathD || '').match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
  if (!nums || nums.length < 4) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = Number(nums[i]);
    const y = Number(nums[i + 1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minX) || maxX <= minX || maxY <= minY) return null;
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, minX, minY, maxX, maxY };
}

async function writeConcertGrayBowlPng() {
  if (!fs.existsSync(FOOTBALL_GRAY_BOWL_ABS)) {
    throw new Error(`Нет football gray bowl: ${FOOTBALL_GRAY_BOWL_ABS}`);
  }
  await sharp(FOOTBALL_GRAY_BOWL_ABS).rotate(90).png().toFile(CONCERT_GRAY_BOWL_ABS);
}

async function main() {
  const svgPath = path.join(repoRoot, CONCERT_SVG_REL);
  if (!fs.existsSync(svgPath)) throw new Error(`Нет SVG: ${svgPath}`);

  const football = await ticketPool.query(
    `SELECT stage_external_id, place_external_id, title, svg_markup, layout_json, external_plan_url
     FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [LUZHNIKI_FOOTBALL_STAGE_MAP_KEY],
  );
  if (!football.rows[0]) {
    throw new Error(
      `Нет ${LUZHNIKI_FOOTBALL_STAGE_MAP_KEY} в БД. Сначала: npm run ensure:luzhniki-football-map`,
    );
  }

  const concertSvg = fs.readFileSync(svgPath, 'utf8');
  const sectorMode = buildTheaterHallSectorMode(concertSvg, { source: 'luzhniki-concert-svg' });
  if (!sectorMode.enabled) throw new Error('В концертном SVG нет path[data-id][data-name]');

  sectorMode.sectors = sectorMode.sectors
    .filter((s) => !/\(целиком\)\s*$/i.test(String(s.label || '')))
    .map((s) => ({
      ...s,
      path: footballPathToConcertStageBottom(transformConcertSectorPath(s.path)),
    }));
  sectorMode.enabled = sectorMode.sectors.length > 0;
  if (!sectorMode.enabled) throw new Error('После фильтра/трансформа секторов не осталось');

  const { width, height } = LUZHNIKI_CONCERT_STAGE_BOTTOM_VIEWBOX;
  const pathsXml = sectorMode.sectors
    .map(
      (s) =>
        `  <path data-id="${escAttr(s.id)}" data-type="level" data-name="${escAttr(s.label)}" d="${escAttr(s.path)}"/>`,
    )
    .join('\n');

  const dance = sectorMode.sectors.find((s) => normalizeSectorLabel(s.label) === normalizeSectorLabel('танцпол'));
  const fan = sectorMode.sectors.find(
    (s) =>
      normalizeSectorLabel(s.label) === normalizeSectorLabel('фан-зона') ||
      normalizeSectorLabel(s.label) === normalizeSectorLabel('fan-zone'),
  );
  const danceC = dance ? pathCentroid(dance.path) : null;
  const fanC = fan ? pathCentroid(fan.path) : null;
  const stageY = fanC ? Math.min(height - 180, fanC.maxY + (height - fanC.maxY) * 0.45) : height * 0.92;
  const stageX = width / 2;

  /** Подписи рисует FE поверх PNG (canvas); в svg_markup — дубль для не-canvas. */
  const hallMapLabels = [
    danceC ? { text: 'Танцпол', x: danceC.x, y: danceC.y, fontSize: 220 } : null,
    fanC ? { text: 'Фан-зона', x: fanC.x, y: fanC.y, fontSize: 200 } : null,
    { text: 'Сцена', x: stageX, y: stageY, fontSize: 180 },
  ].filter(Boolean);

  const labelsXml = hallMapLabels
    .map(
      (l) =>
        `  <text x="${Number(l.x).toFixed(1)}" y="${Number(l.y).toFixed(1)}" font-size="${l.fontSize}" font-weight="700" fill="#475569" text-anchor="middle" dominant-baseline="middle">${escAttr(l.text)}</text>`,
    )
    .join('\n');

  const svgMarkup = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <title>Лужники — концерт (БСА)</title>
  <rect x="0" y="0" width="${width}" height="${height}" fill="#f1f5f9"/>
  <g id="luzhniki-concert-sectors" fill="rgba(15,23,42,0.04)" stroke="rgba(15,23,42,0.14)" stroke-width="6">
${pathsXml}
  </g>
  <g id="luzhniki-concert-zone-labels" font-family="system-ui, -apple-system, Segoe UI, sans-serif" pointer-events="none">
${labelsXml}
  </g>
</svg>
`;

  const baseLayout = parseLayout(football.rows[0]);
  const {
    sellableSeats: _s,
    offerSeatGeodesy: _o,
    sectorMode: _oldSectors,
    hallKind: _hk,
    allSeatCoordinates: _cloud,
    seats: _inlineSeats,
    backgroundSeats: _bg,
    ...keep
  } = baseLayout;

  if (!fs.existsSync(PILOT_SEATS_ABS)) {
    throw new Error(
      `Нет pilot seats: ${PILOT_SEATS_ABS}. Сначала: npm run build:luzhniki-stadium-pilot`,
    );
  }
  let pilotSeatCount = 0;
  try {
    const pilot = JSON.parse(fs.readFileSync(PILOT_SEATS_ABS, 'utf8'));
    pilotSeatCount = Array.isArray(pilot) ? pilot.length : 0;
  } catch (e) {
    throw new Error(`Не читается pilot seats: ${e?.message || e}`);
  }

  await writeConcertGrayBowlPng();

  const layoutJson = footballStadiumCheckoutLayoutFlags(
    {
      ...keep,
      layoutMode: keep.layoutMode || 'svgNative',
      sectorMode,
      hallBackgroundRasterUrl: CONCERT_GRAY_BOWL_REL,
      hideSeatList: true,
      concertMapOrientation: 'stage-bottom',
      concertSeatPctFromFootball: true,
      hallMapLabels,
      layoutSeatsStoredInFile: true,
      luzhnikiPilotSeatsFile: LUZHNIKI_PILOT_SEATS_REL_PATH,
      layoutSeatsCount: pilotSeatCount,
      luzhnikiPilotMergedAt: new Date().toISOString(),
      omitClientSeatCoordinateCloud: true,
      pbilet: {
        ...(keep.pbilet && typeof keep.pbilet === 'object' ? keep.pbilet : {}),
        hallWidth: width,
        hallHeight: height,
      },
      geodesy: {
        ...(keep.geodesy && typeof keep.geodesy === 'object' ? keep.geodesy : {}),
        hallWidth: width,
        hallHeight: height,
      },
      note:
        'luzhniki-concert: SVG→football→stage-bottom; sellable=pilot pct rotated; hideSeatList; zone labels',
    },
    LUZHNIKI_CONCERT_STAGE_MAP_KEY,
  );

  const saved = await ticketPool.query(
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
      LUZHNIKI_CONCERT_STAGE_MAP_KEY,
      football.rows[0].place_external_id,
      'Лужники — концерт (БСА)',
      svgMarkup,
      JSON.stringify(layoutJson),
      `Concert stage-bottom; repertoire ${BASTA_GUF_REPERTOIRE_ID}; sectors=${sectorMode.sectors.length}; seats=${pilotSeatCount}`,
      football.rows[0].external_plan_url,
    ],
  );

  const del = await ticketPool.query(
    `DELETE FROM getbilet_stage_maps WHERE stage_external_id = $1 RETURNING stage_external_id`,
    [LEGACY_CONCERT_STAGE_ID],
  );

  const outSvg = path.join(repoRoot, 'frontend/public/hall-maps/luzhniki-concert-football-space.svg');
  fs.writeFileSync(outSvg, svgMarkup, 'utf8');

  console.log(
    JSON.stringify(
      {
        saved: saved.rows[0],
        sectors: sectorMode.sectors.length,
        viewBox: { width, height },
        footballViewBox: LUZHNIKI_FOOTBALL_VIEWBOX,
        pilotSeats: pilotSeatCount,
        grayBowl: CONCERT_GRAY_BOWL_REL,
        labels: {
          dance: danceC ? { x: danceC.x, y: danceC.y } : null,
          fan: fanC ? { x: fanC.x, y: fanC.y } : null,
          stage: { x: stageX, y: stageY },
        },
        deletedLegacyTheater: del.rows.map((r) => r.stage_external_id),
        transformedSvg: path.relative(repoRoot, outSvg),
        repertoire: BASTA_GUF_REPERTOIRE_ID,
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => ticketPool.end().then(() => process.exit(0)))
  .catch(async (e) => {
    console.error(e);
    try {
      await ticketPool.end();
    } catch {
      /* ignore */
    }
    process.exit(1);
  });
