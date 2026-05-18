/**
 * Разметка серого облака: ряд 1 у поля, места вдоль хорды (A101: seatCountFromLeft).
 * Канон: LUZHNIKI_STADIUM_MAP_WORKLOG.md + LUZHNIKI_SECTOR_AXIS_GRID.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSectorDotIndex } from './hallSeatGeodesyFromDots.js';
import {
  computeFieldCenterPct,
  seatLeftAxisFromSector,
  sortSectorRowBandsFromField,
} from './hallSeatGeodesySectorNative.js';
import {
  extractPbiletCoordinatesSeatDots,
  extractPbiletTicketSectorPaths,
  extractPbiletTicketsSeatGeodesy,
} from './luzhnikiPbiletGeodesyExtract.js';
import { pickCornerAnchors } from './luzhnikiPbiletGridSpacing.js';
import {
  clusterDotsIntoRowBands,
  sortDotsAlongChord,
} from './luzhnikiSectorCloudRowSeat.js';
import {
  luzhnikiSectorLookupNorms,
  normalizeSectorLabel,
  strictSeatKey,
} from './ticketHallSectorNormalize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const LABELED_DOTS_DIR = path.join(__dirname, '../data/luzhniki-geodesy/labeled-dots');
const ANCHORS_FILE = path.join(__dirname, '../data/luzhniki-geodesy/sector-row-anchors.json');
const META_FILE = path.join(__dirname, '../data/luzhniki-geodesy/sector-label-meta.json');

const HALL_W = 11413;
const HALL_H = 9676;
const STRICT_SNAP_PCT = 0.2;

let _dotsBySector = null;
let _sectorPathByNorm = null;
let _fieldCenterPct = null;
let _ticketsPayloadCache = null;

function seatSortKeyPct(dot, axis) {
  return dot.xPct * axis.x + dot.yPct * axis.y;
}

function ensureCloudContext() {
  if (_dotsBySector) return;
  const coordsPath =
    process.env.LUZHNIKI_COORDINATES_JSON?.trim() || path.join(repoRoot, 'luzhniki.txt');
  const ticketsPath =
    process.env.LUZHNIKI_TICKETS_JSON?.trim() || path.join(repoRoot, 'tickets.json');
  const coordsPayload = JSON.parse(fs.readFileSync(coordsPath, 'utf8'));
  _ticketsPayloadCache = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
  const cloudDots = extractPbiletCoordinatesSeatDots(coordsPayload, HALL_W, HALL_H);
  const sectorPaths = extractPbiletTicketSectorPaths(_ticketsPayloadCache);
  _fieldCenterPct = computeFieldCenterPct(cloudDots);
  const byNorm = buildSectorDotIndex(cloudDots, sectorPaths, HALL_W, HALL_H);
  _dotsBySector = new Map();
  _sectorPathByNorm = new Map();
  for (const sp of sectorPaths) {
    const norm = normalizeSectorLabel(sp.label);
    if (norm && sp.path) _sectorPathByNorm.set(norm, { label: sp.label, path: sp.path });
  }
  for (const [norm, dots] of byNorm) {
    _dotsBySector.set(
      norm,
      dots.map((d) => ({ x: d.xPct, y: d.yPct })),
    );
  }
}

function resolveSectorPath(sectorId) {
  ensureCloudContext();
  for (const alias of luzhnikiSectorLookupNorms(sectorId)) {
    const hit = _sectorPathByNorm.get(alias);
    if (hit) return hit;
  }
  return null;
}

function loadDots(sectorId) {
  ensureCloudContext();
  for (const alias of luzhnikiSectorLookupNorms(sectorId)) {
    const dots = _dotsBySector.get(alias);
    if (dots?.length) return dots;
  }
  return [];
}

function loadAnchorBlock(sectorId) {
  const all = JSON.parse(fs.readFileSync(ANCHORS_FILE, 'utf8'));
  return all[sectorId] ?? null;
}

function loadMeta(sectorId) {
  const all = JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
  const meta = all.sectors?.[sectorId] ?? all[sectorId];
  if (!meta) throw new Error(`no meta for ${sectorId}`);
  const block = loadAnchorBlock(sectorId);
  return {
    ...meta,
    sector: sectorId,
    seatCountFromLeft: block?.seatCountFromLeft ?? meta.seatCountFromLeft ?? false,
    rows: block?.maxRow ?? meta.rows ?? 28,
  };
}

function loadAnchors(sectorId) {
  const block = loadAnchorBlock(sectorId);
  if (!block?.anchors?.length) return null;
  const roles = pickCornerAnchors(block.anchors);
  if (!roles?.nearLeft) return null;
  return {
    nearLeft: { x: roles.nearLeft.xPct, y: roles.nearLeft.yPct },
    nearRight: { x: roles.nearRight.xPct, y: roles.nearRight.yPct },
    farLeft: { x: roles.farLeft.xPct, y: roles.farLeft.yPct },
    farRight: { x: roles.farRight.xPct, y: roles.farRight.yPct },
  };
}

/** Прямые сектора: полосы от поля (не сортировка по Y). */
export function labelStraightSector(dots, meta, sectorPath) {
  ensureCloudContext();
  const rowHint = Number(meta.rows) || 28;
  const dotsPct = dots.map((d) => ({ xPct: d.x, yPct: d.y }));
  const { bands } = sortSectorRowBandsFromField(
    dotsPct,
    sectorPath,
    _fieldCenterPct,
    HALL_W,
    HALL_H,
    rowHint,
  );
  const seatAxis = seatLeftAxisFromSector(sectorPath, _fieldCenterPct, HALL_W, HALL_H);
  const labeled = [];

  bands.forEach((band, bandIdx) => {
    const rowN = bandIdx + 1;
    const sorted = [...(band.dots ?? [])].sort(
      (a, b) => seatSortKeyPct(a, seatAxis) - seatSortKeyPct(b, seatAxis),
    );
    sorted.forEach((pt, seatIdx) => {
      const seatN = meta.seatCountFromLeft ? seatIdx + 1 : sorted.length - seatIdx;
      labeled.push({ x: pt.xPct, y: pt.yPct, row: rowN, seat: seatN });
    });
  });

  if (bands.length !== rowHint) {
    console.warn(
      `[WARN] ${meta.sector}: expected ~${rowHint} row bands from field, got ${bands.length}`,
    );
  }
  return labeled;
}

