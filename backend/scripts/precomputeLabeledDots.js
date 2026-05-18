#!/usr/bin/env node
/**
 * Precompute labeled-dots.json для 32 секторов A/B яруса.
 * node backend/scripts/precomputeLabeledDots.js [--force]
 */

import {
  labelSectorDots,
  loadPrecomputeContext,
} from '../utils/luzhnikiGrayDotsLabeler.js';
import {
  LUZHNIKI_PRECOMPUTE_SECTOR_NORMS,
  labeledDotsFileExists,
  saveLabeledDotsArray,
} from '../utils/luzhnikiLabeledDotsStore.js';

const FORCE = process.argv.includes('--force');

function assertNoDuplicateRowSeat(dots, norm) {
  const keys = new Set();
  for (const pt of dots) {
    const k = `${pt.row}:${pt.seat}`;
    if (keys.has(k)) {
      throw new Error(`${norm}: duplicate {row,seat} ${k}`);
    }
    keys.add(k);
  }
}

function main() {
  const ctx = loadPrecomputeContext();
  let written = 0;
  let skipped = 0;
  let empty = 0;

  for (const norm of LUZHNIKI_PRECOMPUTE_SECTOR_NORMS) {
    if (!FORCE && labeledDotsFileExists(norm)) {
      console.log(`[SKIP] ${norm}: labeled-dots exists (use --force)`);
      skipped += 1;
      continue;
    }

    const labeled = labelSectorDots(norm, ctx);
    if (!labeled.length) {
      console.warn(`[WARN] ${norm}: 0 labeled dots`);
      empty += 1;
      continue;
    }

    for (const pt of labeled) {
      if (pt.row < 1 || pt.seat < 1) {
        throw new Error(`${norm}: invalid row/seat ${pt.row}/${pt.seat}`);
      }
    }
    assertNoDuplicateRowSeat(labeled, norm);

    const rows = new Set(labeled.map((p) => p.row));
    saveLabeledDotsArray(norm, labeled);
    console.log(
      `[OK] ${norm}: ${labeled.length} dots, ${rows.size} rows (row ${Math.min(...rows)}–${Math.max(...rows)})`,
    );
    written += 1;
  }

  console.log('');
  console.log(`Done: written=${written} skipped=${skipped} empty=${empty} total=${LUZHNIKI_PRECOMPUTE_SECTOR_NORMS.length}`);
  if (empty > 0) process.exitCode = 1;
}

main();
