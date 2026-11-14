/**
 * Большой Московский цирк — Манеж.
 * Тот же hallplan-пайплайн, что Новая сцена Большого (outline + все места).
 *
 *   npm run seed:big-circus-stage-map
 *
 * Источник: backend/data/big-circus/yandex-hallscheme.json
 * (Yandex hallplanSchemeUrl, 3287 мест, секторы А–Е и ложи).
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import ticketPool from '../ticketDb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const BIG_CIRCUS_STAGE_ID = '656b3e2f3bd226003014fde6';

async function main() {
  const env = {
    ...process.env,
    APPLY_DB: process.env.APPLY_DB?.trim() || '1',
    STAGE_MAP_SEAT_CHECKOUT: '1',
    STAGE_MAP_STAGE_ID: process.env.STAGE_MAP_STAGE_ID?.trim() || BIG_CIRCUS_STAGE_ID,
    STAGE_MAP_TITLE:
      process.env.STAGE_MAP_TITLE?.trim() || 'Большой Московский цирк — Манеж',
    STAGE_MAP_AFISHA_JSON:
      process.env.STAGE_MAP_AFISHA_JSON?.trim() ||
      'backend/data/big-circus/yandex-hallscheme.json',
    STAGE_MAP_SVG_PATH:
      process.env.STAGE_MAP_SVG_PATH?.trim() ||
      'frontend/public/hall-maps/big-circus-manezh.svg',
    STAGE_MAP_ENRICHED_SVG:
      process.env.STAGE_MAP_ENRICHED_SVG?.trim() ||
      'frontend/public/tools/big-circus-manezh-enriched.svg',
    STAGE_MAP_BUNDLE_PATH:
      process.env.STAGE_MAP_BUNDLE_PATH?.trim() ||
      'backend/data/big-circus/hand/big-circus-manezh-seats.bundle.json',
    STAGE_MAP_MAX_ZOOM_MULTIPLIER: process.env.STAGE_MAP_MAX_ZOOM_MULTIPLIER?.trim() || '8',
    STAGE_MAP_HALL_WIDTH: process.env.STAGE_MAP_HALL_WIDTH?.trim() || '2167',
    STAGE_MAP_HALL_HEIGHT: process.env.STAGE_MAP_HALL_HEIGHT?.trim() || '2166',
    STAGE_MAP_HALL_KIND: 'theater',
    STAGE_MAP_EXTERNAL_PLAN_URL:
      process.env.STAGE_MAP_EXTERNAL_PLAN_URL?.trim() || 'https://www.greatcircus.ru/',
    STAGE_MAP_NOTE:
      'big-circus manezh: yandex hallplan seats as-is + level.outline; sellable from GetBilet',
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
