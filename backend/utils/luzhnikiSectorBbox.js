/**
 * Bbox сектора из tickets.json path — clamp sellable внутри трибуны.
 */

import { normalizeSectorLabel, luzhnikiSectorLookupNorms } from './ticketHallSectorNormalize.js';

const cache = new Map();

function pathBboxPct(path, w, h) {
  const nums = String(path || '')
    .match(/[-+]?[0-9]*\.?[0-9]+(?:e[-+]?[0-9]+)?/gi)
    ?.map(Number);
  if (!nums?.length) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i];
    const y = nums[i + 1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minX)) return null;
  const padX = ((maxX - minX) / w) * 0.02;
  const padY = ((maxY - minY) / h) * 0.02;
  return {
    minXPct: (minX / w) * 100 - padX,
    maxXPct: (maxX / w) * 100 + padX,
    minYPct: (minY / h) * 100 - padY,
    maxYPct: (maxY / h) * 100 + padY,
  };
}

/**
 * @param {unknown} ticketsPayload
 * @param {string} sectorLabel
 * @param {number} w
 * @param {number} h
 */
export function getSectorBboxPct(ticketsPayload, sectorLabel, w = 11413, h = 9676) {
  const norms = luzhnikiSectorLookupNorms(sectorLabel);
  const key = norms.sort().join('|');
  if (cache.has(key)) return cache.get(key);

  const sectors = Array.isArray(ticketsPayload?.sectors) ? ticketsPayload.sectors : [];
  let bbox = null;
  for (const sector of sectors) {
    const label = String(sector?.i ?? '');
    if (!norms.includes(normalizeSectorLabel(label))) continue;
    const path = String(sector?.o ?? '').trim();
    if (!path) continue;
    bbox = pathBboxPct(path, w, h);
    break;
  }
  cache.set(key, bbox);
  return bbox;
}

export function clampPctToSectorBbox(xPct, yPct, bbox) {
  if (!bbox) return { xPct, yPct, clamped: false };
  const x = Math.max(bbox.minXPct, Math.min(bbox.maxXPct, xPct));
  const y = Math.max(bbox.minYPct, Math.min(bbox.maxYPct, yPct));
  return {
    xPct: x,
    yPct: y,
    clamped: x !== xPct || y !== yPct,
  };
}

export function resetSectorBboxCache() {
  cache.clear();
}
