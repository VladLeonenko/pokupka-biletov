/**
 * Legacy entrypoint. Раньше писал голый { layoutMode: svgNative } и затирал theater на проде.
 * Всегда делегируем в backend/scripts (hallKind=theater + sectorMode).
 *
 * Запуск из корня репо:
 *   node scripts/seed-mht-main-hall-stage-map.js
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'backend/scripts/seed-mht-main-hall-stage-map.js');

const result = spawnSync(process.execPath, [target], {
  cwd: path.join(root, 'backend'),
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
