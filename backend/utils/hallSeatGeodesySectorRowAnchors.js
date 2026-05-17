/**
 * Ручные якоря сектор+ряд+место → xPct/yPct (backend/data/luzhniki-geodesy/sector-row-anchors.json).
 * B2: калибровка sellable без полного tickets.json.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeSectorLabel } from './ticketHallSectorNormalize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ANCHORS_PATH = path.join(__dirname, '../data/luzhniki-geodesy/sector-row-anchors.json');

let cachedByNorm = null;

function parseAnchorEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw.row ?? raw.Row;
  const seat = raw.seat ?? raw.Seat;
  const xPct = Number(raw.xPct);
  const yPct = Number(raw.yPct);
  if (row == null || seat == null || !Number.isFinite(xPct) || !Number.isFinite(yPct)) return null;
  return { row: String(row), seat: String(seat), xPct, yPct };
}

/**
 * @returns {Map<string, { row: string, seat: string, xPct: number, yPct: number }[]>}
 */
export function loadSectorRowAnchorsByNorm() {
  if (cachedByNorm) return cachedByNorm;
  const byNorm = new Map();
  try {
    if (!fs.existsSync(ANCHORS_PATH)) {
      cachedByNorm = byNorm;
      return byNorm;
    }
    const raw = JSON.parse(fs.readFileSync(ANCHORS_PATH, 'utf8'));
    if (!raw || typeof raw !== 'object') {
      cachedByNorm = byNorm;
      return byNorm;
    }
    for (const [sectorKey, block] of Object.entries(raw)) {
      const norm = normalizeSectorLabel(sectorKey);
      if (!norm) continue;
      const list = Array.isArray(block?.anchors) ? block.anchors : Array.isArray(block) ? block : [];
      const parsed = list.map(parseAnchorEntry).filter(Boolean);
      if (parsed.length > 0) byNorm.set(norm, parsed);
    }
  } catch {
    // missing or invalid file — no manual anchors
  }
  cachedByNorm = byNorm;
  return byNorm;
}

/** @param {string} sectorLabel */
export function getManualSectorRowAnchors(sectorLabel) {
  const norm = normalizeSectorLabel(sectorLabel);
  if (!norm) return [];
  return loadSectorRowAnchorsByNorm().get(norm) ?? [];
}

export function resetSectorRowAnchorsCache() {
  cachedByNorm = null;
}
