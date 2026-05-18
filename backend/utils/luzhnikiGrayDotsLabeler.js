/**
 * luzhnikiGrayDotsLabeler.js
 * Присваивает {row, seat} каждой серой точке (координаты из luzhniki.txt).
 * Результат: [{x, y, row, seat}, ...]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSectorDotIndex } from './hallSeatGeodesyFromDots.js';
import { extractPbiletCoordinatesSeatDots, extractPbiletTicketSectorPaths } from './luzhnikiPbiletGeodesyExtract.js';
import { pickCornerAnchors } from './luzhnikiPbiletGridSpacing.js';
import {
  luzhnikiSectorLookupNorms,
  normalizeSectorLabel,
} from './ticketHallSectorNormalize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const LABELED_DOTS_DIR = path.join(__dirname, '../data/luzhniki-geodesy/labeled-dots');
const ANCHORS_FILE = path.join(__dirname, '../data/luzhniki-geodesy/sector-row-anchors.json');
const META_FILE = path.join(__dirname, '../data/luzhniki-geodesy/sector-label-meta.json');

const HALL_W = 11413;
const HALL_H = 9676;

let _dotsBySector = null;

function normalize(v) {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function median(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function ensureDotsIndex() {
  if (_dotsBySector) return _dotsBySector;
  const coordsPath =
    process.env.LUZHNIKI_COORDINATES_JSON?.trim() || path.join(repoRoot, 'luzhniki.txt');
  const ticketsPath = path.join(repoRoot, 'tickets.json');
  const coordsPayload = JSON.parse(fs.readFileSync(coordsPath, 'utf8'));
  const ticketsPayload = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
  const cloudDots = extractPbiletCoordinatesSeatDots(coordsPayload, HALL_W, HALL_H);
  const sectorPaths = extractPbiletTicketSectorPaths(ticketsPayload);
  const byNorm = buildSectorDotIndex(cloudDots, sectorPaths, HALL_W, HALL_H);
  _dotsBySector = new Map();
  for (const [norm, dots] of byNorm) {
    _dotsBySector.set(
      norm,
      dots.map((d) => ({ x: d.xPct, y: d.yPct })),
    );
  }
  return _dotsBySector;
}

function loadDots(sectorId) {
  const norm = normalizeSectorLabel(sectorId);
  const index = ensureDotsIndex();
  for (const alias of luzhnikiSectorLookupNorms(norm)) {
    const dots = index.get(alias);
    if (dots?.length) return dots;
  }
  return [];
}

function loadMeta(sectorId) {
  const all = JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
  const meta = all.sectors?.[sectorId] ?? all[sectorId];
  if (!meta) throw new Error(`no meta for ${sectorId}`);
  return { ...meta, sector: sectorId };
}

function loadAnchors(sectorId) {
  const all = JSON.parse(fs.readFileSync(ANCHORS_FILE, 'utf8'));
  const block = all[sectorId];
  if (!block) return null;
  const roles = pickCornerAnchors(block.anchors ?? []);
  if (!roles?.nearLeft) return null;
  return {
    nearLeft: { x: roles.nearLeft.xPct, y: roles.nearLeft.yPct },
    nearRight: { x: roles.nearRight.xPct, y: roles.nearRight.yPct },
    farLeft: { x: roles.farLeft.xPct, y: roles.farLeft.yPct },
    farRight: { x: roles.farRight.xPct, y: roles.farRight.yPct },
  };
}

export function labelStraightSector(dots, meta) {
  const groups = new Map();
  for (const pt of dots) {
    const key = Math.round(pt.y * 100) / 100;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(pt);
  }

  const sortedKeys = [...groups.keys()].sort((a, b) => b - a);
  const merged = [];
  for (const key of sortedKeys) {
    if (merged.length > 0 && Math.abs(merged[merged.length - 1].y - key) < 0.05) {
      merged[merged.length - 1].pts.push(...groups.get(key));
    } else {
      merged.push({ y: key, pts: [...groups.get(key)] });
    }
  }

  if (merged.length !== meta.rows) {
    console.warn(`[WARN] ${meta.sector}: expected ${meta.rows} rows, got ${merged.length} groups`);
  }

  const labeled = [];
  merged.forEach((group, rowIdx) => {
    const rowN = rowIdx + 1;
    const sorted = [...group.pts].sort((a, b) => a.x - b.x);
    sorted.forEach((pt, seatIdx) => {
      const seatN = meta.seatCountFromLeft ? sorted.length - seatIdx : seatIdx + 1;
      labeled.push({ x: pt.x, y: pt.y, row: rowN, seat: seatN });
    });
  });
  return labeled;
}

export function labelCornerSector(dots, meta, anchors) {
  if (!anchors) {
    console.warn(`[WARN] ${meta.sector}: no anchors found, falling back to straight`);
    return labelStraightSector(dots, meta);
  }

  const nearLeft = anchors.nearLeft;
  const nearRight = anchors.nearRight;
  const farLeft = anchors.farLeft;
  const depthVec = normalize({ x: farLeft.x - nearLeft.x, y: farLeft.y - nearLeft.y });

  const projected = dots.map((pt) => ({
    pt,
    depthT: dot({ x: pt.x - nearLeft.x, y: pt.y - nearLeft.y }, depthVec),
  }));
  projected.sort((a, b) => a.depthT - b.depthT);

  const gaps = [];
  for (let i = 1; i < projected.length; i++) {
    gaps.push(projected[i].depthT - projected[i - 1].depthT);
  }
  const med = median(gaps);
  const threshold = med * 2.5;

  const clusters = [];
  let current = [projected[0].pt];
  for (let i = 1; i < projected.length; i++) {
    if (gaps[i - 1] > threshold) {
      clusters.push(current);
      current = [];
    }
    current.push(projected[i].pt);
  }
  clusters.push(current);

  if (clusters.length !== meta.rows) {
    console.warn(`[WARN] ${meta.sector}: expected ${meta.rows} rows, got ${clusters.length} clusters`);
  }

  const chordVec = normalize({ x: nearRight.x - nearLeft.x, y: nearRight.y - nearLeft.y });
  const labeled = [];
  clusters.forEach((cluster, rowIdx) => {
    const rowN = rowIdx + 1;
    const sorted = [...cluster].sort((a, b) => {
      const tA = dot({ x: a.x - nearLeft.x, y: a.y - nearLeft.y }, chordVec);
      const tB = dot({ x: b.x - nearLeft.x, y: b.y - nearLeft.y }, chordVec);
      return tA - tB;
    });
    sorted.forEach((pt, seatIdx) => {
      const seatN = meta.seatCountFromLeft ? sorted.length - seatIdx : seatIdx + 1;
      labeled.push({ x: pt.x, y: pt.y, row: rowN, seat: seatN });
    });
  });
  return labeled;
}

export function labelAxisGridSector(dots, meta) {
  const notchRow = meta.notchRow || 17;
  const groups = new Map();
  for (const pt of dots) {
    const key = Math.round(pt.y * 100) / 100;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(pt);
  }

  const sortedKeys = [...groups.keys()].sort((a, b) => b - a);
  const labeled = [];
  let rowN = 1;
  for (const key of sortedKeys) {
    if (rowN === notchRow) rowN++;
    const sorted = [...groups.get(key)].sort((a, b) => a.x - b.x);
    sorted.forEach((pt, seatIdx) => {
      const seatN = meta.seatCountFromLeft ? sorted.length - seatIdx : seatIdx + 1;
      labeled.push({ x: pt.x, y: pt.y, row: rowN, seat: seatN });
    });
    rowN++;
  }
  return labeled;
}

export function labelSectorDots(sectorId) {
  const meta = loadMeta(sectorId);
  const dots = loadDots(sectorId);
  const anchors = loadAnchors(sectorId);

  switch (meta.gridMode) {
    case 'radialGrid+d124step':
      return labelCornerSector(dots, meta, anchors);
    case 'axisGrid':
      return labelAxisGridSector(dots, meta);
    case 'fieldGrid':
    default:
      return labelStraightSector(dots, meta);
  }
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

  console.warn(`[WARN] ${sectorId}: labeled-dots.json not found, computing on-the-fly`);
  const data = labelSectorDots(sectorId);
  _cache.set(sectorId, data);
  return data;
}

export { LABELED_DOTS_DIR };
