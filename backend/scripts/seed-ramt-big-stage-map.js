/**
 * Схема РАМТ — Большая сцена: облако точек pbilet + sectorMode из Яндекс SVG.
 *
 * Референс: https://afisha.yandex.ru/moscow/theatre/places/ramt/halls
 *
 * Запуск из backend/:
 *   npm run seed:ramt-big-stage-map
 *
 * Редактор рядов (после seed):
 *   https://biletvsem.com/tools/ramt-hall-seats-editor.html?saveToken=...
 *
 * pbilet layout 1659 — кандидат (951×844, 783 точки). Проверьте в редакторе.
 * event_source_id / event_date_id — из Network при покупке на afisha (опционально, для черновых подписей):
 *   PBILET_EVENT_SOURCE_ID=... PBILET_EVENT_DATE_ID=... npm run seed:ramt-big-stage-map
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const svgPath = path.join(repoRoot, 'frontend/public/hall-maps/ramt-big-stage.svg');

const DEFAULTS = {
  PBILET_LAYOUT_ID: '1659',
  STAGE_MAP_STAGE_ID: 'ramt-big-stage',
  STAGE_MAP_TITLE: 'РАМТ — Большая сцена',
  STAGE_MAP_EXTERNAL_PLAN_URL: 'https://afisha.yandex.ru/moscow/theatre/places/ramt/halls',
  STAGE_MAP_SVG_PATH: 'frontend/public/hall-maps/ramt-big-stage.svg',
  STAGE_MAP_SECTOR_MODE_FROM_SVG: '1',
  STAGE_MAP_COORDINATES_ONLY: '1',
  STAGE_MAP_HALL_WIDTH: '930',
  STAGE_MAP_HALL_HEIGHT: '847',
  STAGE_MAP_MAX_ZOOM_MULTIPLIER: '2',
  STAGE_MAP_HALL_KIND: 'theater',
  STAGE_MAP_PREFER_LAYOUT_SEATS: '1',
};

function main() {
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
}

main();