/** Углы A101…: ряды от поля + места вдоль хорды (seatCountFromLeft). */
export function labelCornerSector(dots, meta, anchors, sectorPath = '') {
  if (!anchors) {
    console.warn(`[WARN] ${meta.sector}: no anchors, straight-from-field fallback`);
    const sp = resolveSectorPath(meta.sector);
    return labelStraightSector(dots, meta, sp?.path ?? '');
  }

  const expectedRows = Number(meta.rows) || 38;
  let bands;
  if (sectorPath) {
    ensureCloudContext();
    const dotsPct = dots.map((d) => ({ xPct: d.x, yPct: d.y }));
    const { bands: fieldBands } = sortSectorRowBandsFromField(
      dotsPct,
      sectorPath,
      _fieldCenterPct,
      HALL_W,
      HALL_H,
      expectedRows,
    );
    bands = fieldBands.map((b) => (b.dots ?? []).map((d) => ({ x: d.xPct, y: d.yPct })));
  } else {
    bands = clusterDotsIntoRowBands(dots, anchors, expectedRows);
  }
  if (bands.length !== expectedRows) {
    console.warn(
      `[WARN] ${meta.sector}: expected ${expectedRows} row bands, got ${bands.length}`,
    );
  }

  const labeled = [];
  bands.forEach((band, rowIdx) => {
    const rowN = rowIdx + 1;
    const sorted = sortDotsAlongChord(band, anchors);
    sorted.forEach((pt, seatIdx) => {
      const seatN = meta.seatCountFromLeft ? seatIdx + 1 : sorted.length - seatIdx;
      labeled.push({ x: pt.x, y: pt.y, row: rowN, seat: seatN });
    });
  });
  return labeled;
}

export function labelAxisGridSector(dots, meta, sectorPath) {
  ensureCloudContext();
  const rowHint = Number(meta.rows) || 33;
  const notchRow = Number(meta.notchRow) || 17;
  const dotsPct = dots.map((d) => ({ xPct: d.x, yPct: d.y }));
  const { bands } = sortSectorRowBandsFromField(
    dotsPct,
    sectorPath,
    _fieldCenterPct,
    HALL_W,
    HALL_H,
    rowHint + 1,
  );
  const seatAxis = seatLeftAxisFromSector(sectorPath, _fieldCenterPct, HALL_W, HALL_H);
  const labeled = [];
  let rowN = 1;

  for (const band of bands) {
    if (rowN === notchRow) rowN += 1;
    const sorted = [...(band.dots ?? [])].sort(
      (a, b) => seatSortKeyPct(a, seatAxis) - seatSortKeyPct(b, seatAxis),
    );
    sorted.forEach((pt, seatIdx) => {
      const seatN = meta.seatCountFromLeft ? seatIdx + 1 : sorted.length - seatIdx;
      labeled.push({ x: pt.xPct, y: pt.yPct, row: rowN, seat: seatN });
    });
    rowN += 1;
  }
  return labeled;
}

