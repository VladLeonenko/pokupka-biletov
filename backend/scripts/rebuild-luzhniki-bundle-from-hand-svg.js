#!/usr/bin/env node
/**
 *   cd backend && node scripts/rebuild-luzhniki-bundle-from-hand-svg.js
 *   node scripts/rebuild-luzhniki-bundle-from-hand-svg.js --force
 */
import {
  rebuildLuzhnikiBundleFromHandSvg,
  rebuildLuzhnikiBundleFromHandSvgIfNeeded,
} from '../utils/luzhnikiRebuildBundleFromHandSvg.js';

const force = process.argv.includes('--force');
const result = force
  ? rebuildLuzhnikiBundleFromHandSvg()
  : rebuildLuzhnikiBundleFromHandSvgIfNeeded({ force });
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok || result.skipped ? 0 : 1);
