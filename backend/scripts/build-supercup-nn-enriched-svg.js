/**
 * Сборка enriched SVG редактора Суперкубок NN (43k точек) на диск.
 *
 *   cd backend && npm run build:supercup-nn-enriched-svg
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ticketPool from '../ticketDb.js';
import { buildSupercupEnrichedSvgMarkup } from '../routes/supercupNnHallSeatEditor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const OUT_PATHS = [
  path.join(REPO_ROOT, 'frontend/public/tools/supercup-nn-football-enriched.svg'),
  path.join(REPO_ROOT, 'backend/data/supercup-nn/hand/supercup-nn-football-enriched.svg'),
];

async function main() {
  const xml = await buildSupercupEnrichedSvgMarkup('', { includeFullCloud: true });
  for (const out of OUT_PATHS) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, xml, 'utf8');
    console.log('[build:supercup-nn-enriched-svg]', out, `${(xml.length / 1024 / 1024).toFixed(2)} MB`);
  }
  await ticketPool.end();
}

main().catch((err) => {
  console.error('[build:supercup-nn-enriched-svg]', err);
  process.exit(1);
});
