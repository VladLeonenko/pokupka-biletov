/**
 * Схема Государственного Кремлёвского дворца (Ticketland → hull sectors).
 *
 * Запуск из backend/:
 *   npm run seed:kremlin-palace-map
 *
 * Полный дамп Ticketland (лучше синтетики):
 *   сохраните HTML со страницы покупки в
 *   backend/data/kremlin-palace/ticketland-source.html
 *   и перезапустите seed.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const htmlPath = path.join(repoRoot, 'backend/data/kremlin-palace/ticketland-source.html');
const svgPath = path.join(repoRoot, 'frontend/public/hall-maps/kremlin-palace.svg');

const DEFAULTS = {
  STAGE_MAP_STAGE_ID: 'kremlin-palace',
  STAGE_MAP_TITLE: 'Государственный Кремлёвский дворец — Большой зал',
  STAGE_MAP_PLACE_ID: '5e81e2e0930af7003040129c',
  STAGE_MAP_EXTERNAL_PLAN_URL: 'https://www.kremlinpalace.org/',
  STAGE_MAP_TICKETLAND_HTML_PATH: 'backend/data/kremlin-palace/ticketland-source.html',
  STAGE_MAP_SVG_PATH: 'frontend/public/hall-maps/kremlin-palace.svg',
  STAGE_MAP_MAX_ZOOM_MULTIPLIER: '2',
  STAGE_MAP_HALL_KIND: 'theater',
  STAGE_MAP_PREFER_LAYOUT_SEATS: '1',
};

function main() {
  if (!fs.existsSync(htmlPath) || fs.readFileSync(htmlPath, 'utf8').match(/<rect/g)?.length < 200) {
    const gen = path.join(repoRoot, 'backend/data/kremlin-palace/generate-synthetic-ticketland-html.js');
    const r0 = spawnSync(process.execPath, [gen], { stdio: 'inherit' });
    if (r0.status !== 0) process.exit(r0.status ?? 1);
  }

  const env = { ...process.env };
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (!env[key]?.trim()) env[key] = value;
  }

  const importScript = path.join(__dirname, 'import-ticketland-stage-map.js');
  const r = spawnSync(process.execPath, [importScript], {
    cwd: path.join(__dirname, '..'),
    env,
    stdio: 'inherit',
  });
  if (r.status !== 0) process.exit(r.status ?? 1);

  if (fs.existsSync(svgPath)) {
    console.log('[seed-kremlin-palace-map] SVG:', path.relative(repoRoot, svgPath));
  }
}

main();
