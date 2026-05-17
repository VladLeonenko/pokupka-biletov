/**
 * Sellable-геодезия для Лужников: только координаты из подписанных layout.seats (сектор/ряд/место).
 * Интерполяция по рядам / облаку allSeatCoordinates отключена — на овальном стадионе даёт сдвиг.
 */

import { buildSellableSeatGeodesy } from './hallSeatGeodesyMatch.js';

export function pathBBox(path) {
  const nums = String(path ?? '').match(/-?[\d.]+(?:e[-+]?\d+)?/gi);
  if (!nums?.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = Number(nums[i]);
    const y = Number(nums[i + 1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

/**
 * @deprecated Используйте buildSellableSeatGeodesy — только подписанные места.
 */
export function buildSellableSeatGeodesyWithDots(
  layoutSeats,
  _allSeatCoordinates,
  _sectorPaths,
  _hallWidth,
  _hallHeight,
  offers,
) {
  const result = buildSellableSeatGeodesy(layoutSeats, offers);
  return {
    ...result,
    dotMatched: 0,
  };
}
