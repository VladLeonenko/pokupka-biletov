/**
 * Схема Большого театра — Историческая сцена
 * (HTML/SVG ticket.bolshoi.ru → getbilet_stage_maps), как seed-kremlin-palace-map.
 *
 * Запуск из backend/:
 *   node scripts/seed-bolshoi-historical-stage-map.js
 *
 * Источник:
 *   backend/data/bolshoi-historical/bolshoi-source.html
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const htmlPath = path.join(repoRoot, 'backend/data/bolshoi-historical/bolshoi-source.html');
const svgPath = path.join(repoRoot, 'frontend/public/hall-maps/bolshoi-historical-stage.svg');

const DEFAULTS = {
  STAGE_MAP_STAGE_ID: 'bolshoi-historical-stage',
  STAGE_MAP_TITLE: 'Большой театр — Историческая сцена',
  STAGE_MAP_EXTERNAL_PLAN_URL: 'https://ticket.bolshoi.ru/',
  STAGE_MAP_BOLSHOI_HTML_PATH: 'backend/data/bolshoi-historical/bolshoi-source.html',
  STAGE_MAP_BOLSHOI_LABELED_PATH: 'backend/data/bolshoi-historical/historical-circles-labeled.svg',
  STAGE_MAP_SVG_PATH: 'frontend/public/hall-maps/bolshoi-historical-stage.svg',
  STAGE_MAP_MAX_ZOOM_MULTIPLIER: '2',
  STAGE_MAP_HALL_KIND: 'theater',
  STAGE_MAP_PREFER_LAYOUT_SEATS: '1',
};

function main() {
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`Нет источника: ${htmlPath}`);
  }
  const rects = (fs.readFileSync(htmlPath, 'utf8').match(/<rect/gi) || []).length;
  if (rects < 200) {
    throw new Error(`Слишком мало rect в источнике (${rects}) — нужен полный дамп scene__svg`);
  }

  const env = { ...process.env };
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (!env[key]?.trim()) env[key] = value;
  }

  const importScript = path.join(__dirname, 'import-bolshoi-historical-stage-map.js');
  const r = spawnSync(process.execPath, [importScript], {
    cwd: path.join(__dirname, '..'),
    env,
    stdio: 'inherit',
  });
  if (r.status !== 0) process.exit(r.status ?? 1);

  if (fs.existsSync(svgPath)) {
    console.log('[seed-bolshoi-historical-stage-map] SVG:', path.relative(repoRoot, svgPath));
  }
}

main();
