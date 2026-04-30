/**
 * Схема основного зала МХТ: векторный SVG с местами (mht-chekhov-osnovnoy-zal-native.svg) или fallback на растр embed.
 *
 * StageId по умолчанию — из кэша каталога для основного зала МХТ:
 *   MHT_STAGE_EXTERNAL_ID=... node scripts/seed-mht-main-hall-stage-map.js
 *
 * Запуск из каталога backend/:
 *   npm run seed:mht-stage-map
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ticketPool from '../ticketDb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STAGE_ID =
  process.env.MHT_STAGE_EXTERNAL_ID?.trim() || '639c4a4cd6cfc5004d20dcfb';

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
  return placeNameCount + dataReplacedCount;
}

async function main() {
  let svgPath = NATIVE_SVG;
  if (!fs.existsSync(NATIVE_SVG)) {
    console.warn('[seed-mht-main-hall-stage-map] нет native SVG, fallback:', FALLBACK_EMBED);
    svgPath = FALLBACK_EMBED;
  }
  if (!fs.existsSync(svgPath)) {
    console.error('Нет файла схемы:', svgPath);
    process.exit(1);
  }
  const svg_markup = fs.readFileSync(svgPath, 'utf-8');
  const nativeSeatCount = countNativeSeatCircles(svg_markup);
  const layoutJson = JSON.stringify({
    layoutMode: nativeSeatCount >= 2 ? 'svgNative' : 'grid',
    nativeSeatCount,
    note:
      nativeSeatCount >= 2
        ? 'svgNative: места берутся из circle[place-name] или circle[data-replaced]'
        : 'grid: в SVG нет координат мест, это только визуальная подложка',
  });
  if (nativeSeatCount < 2) {
    console.warn(
      '[seed-mht-main-hall-stage-map] выбранная схема не содержит координат мест, интерактив будет только сеткой:',
      path.basename(svgPath),
    );
  }

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
    [STAGE_ID, TITLE, svg_markup, layoutJson],
  );

  console.log('[seed-mht-main-hall-stage-map] сохранено:', r.rows[0], 'источник:', path.basename(svgPath));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
