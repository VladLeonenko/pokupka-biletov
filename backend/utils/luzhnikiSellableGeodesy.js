/**
 * luzhnikiSellableGeodesy.js
 *
 * Приоритетная цепочка координат для sellable мест:
 * 1. strict
 * 2. grayCloud+labeled (O(1) из labeled-dots.json)
 * 3. grayCloud (кластеризация на лету, fallback)
 * 4. radialGrid+d124step (только corner whitelist)
 * 5. axisGrid (только b154)
 * 6. pbiletLabeled (последний resort)
 */

import {
  resolveSellableGrayCloudSeatByAnchors as resolveSellableGrayCloudSeat,
  buildLabeledDotsMap,
  resolveSellableFromLabeledDots,
} from './luzhnikiSectorCloudRowSeat.js';
import {
  pickCornerAnchors,
  resolveCornerSectorPbiletStepGrid,
} from './luzhnikiPbiletGridSpacing.js';
import { resolveAxisGridSeat } from './luzhnikiSectorAxisGridPlacement.js';
import { getLabeledDots } from './luzhnikiGrayDotsLabeler.js';

export const SECTOR_RADIAL_PRIORITY_NORMS = ['a101', 'b155', 'b156'];
export const SECTOR_AXIS_GRID_PRIORITY_NORMS = ['b154'];

const _labeledMapsCache = new Map();

function getLabeledMap(sectorId) {
  if (_labeledMapsCache.has(sectorId)) return _labeledMapsCache.get(sectorId);

  const labeled = getLabeledDots(sectorId);
  if (!labeled || labeled.length === 0) return null;

  const map = buildLabeledDotsMap(labeled);
  _labeledMapsCache.set(sectorId, map);
  return map;
}

function anchorRolesObject(anchors) {
  if (!anchors) return null;
  if (anchors.nearLeft && anchors.nearRight) return anchors;
  const roles = pickCornerAnchors(Array.isArray(anchors) ? anchors : []);
  if (!roles?.nearLeft) return null;
  return {
    nearLeft: { x: roles.nearLeft.xPct, y: roles.nearLeft.yPct },
    nearRight: { x: roles.nearRight.xPct, y: roles.nearRight.yPct },
    farLeft: { x: roles.farLeft.xPct, y: roles.farLeft.yPct },
    farRight: { x: roles.farRight.xPct, y: roles.farRight.yPct },
  };
}

function anchorList(anchors) {
  if (Array.isArray(anchors)) return anchors;
  return [];
}

/**
 * @param {string} sectorId
 * @param {number} rowN
 * @param {number} seatN
 * @param {Object} context - {dots, anchors, params, strictSeats, pbiletLabeled}
 */
export async function resolveSellableCoordinate(sectorId, rowN, seatN, context) {
  const { dots, anchors, params, strictSeats, pbiletLabeled } = context;
  const key = `${rowN}:${seatN}`;

  if (strictSeats && strictSeats[key]) {
    return { ...strictSeats[key], geodesySource: 'strict' };
  }

  const labeledMap = getLabeledMap(sectorId);
  if (labeledMap) {
    const result = resolveSellableFromLabeledDots(labeledMap, rowN, seatN);
    if (result) return result;
  }

  const roles = anchorRolesObject(anchors);
  if (dots?.length && roles) {
    const gc = resolveSellableGrayCloudSeat(dots, roles, rowN, seatN, params);
    if (gc) return gc;
  }

  if (SECTOR_RADIAL_PRIORITY_NORMS.includes(sectorId) && anchors) {
    const rg = resolveCornerSectorPbiletStepGrid(anchorList(anchors), rowN, seatN, params);
    if (rg) {
      return { x: rg.xPct, y: rg.yPct, geodesySource: 'radialGrid+d124step' };
    }
  }

  if (SECTOR_AXIS_GRID_PRIORITY_NORMS.includes(sectorId) && anchors) {
    const ag = resolveAxisGridSeat(rowN, seatN, anchorList(anchors), params);
    if (ag) return { ...ag, geodesySource: 'axisGrid' };
  }

  if (pbiletLabeled && pbiletLabeled[key]) {
    return { ...pbiletLabeled[key], geodesySource: 'pbiletLabeled' };
  }

  return null;
}
