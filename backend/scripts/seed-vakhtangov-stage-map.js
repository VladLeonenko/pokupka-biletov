/**
 * Схема основного зала Театра им. Вахтангова (pbilet layout 1564 → getbilet_stage_maps).
 *
 * Координаты мест и полигоны секторов — из pbilet API (как у стадиона через import:pbilet-stage-map).
 * Подложка SVG сохраняется в frontend/public/hall-maps/vakhtangov-main-hall.svg.
 *
 * Запуск из backend/:
 *   npm run seed:vakhtangov-stage-map
 *
 * Переопределение (другой сеанс / StageId):
 *   PBILET_EVENT_SOURCE_ID=... PBILET_EVENT_DATE_ID=... STAGE_MAP_STAGE_ID=... npm run seed:vakhtangov-stage-map
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const svgOut = path.join(repoRoot, 'frontend/public/hall-maps/vakhtangov-main-hall.svg');

const DEFAULTS = {
  PBILET_LAYOUT_ID: '1564',
  PBILET_EVENT_SOURCE_ID: '189180',
  PBILET_EVENT_DATE_ID: '400324',
  STAGE_MAP_STAGE_ID: '5f3dedaa08192a003157dc6d',
  STAGE_MAP_TITLE: 'Театр им. Вахтангова — основная сцена',
  STAGE_MAP_EXTERNAL_PLAN_URL: 'https://vakhtangovtheatre.ru/events/37886',
  /** Клик по сектору и кнопка «+» — не выше 200% от обзора. */
  STAGE_MAP_MAX_ZOOM_MULTIPLIER: '2',
  STAGE_MAP_HALL_KIND: 'theater',
  STAGE_MAP_PREFER_LAYOUT_SEATS: '1',
};

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      accept: 'image/svg+xml,text/plain,*/*',
      'user-agent': 'biletvsem-vakhtangov-stage-map/1.0',
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.text();
}

async function syncSvgFromPbilet(layoutId) {
  const coordinatesUrl = `https://tickets.api.pbilet.net/public/v1/hall-layouts/${encodeURIComponent(layoutId)}/coordinates`;
  const res = await fetch(coordinatesUrl, {
    headers: { accept: 'application/json', 'user-agent': 'biletvsem-vakhtangov-stage-map/1.0' },
  });
  if (!res.ok) throw new Error(`${res.status} coordinates: ${coordinatesUrl}`);
  const payload = await res.json();
  const bgUrl = String(payload?.bg ?? '').trim();
  if (!bgUrl) throw new Error('pbilet coordinates: нет bg SVG');
  const svg = (await fetchText(bgUrl)).trim();
  if (!svg.includes('<svg')) throw new Error(`bg не SVG: ${bgUrl}`);
  fs.mkdirSync(path.dirname(svgOut), { recursive: true });
  fs.writeFileSync(svgOut, svg, 'utf-8');
  console.log('[seed-vakhtangov-stage-map] SVG сохранён:', path.relative(repoRoot, svgOut));
}

function main() {
  const env = { ...process.env };
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (!env[key]?.trim()) env[key] = value;
  }

  return syncSvgFromPbilet(env.PBILET_LAYOUT_ID)
    .catch((e) => {
      console.warn('[seed-vakhtangov-stage-map] не удалось обновить SVG с pbilet CDN:', e.message);
      if (!fs.existsSync(svgOut)) {
        throw new Error(`Нет локального SVG: ${svgOut}`);
      }
      console.warn('[seed-vakhtangov-stage-map] используем локальный файл');
    })
    .then(() => {
      const importScript = path.join(__dirname, 'import-pbilet-stage-map.js');
      const r = spawnSync(process.execPath, [importScript], {
        cwd: path.join(__dirname, '..'),
        env,
        stdio: 'inherit',
      });
      if (r.status !== 0) process.exit(r.status ?? 1);
    });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