function snapStrictOntoLabeled(labeled, sectorLabel, sectorId) {
  ensureCloudContext();
  const strict = extractPbiletTicketsSeatGeodesy(_ticketsPayloadCache, HALL_W, HALL_H).filter(
    (s) => luzhnikiSectorLookupNorms(sectorId).includes(normalizeSectorLabel(s.sector)),
  );
  if (!strict.length) return labeled;

  const out = labeled.map((d) => ({ ...d }));
  for (const st of strict) {
    let bestIdx = -1;
    let bestD = STRICT_SNAP_PCT;
    for (let i = 0; i < out.length; i += 1) {
      const d = Math.hypot(out[i].x - st.xPct, out[i].y - st.yPct);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      out[bestIdx] = {
        x: st.xPct,
        y: st.yPct,
        row: parseInt(String(st.row).replace(/\D/g, ''), 10) || st.row,
        seat: parseInt(String(st.seat).replace(/\D/g, ''), 10) || st.seat,
        source: 'strict',
      };
    } else {
      out.push({
        x: st.xPct,
        y: st.yPct,
        row: parseInt(String(st.row).replace(/\D/g, ''), 10) || st.row,
        seat: parseInt(String(st.seat).replace(/\D/g, ''), 10) || st.seat,
        source: 'strict',
      });
    }
  }
  return out;
}

export function labelSectorDots(sectorId) {
  const meta = loadMeta(sectorId);
  const dots = loadDots(sectorId);
  const anchors = loadAnchors(sectorId);
  const sp = resolveSectorPath(sectorId);
  const sectorPath = sp?.path ?? '';

  let labeled;
  switch (meta.gridMode) {
    case 'radialGrid+d124step':
      labeled = labelCornerSector(dots, meta, anchors, sectorPath);
      break;
    case 'axisGrid':
      labeled = labelAxisGridSector(dots, meta, sectorPath);
      break;
    case 'fieldGrid':
    default:
      labeled = labelStraightSector(dots, meta, sectorPath);
  }

  return snapStrictOntoLabeled(labeled, sp?.label ?? sectorId, sectorId);
}

/**
 * Все места для lookup sellable / enrich (ключ sector+row+seat).
 * strict из tickets перекрывает эвристику на той же точке.
 */
export function buildCanonicalLabeledSeatsForLookup() {
  ensureCloudContext();
  const metaRoot = JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
  const sectorIds = Object.keys(metaRoot.sectors ?? {});
  const byKey = new Map();

  for (const sectorId of sectorIds) {
    const sp = resolveSectorPath(sectorId);
    const sectorLabel = sp?.label ?? sectorId;
    const labeled = labelSectorDots(sectorId);
    for (const d of labeled) {
      const row = String(d.row);
      const seat = String(d.seat);
      const key = strictSeatKey(sectorLabel, row, seat);
      byKey.set(key, {
        sector: sectorLabel,
        row,
        seat,
        xPct: d.x,
        yPct: d.y,
        geodesySource: d.source === 'strict' ? 'strict' : 'canonicalCloud',
      });
    }
  }

  return [...byKey.values()];
}

export function labelAllSectors() {
  const metaRoot = JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
  const sectorIds = Object.keys(metaRoot.sectors ?? {});
  const result = new Map();
  for (const sectorId of sectorIds) {
    result.set(sectorId, labelSectorDots(sectorId));
  }
  return result;
}

const _cache = new Map();

export function getLabeledDots(sectorId) {
  if (_cache.has(sectorId)) return _cache.get(sectorId);

  const labeledFile = path.join(LABELED_DOTS_DIR, `${sectorId}.json`);
  if (fs.existsSync(labeledFile)) {
    const data = JSON.parse(fs.readFileSync(labeledFile, 'utf8'));
    _cache.set(sectorId, data);
    return data;
  }

  const data = labelSectorDots(sectorId);
  _cache.set(sectorId, data);
  return data;
}

export function resetGrayDotsLabelerCache() {
  _dotsBySector = null;
  _sectorPathByNorm = null;
  _fieldCenterPct = null;
  _ticketsPayloadCache = null;
  _cache.clear();
}

export { LABELED_DOTS_DIR };
