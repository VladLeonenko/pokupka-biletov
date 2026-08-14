/**
 * Схема основного зала МХТ → getbilet_stage_maps (theater layout как Вахтангов).
 *
 * Источник SVG (по приоритету):
 *   1) STAGE_MAP_SVG_PATH / native файл
 *   2) уже сохранённый svg_markup в БД (прод)
 *   3) fallback embed (только подложка — без мест)
 *
 * Запуск из backend/:
 *   node scripts/seed-mht-main-hall-stage-map.js
 *   npm run seed:mht-stage-map
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ticketPool from '../ticketDb.js';
import { buildMhtChekhovTheaterLayout } from '../utils/mhtChekhovHallLayout.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STAGE_ID =
  process.env.MHT_STAGE_EXTERNAL_ID?.trim() || '603ad33813cd03003015d811';
/** Legacy seed id — дублируем ряд, чтобы старые ссылки на схему тоже находили SVG. */
const STAGE_ID_ALIASES = [
  STAGE_ID,
  '603ad33813cd03003015d811',
  '639c4a4cd6cfc5004d20dcfb',
].filter((v, i, arr) => arr.indexOf(v) === i);

const TITLE = 'МХТ им. Чехова — основной зал';

const NATIVE_SVG = path.join(
  __dirname,
  '../../frontend/public/hall-maps/mht-chekhov-osnovnoy-zal-native.svg',
);
const FALLBACK_EMBED = path.join(
  __dirname,
  '../../frontend/public/hall-maps/mht-im-chekhova-osnovnoy-zal.embed.svg',
);

function countNativeSeatCircles(svg) {
  const placeNameCount = (svg.match(/<circle\b[^>]*\bplace-name=/gi) || []).length;
  const dataReplacedCount = (svg.match(/<circle\b[^>]*\bdata-replaced=/gi) || []).length;
  return Math.max(placeNameCount, dataReplacedCount);
}

async function loadSvgMarkup() {
  const fromEnv = process.env.STAGE_MAP_SVG_PATH?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) {
    return { svg: fs.readFileSync(fromEnv, 'utf-8'), source: fromEnv };
  }
  if (fs.existsSync(NATIVE_SVG)) {
    return { svg: fs.readFileSync(NATIVE_SVG, 'utf-8'), source: NATIVE_SVG };
  }

  const fromDb = await ticketPool.query(
    `SELECT svg_markup FROM getbilet_stage_maps
     WHERE stage_external_id = ANY($1::text[])
       AND COALESCE(length(svg_markup), 0) > 1000
     ORDER BY updated_at DESC NULLS LAST
     LIMIT 1`,
    [STAGE_ID_ALIASES],
  );
  if (fromDb.rows[0]?.svg_markup && countNativeSeatCircles(fromDb.rows[0].svg_markup) >= 2) {
    return { svg: fromDb.rows[0].svg_markup, source: 'database' };
  }

  if (fs.existsSync(FALLBACK_EMBED)) {
    console.warn('[seed-mht-main-hall-stage-map] нет native SVG, fallback:', FALLBACK_EMBED);
    return { svg: fs.readFileSync(FALLBACK_EMBED, 'utf-8'), source: FALLBACK_EMBED };
  }
  throw new Error('Нет файла схемы МХТ и нет svg_markup в БД');
}

async function main() {
  const { svg: rawSvg, source } = await loadSvgMarkup();
  const nativeSeatCount = countNativeSeatCircles(rawSvg);
  if (nativeSeatCount < 2) {
    console.warn(
      '[seed-mht-main-hall-stage-map] выбранная схема не содержит координат мест:',
      source,
    );
  }

  let svg_markup = rawSvg;
  let layoutJson;
  if (nativeSeatCount >= 2) {
    const built = buildMhtChekhovTheaterLayout(rawSvg);
    svg_markup = built.svgMarkup;
    layoutJson = built.layoutJson;
    console.log(
      '[seed-mht-main-hall-stage-map] theater layout:',
      `seats=${built.nativeSeatCount}`,
      `sectors=${built.sectorsCount}`,
      `source=${source}`,
    );
  } else {
    layoutJson = {
      layoutMode: 'grid',
      nativeSeatCount: 0,
      note: 'grid: в SVG нет координат мест, это только визуальная подложка',
    };
  }

  if (layoutJson.hallKind !== 'theater' || !layoutJson.sectorMode?.enabled) {
    throw new Error(
      '[seed-mht-main-hall-stage-map] отказ: layout без hallKind=theater/sectorMode — не затирать прод голым svgNative',
    );
  }

  const layoutStr = JSON.stringify(layoutJson);
  for (const stageId of STAGE_ID_ALIASES) {
    const r = await ticketPool.query(
      `INSERT INTO getbilet_stage_maps (
         stage_external_id, place_external_id, title, svg_markup, layout_json, updated_at
       )
       VALUES ($1, NULL, $2, $3, $4::jsonb, NOW())
       ON CONFLICT (stage_external_id) DO UPDATE SET
         title = EXCLUDED.title,
         svg_markup = EXCLUDED.svg_markup,
         layout_json = EXCLUDED.layout_json,
         updated_at = NOW()
       RETURNING id, stage_external_id, title`,
      [stageId, TITLE, svg_markup, layoutStr],
    );
    console.log('[seed-mht-main-hall-stage-map] сохранено:', r.rows[0], 'источник:', source);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
