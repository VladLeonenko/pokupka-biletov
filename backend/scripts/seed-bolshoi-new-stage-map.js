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

function pathBBox(pathStr) {
  const nums = String(pathStr || '').match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i];
    const y = nums[i + 1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

/** ТЗ: Новая сцена — один продаваемый сектор «Партер». */
async function collapseToParterOnly() {
  const r = await ticketPool.query(
    `SELECT layout_json FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [STAGE_ID],
  );
  const lj = r.rows[0]?.layout_json;
  if (!lj) throw new Error('bolshoi-new-stage map missing after import');
  const secs = lj.sectorMode?.sectors || [];
  const parter = secs.filter((s) => /^партер/i.test(String(s.label || '')));
  if (!parter.length) throw new Error('no Партер sectors to collapse');
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const s of parter) {
    const bb = pathBBox(s.path);
    if (!bb) continue;
    x1 = Math.min(x1, bb.minX);
    y1 = Math.min(y1, bb.minY);
    x2 = Math.max(x2, bb.maxX);
    y2 = Math.max(y2, bb.maxY);
  }
  if (!Number.isFinite(x1)) throw new Error('parter bbox empty');
  lj.sectorMode = {
    enabled: true,
    source: 'bolshoi-new-stage-parter-only',
    sectors: [
      {
        id: 'parter',
        label: 'Партер',
        path: `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x1.toFixed(1)} ${y2.toFixed(1)} Z`,
        maxQuantity: 8,
      },
    ],
  };
  /** Как Историческая: клик по Партеру → qty, без выбора конкретного места. */
  lj.hallPreviewSectorCheckout = true;
  lj.seatSelectionDisabled = true;
  lj.hideSeatList = true;
  if (!lj.categoryCheckoutDefaults || typeof lj.categoryCheckoutDefaults !== 'object') {
    lj.categoryCheckoutDefaults = {};
  }
  await ticketPool.query(
    `UPDATE getbilet_stage_maps SET layout_json = $1::jsonb, updated_at = NOW() WHERE stage_external_id = $2`,
    [JSON.stringify(lj), STAGE_ID],
  );
  console.log('[seed-bolshoi-new-stage-map] sectorMode → Партер only + hallPreviewSectorCheckout');
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
