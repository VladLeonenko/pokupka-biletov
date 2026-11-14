/**
 * Цирк Никулина на Цветном — Основная сцена.
 * Тот же hallplan-пайплайн, что Новая сцена Большого (outline + все места).
 *
 *   npm run seed:nikulin-circus-stage-map
 *
 * Источник: backend/data/nikulin-circus/hallplan.json
 * (Profticket scheme, 2006 мест, имена секторов как в GetBilet).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import ticketPool from '../ticketDb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

export const NIKULIN_CIRCUS_STAGE_ID = '5f4d99279a3e0700303116c6';

async function main() {
  const jsonRel = 'backend/data/nikulin-circus/hallplan.json';
  const hall = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, jsonRel), 'utf8'));
  const env = {
    ...process.env,
    APPLY_DB: process.env.APPLY_DB?.trim() || '1',
    STAGE_MAP_SEAT_CHECKOUT: '1',
    STAGE_MAP_STAGE_ID: process.env.STAGE_MAP_STAGE_ID?.trim() || NIKULIN_CIRCUS_STAGE_ID,
    STAGE_MAP_TITLE: process.env.STAGE_MAP_TITLE?.trim() || 'Цирк Никулина — Основная сцена',
    STAGE_MAP_AFISHA_JSON: jsonRel,
    STAGE_MAP_SVG_PATH: 'frontend/public/hall-maps/nikulin-circus.svg',
    STAGE_MAP_ENRICHED_SVG: 'frontend/public/tools/nikulin-circus-enriched.svg',
    STAGE_MAP_BUNDLE_PATH: 'backend/data/nikulin-circus/hand/nikulin-circus-seats.bundle.json',
    STAGE_MAP_MAX_ZOOM_MULTIPLIER: process.env.STAGE_MAP_MAX_ZOOM_MULTIPLIER?.trim() || '8',
    STAGE_MAP_HALL_WIDTH: String(hall.hallWidth),
    STAGE_MAP_HALL_HEIGHT: String(hall.hallHeight),
    STAGE_MAP_HALL_KIND: 'theater',
    STAGE_MAP_EXTERNAL_PLAN_URL: 'https://circusnikulin.ru/',
    STAGE_MAP_NOTE:
      'nikulin circus: profticket seats scaled to 18px pitch + annular outlines; sellable from GetBilet',
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
