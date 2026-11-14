/**
 * Театр Наций — Основная сцена.
 * Тот же hallplan-пайплайн, что Новая сцена Большого (outline + все места).
 *
 *   npm run seed:nations-main-stage-map
 *
 * Источник: backend/data/theatre-nations/main-yandex-hallscheme.json
 * (Yandex hallplanSchemeUrl, 540 мест).
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import ticketPool from '../ticketDb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const NATIONS_MAIN_STAGE_ID = '6052f78013cd03003015deb0';

async function main() {
  const env = {
    ...process.env,
    APPLY_DB: process.env.APPLY_DB?.trim() || '1',
    STAGE_MAP_SEAT_CHECKOUT: '1',
    STAGE_MAP_STAGE_ID: process.env.STAGE_MAP_STAGE_ID?.trim() || NATIONS_MAIN_STAGE_ID,
    STAGE_MAP_PLACE_ID:
      process.env.STAGE_MAP_PLACE_ID?.trim() || '6052f75013cd03003015deae',
    STAGE_MAP_TITLE: process.env.STAGE_MAP_TITLE?.trim() || 'Театр Наций — Основная сцена',
    STAGE_MAP_AFISHA_JSON:
      process.env.STAGE_MAP_AFISHA_JSON?.trim() ||
      'backend/data/theatre-nations/main-yandex-hallscheme.json',
    STAGE_MAP_SVG_PATH:
      process.env.STAGE_MAP_SVG_PATH?.trim() ||
      'frontend/public/hall-maps/nations-main-stage.svg',
    STAGE_MAP_ENRICHED_SVG:
      process.env.STAGE_MAP_ENRICHED_SVG?.trim() ||
      'frontend/public/tools/nations-main-stage-enriched.svg',
    STAGE_MAP_BUNDLE_PATH:
      process.env.STAGE_MAP_BUNDLE_PATH?.trim() ||
      'backend/data/theatre-nations/hand/nations-main-stage-seats.bundle.json',
    STAGE_MAP_MAX_ZOOM_MULTIPLIER: process.env.STAGE_MAP_MAX_ZOOM_MULTIPLIER?.trim() || '8',
    STAGE_MAP_HALL_WIDTH: process.env.STAGE_MAP_HALL_WIDTH?.trim() || '1200',
    STAGE_MAP_HALL_HEIGHT: process.env.STAGE_MAP_HALL_HEIGHT?.trim() || '1040',
    STAGE_MAP_HALL_KIND: 'theater',
    STAGE_MAP_EXTERNAL_PLAN_URL:
      process.env.STAGE_MAP_EXTERNAL_PLAN_URL?.trim() || 'https://theatreofnations.ru/',
    STAGE_MAP_NOTE:
      'nations main: yandex hallplan seats as-is + level.outline; sellable from GetBilet',
  };

  const importScript = path.join(__dirname, 'import-bolshoi-new-stage-map.js');
  const r = spawnSync(process.execPath, [importScript], {
    cwd: path.join(__dirname, '..'),
    env,
    stdio: 'inherit',
  });
  if (r.status !== 0) process.exit(r.status ?? 1);

  await ticketPool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
