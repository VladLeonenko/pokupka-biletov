/**
 * Precomputed labeled gray dots: backend/data/luzhniki-geodesy/labeled-dots/{norm}.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const LABELED_DOTS_DIR = path.join(__dirname, '../data/luzhniki-geodesy/labeled-dots');

/**
 * Сектора A/B яруса из pbilet (tickets.json + luzhniki.txt).
 * a107–a110 → alias vipa107… в tickets; b157–b166 в текущем снимке tickets отсутствуют.
 */
export const LUZHNIKI_PRECOMPUTE_SECTOR_NORMS = [
  'a101', 'a102', 'a103', 'a104', 'a105', 'a106', 'a107', 'a108', 'a109', 'a110',
  'a111', 'a112', 'a113', 'a114', 'a115', 'a116',
  'b151', 'b152', 'b153', 'b154', 'b155', 'b156',
];

const _fileCache = new Map();
const _mapCache = new Map();

export function labeledDotsFilePath(sectorNorm) {
  return path.join(LABELED_DOTS_DIR, `${String(sectorNorm).toLowerCase()}.json`);
}

export function labeledDotsFileExists(sectorNorm) {
  return fs.existsSync(labeledDotsFilePath(sectorNorm));
}

/**
 * @returns {{ x: number, y: number, row: number, seat: number }[] | null}
 */
export function loadLabeledDotsArray(sectorNorm) {
  const norm = String(sectorNorm).toLowerCase();
  if (_fileCache.has(norm)) return _fileCache.get(norm);
  const fp = labeledDotsFilePath(norm);
  if (!fs.existsSync(fp)) return null;
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const arr = Array.isArray(data) ? data : data?.dots;
  if (!Array.isArray(arr)) return null;
  _fileCache.set(norm, arr);
  return arr;
}

/**
 * @returns {Map<string, { x: number, y: number, row: number, seat: number }> | null}
 */
export function buildLabeledDotsMap(sectorNorm) {
  const norm = String(sectorNorm).toLowerCase();
  if (_mapCache.has(norm)) return _mapCache.get(norm);
  const arr = loadLabeledDotsArray(norm);
  if (!arr?.length) return null;
  const map = new Map();
  for (const pt of arr) {
    const row = Number(pt.row);
    const seat = Number(pt.seat);
    if (!Number.isFinite(row) || !Number.isFinite(seat)) continue;
    map.set(`${row}:${seat}`, pt);
  }
  _mapCache.set(norm, map);
  return map;
}

export function saveLabeledDotsArray(sectorNorm, dots) {
  const norm = String(sectorNorm).toLowerCase();
  fs.mkdirSync(LABELED_DOTS_DIR, { recursive: true });
  const fp = labeledDotsFilePath(norm);
  fs.writeFileSync(fp, `${JSON.stringify(dots, null, 0)}\n`);
  _fileCache.set(norm, dots);
  _mapCache.delete(norm);
}

export function clearLabeledDotsCaches() {
  _fileCache.clear();
  _mapCache.clear();
}
