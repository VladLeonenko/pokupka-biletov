/**
 * Импорт схемы Лужников из локального Inkscape SVG в getbilet_stage_maps.
 *
 * Ожидаемая разметка: `<g id="C248">` (буква трибуны A–D + номер, или VIP) с вложенными `path[d]`.
 * Координаты мест — синтетические по bbox сектора (как демо-превью), пока не будет маппинга на офферы GetBilet.
 *
 * Пример:
 *   STAGE_MAP_STAGE_ID=<Mongo Stage._id события> \
 *   STAGE_MAP_TITLE="Лужники — финал Кубка России" \
 *   LUZHNIKI_INKSCAPE_SVG_PATH=frontend/public/maps/luzhniki-go.svg \
 *   npm run import:luzhniki-inkscape-stage-map
 *
 * Для боевых координат мест из донора используйте import:pbilet-stage-map (layout 1173 для финала Кубка на pbilet).
 */

import fs from 'node:fs';

import ticketPool from '../ticketDb.js';
import { normalizeHallSvgDataIds } from '../utils/normalizeHallSvgDataIds.js';
import { parseLuzhnikiInkscapeStadiumSvg } from '../utils/luzhnikiInkscapeSvg.js';
import { resolveFromRepo } from '../utils/projectPaths.js';

const DEFAULT_REL_SVG = 'frontend/public/maps/luzhniki-go.svg';

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} обязателен`);
  return value;
}

function optionalEnv(name, fallback = null) {
  return process.env[name]?.trim() || fallback;
}

async function main() {
  const stageId = requiredEnv('STAGE_MAP_STAGE_ID');
  const title = requiredEnv('STAGE_MAP_TITLE');
  const placeExternalId = optionalEnv('STAGE_MAP_PLACE_ID');
  const notesInternalExtra = optionalEnv('STAGE_MAP_NOTES');
  const externalPlanUrl = optionalEnv(
    'STAGE_MAP_EXTERNAL_PLAN_URL',
    'https://luzhnikikassa.ru/final-kubka-rossii-po-futbolu',
  );

  const rel = process.env.LUZHNIKI_INKSCAPE_SVG_PATH?.trim() || DEFAULT_REL_SVG;
  const abs = resolveFromRepo(rel);
  if (!fs.existsSync(abs)) {
    throw new Error(
      `SVG не найден: ${abs}. Сохраните экспорт Inkscape как frontend/public/maps/luzhniki-go.svg или задайте LUZHNIKI_INKSCAPE_SVG_PATH.`,
    );
  }

  let svgMarkup = fs.readFileSync(abs, 'utf-8').trim();
  svgMarkup = normalizeHallSvgDataIds(svgMarkup);

  const parsed = parseLuzhnikiInkscapeStadiumSvg(svgMarkup, {
    seatsPerSector: Number(process.env.LUZHNIKI_INKSCAPE_SEATS_PER_SECTOR) || 14,
  });

  if (parsed.sectors.length === 0) {
    throw new Error(
      'Не найдено секторов Inkscape. Нужны группы вида <g id="C248"> с path[d] внутри.',
    );
  }

  const allSeatCoordinates = parsed.seats.map((s) => ({ xPct: s.xPct, yPct: s.yPct }));

  const layoutJson = {
    layoutMode: 'svgNative',
    showUnavailableSeats: false,
    seats: parsed.seats,
    allSeatCoordinates,
    sectorMode: {
      enabled: true,
      source: 'inkscape',
      sectors: parsed.sectors,
    },
    inkscape: {
      svgPath: abs,
      importedAt: new Date().toISOString(),
    },
    note:
      'Inkscape import: контуры секторов из id=A/B/C/D…; места синтетические по bbox до сопоставления с офферами GetBilet.',
  };

  const notesInternal =
    `Inkscape: ${abs}; sectors=${parsed.sectors.length}; seats=${parsed.seats.length}` +
    (notesInternalExtra ? `. ${notesInternalExtra}` : '');

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
      parsed.svgMarkupOut,
      JSON.stringify(layoutJson),
      notesInternal,
      externalPlanUrl,
    ],
  );

  console.log(
    JSON.stringify(
      {
        saved: result.rows[0],
        svgPath: abs,
        sectors: parsed.sectors.length,
        seats: parsed.seats.length,
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
