/**
 * Схема Большого театра — Новая сцена: облако точек pbilet + sectorMode из SVG.
 *
 * Запуск из backend/:
 *   npm run seed:bolshoi-new-stage-map
 *
 * Редактор рядов (после seed):
 *   https://biletvsem.com/tools/bolshoi-new-stage-editor.html?saveToken=...
 *
 * pbilet layout 2000 — кандидат (1598×1226, ~1036 точек, ~900 мест).
 * event_source_id / event_date_id — из Network при покупке (опционально):
 *   PBILET_EVENT_SOURCE_ID=... PBILET_EVENT_DATE_ID=... npm run seed:bolshoi-new-stage-map
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import ticketPool from '../ticketDb.js';
import { collapseBolshoiNewStageToParterMid } from '../utils/bolshoiNewStageParterCheckout.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const svgPath = path.join(repoRoot, 'frontend/public/hall-maps/bolshoi-new-stage.svg');
const STAGE_ID = 'bolshoi-new-stage';

const DEFAULTS = {
  PBILET_LAYOUT_ID: '2000',
  STAGE_MAP_STAGE_ID: STAGE_ID,
  STAGE_MAP_TITLE: 'Большой театр — Новая сцена',
  STAGE_MAP_EXTERNAL_PLAN_URL: 'https://bolshoi.ru/visit/halls/new_stage/',
  STAGE_MAP_SVG_PATH: 'frontend/public/hall-maps/bolshoi-new-stage.svg',
  STAGE_MAP_SECTOR_MODE_FROM_SVG: '1',
  STAGE_MAP_COORDINATES_ONLY: '1',
  STAGE_MAP_HALL_WIDTH: '1569',
  STAGE_MAP_HALL_HEIGHT: '1104',
  STAGE_MAP_MAX_ZOOM_MULTIPLIER: '2',
  STAGE_MAP_HALL_KIND: 'theater',
  STAGE_MAP_PREFER_LAYOUT_SEATS: '1',
};

/** ТЗ: один продаваемый сектор «Партер (середина)» = лейбл офферов seed. */
async function collapseToParterOnly() {
  const r = await ticketPool.query(
    `SELECT layout_json FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [STAGE_ID],
  );
  const lj = r.rows[0]?.layout_json;
  if (!lj) throw new Error('bolshoi-new-stage map missing after import');
  const { layout, changed, reason } = collapseBolshoiNewStageToParterMid(lj);
  if (reason === 'no-parter-sectors' || reason === 'parter-bbox-empty') {
    throw new Error(`collapse failed: ${reason}`);
  }
  await ticketPool.query(
    `UPDATE getbilet_stage_maps SET layout_json = $1::jsonb, updated_at = NOW() WHERE stage_external_id = $2`,
    [JSON.stringify(layout), STAGE_ID],
  );
  console.log(
    `[seed-bolshoi-new-stage-map] sectorMode → Партер (середина) + hallPreviewSectorCheckout (${changed ? 'updated' : reason})`,
  );
}

async function main() {
  if (!fs.existsSync(svgPath)) {
    throw new Error(`Нет SVG секторов: ${svgPath}`);
  }

  const env = { ...process.env };
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (!env[key]?.trim()) env[key] = value;
  }

  if (env.PBILET_EVENT_SOURCE_ID?.trim() && env.PBILET_EVENT_DATE_ID?.trim()) {
    env.STAGE_MAP_COORDINATES_ONLY = '0';
  }

  const importScript = path.join(__dirname, 'import-pbilet-stage-map.js');
  const r = spawnSync(process.execPath, [importScript], {
    cwd: path.join(__dirname, '..'),
    env,
    stdio: 'inherit',
  });
  if (r.status !== 0) process.exit(r.status ?? 1);

  await collapseToParterOnly();
  await ticketPool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
