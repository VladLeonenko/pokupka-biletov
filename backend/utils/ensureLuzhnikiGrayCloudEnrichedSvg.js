/**
 * Читает enriched SVG редактора Лужников с диска.
 * Не генерирует и не перезаписывает файлы — разметка только через редактор / POST save.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

export const LUZHNIKI_HAND_SVG = path.join(
  REPO_ROOT,
  'backend/data/luzhniki-geodesy/hand/luzhniki-gray-cloud-enriched.svg',
);
export const LUZHNIKI_PUBLIC_SVG = path.join(
  REPO_ROOT,
  'frontend/public/tools/luzhniki-gray-cloud-enriched.svg',
);
export const LUZHNIKI_EDITOR_BUNDLE = path.join(
  REPO_ROOT,
  'backend/data/luzhniki-geodesy/hand/bundle-luzhniki-gray-cloud-labeled-seats.json',
);

const MISSING_SVG_HINT =
  'SVG редактора не найден. На VPS: ls -lt backend/data/luzhniki-geodesy/hand/*.bak frontend/public/tools/luzhniki-gray-cloud-enriched.svg*.bak — восстановите последний .bak от 💾 Сохранить. Не запускайте enrich:luzhniki-gray-circles-svg поверх ручной разметки.';

/**
 * @returns {Promise<string>} SVG markup
 */
export async function readLuzhnikiGrayCloudEnrichedSvgMarkup() {
  if (fs.existsSync(LUZHNIKI_HAND_SVG)) {
    return fs.readFileSync(LUZHNIKI_HAND_SVG, 'utf8');
  }
  if (fs.existsSync(LUZHNIKI_PUBLIC_SVG)) {
    return fs.readFileSync(LUZHNIKI_PUBLIC_SVG, 'utf8');
  }
  throw new Error(MISSING_SVG_HINT);
}

/** Последний .bak рядом с hand/public SVG (от POST save редактора). */
export function findLatestLuzhnikiEditorSvgBackup() {
  /** @type {{ path: string; mtimeMs: number; bytes: number }[]} */
  const candidates = [];
  for (const base of [LUZHNIKI_HAND_SVG, LUZHNIKI_PUBLIC_SVG]) {
    const dir = path.dirname(base);
    const prefix = `${path.basename(base)}.`;
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.startsWith(`${path.basename(base)}.`) || !name.endsWith('.bak')) continue;
      const full = path.join(dir, name);
      try {
        const st = fs.statSync(full);
        if (!st.isFile()) continue;
        candidates.push({ path: full, mtimeMs: st.mtimeMs, bytes: st.size });
      } catch {
        /* */
      }
    }
  }
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs || b.bytes - a.bytes);
  return candidates[0]?.path ?? null;
}

export function countSvgManualEditorAttrs(xml) {
  return (String(xml).match(/data-source="manual/g) || []).length;
}
