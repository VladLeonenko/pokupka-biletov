/**
 * Театр Наций — Малая сцена.
 * Координаты мест — схема theatreofnations.ru (5×21, Партер),
 * шаг приведен к 20px, как у Основной сцены. Outline — прямоугольник партера.
 *
 *   npm run seed:nations-small-stage-map
 *
 * Источник: backend/data/theatre-nations/small-hallscheme.json
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import ticketPool from '../ticketDb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const NATIONS_SMALL_STAGE_ID = '6052f80413cd03003015deb6';

async function main() {
  const env = {
    ...process.env,
    APPLY_DB: process.env.APPLY_DB?.trim() || '1',
    STAGE_MAP_SEAT_CHECKOUT: '1',
    STAGE_MAP_STAGE_ID: process.env.STAGE_MAP_STAGE_ID?.trim() || NATIONS_SMALL_STAGE_ID,
    STAGE_MAP_PLACE_ID:
      process.env.STAGE_MAP_PLACE_ID?.trim() || '6052f75013cd03003015deae',
    STAGE_MAP_TITLE: process.env.STAGE_MAP_TITLE?.trim() || 'Театр Наций — Малая сцена',
    STAGE_MAP_AFISHA_JSON:
      process.env.STAGE_MAP_AFISHA_JSON?.trim() ||
      'backend/data/theatre-nations/small-hallscheme.json',
    STAGE_MAP_SVG_PATH:
      process.env.STAGE_MAP_SVG_PATH?.trim() ||
      'frontend/public/hall-maps/nations-small-stage.svg',
    STAGE_MAP_ENRICHED_SVG:
      process.env.STAGE_MAP_ENRICHED_SVG?.trim() ||
      'frontend/public/tools/nations-small-stage-enriched.svg',
    STAGE_MAP_BUNDLE_PATH:
      process.env.STAGE_MAP_BUNDLE_PATH?.trim() ||
      'backend/data/theatre-nations/hand/nations-small-stage-seats.bundle.json',
    STAGE_MAP_MAX_ZOOM_MULTIPLIER: process.env.STAGE_MAP_MAX_ZOOM_MULTIPLIER?.trim() || '8',
    STAGE_MAP_HALL_WIDTH: process.env.STAGE_MAP_HALL_WIDTH?.trim() || '520',
    STAGE_MAP_HALL_HEIGHT: process.env.STAGE_MAP_HALL_HEIGHT?.trim() || '190',
    STAGE_MAP_HALL_KIND: 'theater',
    STAGE_MAP_EXTERNAL_PLAN_URL:
      process.env.STAGE_MAP_EXTERNAL_PLAN_URL?.trim() || 'https://theatreofnations.ru/',
    STAGE_MAP_NOTE:
      'nations small: theatreofnations hall schema, pitch 20px, parter outline; sellable from GetBilet',
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
