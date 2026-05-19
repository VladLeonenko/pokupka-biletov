/**
 * precomputeLabeledDots.js
 *
 * Запуск: node backend/scripts/precomputeLabeledDots.js [--force]
 *
 * Создаёт backend/data/luzhniki-geodesy/labeled-dots/{sectorId}.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { labelSectorDots, LABELED_DOTS_DIR } from '../utils/luzhnikiGrayDotsLabeler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const META_FILE = path.join(__dirname, '../data/luzhniki-geodesy/sector-label-meta.json');
const FORCE = process.argv.includes('--force');

async function main() {
  fs.mkdirSync(LABELED_DOTS_DIR, { recursive: true });

  const metaRoot = JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
  const sectorIds = Object.keys(metaRoot.sectors ?? {});

  let processed = 0;
  let skipped = 0;
  let errors = 0;
  const warnings = [];

  for (const sectorId of sectorIds) {
    const outFile = path.join(LABELED_DOTS_DIR, `${sectorId}.json`);

    if (fs.existsSync(outFile) && !FORCE) {
      console.log(`[SKIP] ${sectorId}: exists (use --force)`);
      skipped++;
      continue;
    }

    try {
      const labeled = labelSectorDots(sectorId);
      const keys = new Set(labeled.map((d) => `${d.row}:${d.seat}`));
      if (keys.size !== labeled.length) {
        warnings.push(`${sectorId}: ${labeled.length - keys.size} duplicate {row,seat}`);
      }

      fs.writeFileSync(outFile, `${JSON.stringify(labeled, null, 2)}\n`);
      const rowCount = new Set(labeled.map((d) => d.row)).size;
      console.log(`[OK] ${sectorId}: ${labeled.length} dots, ${rowCount} rows`);
      processed++;
    } catch (err) {
      console.error(`[ERR] ${sectorId}: ${err.message}`);
      errors++;
    }
  }

  console.log('\n─── ИТОГ ───────────────────────────────');
  console.log(`Обработано: ${processed}`);
  console.log(`Пропущено: ${skipped}`);
  console.log(`Ошибок: ${errors}`);
  if (warnings.length) {
    console.log('\nПредупреждения:');
    warnings.forEach((w) => console.log(` [WARN] ${w}`));
  }
  console.log('────────────────────────────────────────');

  if (errors > 0) process.exit(1);
}

main();
