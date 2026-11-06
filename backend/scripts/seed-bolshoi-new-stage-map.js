/**
 * Схема Большого — Новая сцена: Afisha hallplan seats + level.outline gray fills.
 *
 *   npm run seed:bolshoi-new-stage-map
 *
 * Редактор:
 *   https://biletvsem.com/tools/luzhniki-gray-cloud-enriched-hover.html?hallApi=bolshoi-new-stage-seats&saveToken=...&clearEdits=1
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import ticketPool from '../ticketDb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const env = {
    ...process.env,
    APPLY_DB: process.env.APPLY_DB?.trim() || '1',
    STAGE_MAP_STAGE_ID: process.env.STAGE_MAP_STAGE_ID?.trim() || 'bolshoi-new-stage',
    STAGE_MAP_TITLE: process.env.STAGE_MAP_TITLE?.trim() || 'Большой театр — Новая сцена',
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
