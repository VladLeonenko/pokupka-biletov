#!/usr/bin/env node
/**
 * Восстановить SVG/bundle редактора Лужников из последнего .bak (POST 💾 в hover.html).
 *
 *   cd backend && node scripts/restore-luzhniki-editor-from-bak.js
 *   node scripts/restore-luzhniki-editor-from-bak.js --dry-run
 *   node scripts/restore-luzhniki-editor-from-bak.js --file /path/to/file.svg.2026-....bak
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

import {
  countSvgManualEditorAttrs,
  findLatestLuzhnikiEditorSvgBackup,
  LUZHNIKI_EDITOR_BUNDLE,
  LUZHNIKI_HAND_SVG,
  LUZHNIKI_PUBLIC_SVG,
} from '../utils/ensureLuzhnikiGrayCloudEnrichedSvg.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

function writeSvgFiles(filePath, xml) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, xml, 'utf8');
  fs.writeFileSync(`${filePath}.gz`, zlib.gzipSync(xml, { level: 9 }));
}

function findLatestBundleBackup() {
  const dir = path.dirname(LUZHNIKI_EDITOR_BUNDLE);
  const prefix = `${path.basename(LUZHNIKI_EDITOR_BUNDLE)}.`;
  if (!fs.existsSync(dir)) return null;
  /** @type {{ path: string; mtimeMs: number; seatCount: number }[]} */
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.startsWith(prefix) || !name.endsWith('.bak')) continue;
    const full = path.join(dir, name);
    try {
      const st = fs.statSync(full);
      let seatCount = 0;
      try {
        const j = JSON.parse(fs.readFileSync(full, 'utf8'));
        seatCount = Number(j.seatCount) || (Array.isArray(j.seats) ? j.seats.length : 0);
      } catch {
        /* */
      }
      out.push({ path: full, mtimeMs: st.mtimeMs, seatCount });
    } catch {
      /* */
    }
  }
  out.sort((a, b) => b.seatCount - a.seatCount || b.mtimeMs - a.mtimeMs);
  return out[0]?.path ?? null;
}

function parseArgs() {
  const dryRun = process.argv.includes('--dry-run');
  const fileIdx = process.argv.indexOf('--file');
  const file = fileIdx >= 0 ? process.argv[fileIdx + 1] : null;
  return { dryRun, file };
}

function currentManualCount() {
  for (const p of [LUZHNIKI_HAND_SVG, LUZHNIKI_PUBLIC_SVG]) {
    if (!fs.existsSync(p)) continue;
    return countSvgManualEditorAttrs(fs.readFileSync(p, 'utf8'));
  }
  return 0;
}

function main() {
  const { dryRun, file } = parseArgs();
  const svgBackup = file?.trim() || findLatestLuzhnikiEditorSvgBackup();
  if (!svgBackup) {
    console.error('Нет .bak для SVG. Ищите на VPS:');
    console.error(`  ls -lt ${path.dirname(LUZHNIKI_HAND_SVG)}/*.bak`);
    console.error(`  ls -lt ${path.dirname(LUZHNIKI_PUBLIC_SVG)}/*.bak`);
    process.exit(1);
  }

  const xml = fs.readFileSync(svgBackup, 'utf8');
  if (!xml.includes('<svg')) {
    console.error('Backup не SVG:', svgBackup);
    process.exit(1);
  }

  const manual = countSvgManualEditorAttrs(xml);
  const bundleBackup = findLatestBundleBackup();
  let bundleSeatCount = 0;
  if (bundleBackup) {
    try {
      const j = JSON.parse(fs.readFileSync(bundleBackup, 'utf8'));
      bundleSeatCount = Number(j.seatCount) || (Array.isArray(j.seats) ? j.seats.length : 0);
    } catch {
      /* */
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        svgBackup: path.relative(REPO_ROOT, svgBackup),
        manualInBackup: manual,
        manualOnDiskNow: currentManualCount(),
        bundleBackup: bundleBackup ? path.relative(REPO_ROOT, bundleBackup) : null,
        bundleSeatCount,
      },
      null,
      2,
    ),
  );

  if (dryRun) {
    console.log('dry-run — файлы не тронуты');
    return;
  }

  writeSvgFiles(LUZHNIKI_HAND_SVG, xml);
  writeSvgFiles(LUZHNIKI_PUBLIC_SVG, xml);
  console.log('✅ SVG восстановлен → hand + public/tools');

  if (bundleBackup && bundleSeatCount > 0) {
    fs.mkdirSync(path.dirname(LUZHNIKI_EDITOR_BUNDLE), { recursive: true });
    fs.copyFileSync(bundleBackup, LUZHNIKI_EDITOR_BUNDLE);
    console.log(`✅ bundle восстановлен (${bundleSeatCount} мест)`);
  } else {
    console.warn('⚠️  bundle .bak не найден — только SVG; checkout bundle может быть пуст до следующего 💾');
  }
}

main();
