/**
 * Линии рядов/колонн для диагностики: угловые якоря (bilinear + rowCurve) или spatial sort.
 */

import { loadSectorCalibrationBlocksByNorm } from './hallSeatGeodesySectorRowAnchors.js';
import {
  computeFieldCenterPct,
  rowAxisFromSector,
  seatLeftAxisFromSector,
} from './hallSeatGeodesySectorNative.js';
import {
  inferCornerAnchors,
  interpolateSeatFromCornerAnchors,
  polarGridSeatPosition,
} from './luzhnikiSeatWarp.js';
import { normalizeSectorLabel } from './ticketHallSectorNormalize.js';

function parseNum(value) {
  const n = Number.parseInt(String(value ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function toHallPoint(p, w, h) {
  return { x: (p.xPct / 100) * w, y: (p.yPct / 100) * h };
}

function seatSortKey(seat, axis) {
  return seat.xPct * axis.x + seat.yPct * axis.y;
}

function sortSeatsAlongAxis(seats, axis) {
  return [...seats].sort((a, b) => seatSortKey(a, axis) - seatSortKey(b, axis));
}

function sortSeatsAlongRowAxis(seats, axis) {
  return [...seats].sort((a, b) => {
    const ra = parseNum(a.row);
    const rb = parseNum(b.row);
    if (ra != null && rb != null && ra !== rb) return ra - rb;
    return seatSortKey(a, axis) - seatSortKey(b, axis);
  });
}

/**
 * Плавная сетка по 4 углам сектора (как A 108 VIP).
 * @param {object} block — sector-row-anchors.json
 */
export function buildAnchorMeshRowColumnGrid(block, sectorLabel, hallWidth, hallHeight, seatRange = null) {
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;
  const rowCurve = Number(block?.rowCurve ?? 0.32);

  if (block?.mode === 'polarGrid') {
    const maxRow = Math.max(1, Number(block.maxRow) || 1);
    const maxSeat = Math.max(1, Number(block.maxSeat) || 1);
    const rowLines = [];
    const columnLines = [];
    for (let r = 1; r <= maxRow; r += 1) {
      const points = [];
      for (let s = 1; s <= maxSeat; s += 1) {
        const p = polarGridSeatPosition(block, String(r), String(s));
        if (p) points.push(toHallPoint(p, w, h));
      }
      if (points.length >= 2) {
        rowLines.push({
          kind: 'row',
          label: `${sectorLabel} · ряд ${r}`,
          sector: sectorLabel,
          row: String(r),
          points,
          source: 'anchorMesh',
        });
      }
    }
    for (let s = 1; s <= maxSeat; s += 1) {
      const points = [];
      for (let r = 1; r <= maxRow; r += 1) {
        const p = polarGridSeatPosition(block, String(r), String(s));
        if (p) points.push(toHallPoint(p, w, h));
      }
      if (points.length >= 2) {
        columnLines.push({
          kind: 'column',
          label: `${sectorLabel} · место ${s}`,
          sector: sectorLabel,
          seat: String(s),
          points,
          source: 'anchorMesh',
        });
      }
    }
    return { rowLines, columnLines };
  }

  const anchors = Array.isArray(block?.anchors) ? block.anchors : [];
  const corners = inferCornerAnchors(anchors);
  if (!corners) return { rowLines: [], columnLines: [] };

  let { minR, maxR, minS, maxS } = corners;
  if (seatRange) {
    minR = Math.min(minR, seatRange.minR);
    maxR = Math.max(maxR, seatRange.maxR);
    minS = Math.min(minS, seatRange.minS);
    maxS = Math.max(maxS, seatRange.maxS);
  }

  const rowLines = [];
  for (let r = minR; r <= maxR; r += 1) {
    const points = [];
    for (let s = minS; s <= maxS; s += 1) {
      const p = interpolateSeatFromCornerAnchors(anchors, String(r), String(s), rowCurve);
      if (p) points.push(toHallPoint(p, w, h));
    }
    if (points.length >= 2) {
      rowLines.push({
        kind: 'row',
        label: `${sectorLabel} · ряд ${r}`,
        sector: sectorLabel,
        row: String(r),
        points,
        source: 'anchorMesh',
      });
    }
  }

  const columnLines = [];
  for (let s = minS; s <= maxS; s += 1) {
    const points = [];
    for (let r = minR; r <= maxR; r += 1) {
      const p = interpolateSeatFromCornerAnchors(anchors, String(r), String(s), rowCurve);
      if (p) points.push(toHallPoint(p, w, h));
    }
    if (points.length >= 2) {
      columnLines.push({
        kind: 'column',
        label: `${sectorLabel} · место ${s}`,
        sector: sectorLabel,
        seat: String(s),
        points,
        source: 'anchorMesh',
      });
    }
  }

  return { rowLines, columnLines };
}

function seatRangeFromSeats(seats) {
  let minR = Infinity;
  let maxR = -Infinity;
  let minS = Infinity;
  let maxS = -Infinity;
  for (const s of seats) {
    const r = parseNum(s.row);
    const sn = parseNum(s.seat);
    if (r != null) {
      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
    }
    if (sn != null) {
      minS = Math.min(minS, sn);
      maxS = Math.max(maxS, sn);
    }
  }
  if (!Number.isFinite(minR)) return null;
  return { minR, maxR, minS, maxS };
}

function buildSpatialSortGrid(seats, sectorPath, fieldCenter, hallWidth, hallHeight) {
  const w = hallWidth;
  const h = hallHeight;
  const seatAxis = seatLeftAxisFromSector(sectorPath, fieldCenter, w, h);
  const rowAxis = rowAxisFromSector(sectorPath, fieldCenter, w, h);

  const byRow = new Map();
  const byCol = new Map();
  for (const s of seats) {
    const row = String(s.row ?? '').trim();
    const seat = String(s.seat ?? '').trim();
    if (!row || row === '—' || !seat) continue;
    const rk = `${row}`;
    const ck = `${seat}`;
    if (!byRow.has(rk)) byRow.set(rk, []);
    if (!byCol.has(ck)) byCol.set(ck, []);
    byRow.get(rk).push(s);
    byCol.get(ck).push(s);
  }

  const sectorLabel = seats[0]?.sector ?? '';
  const rowLines = [];
  for (const [row, group] of byRow) {
    const sorted = sortSeatsAlongAxis(group, seatAxis);
    if (sorted.length < 2) continue;
    rowLines.push({
      kind: 'row',
      label: `${sectorLabel} · ряд ${row}`,
      sector: sectorLabel,
      row,
      points: sorted.map((s) => toHallPoint(s, w, h)),
      source: 'spatialSort',
    });
  }

  const columnLines = [];
  for (const [seat, group] of byCol) {
    const sorted = sortSeatsAlongRowAxis(group, rowAxis);
    if (sorted.length < 2) continue;
    columnLines.push({
      kind: 'column',
      label: `${sectorLabel} · место ${seat}`,
      sector: sectorLabel,
      seat,
      points: sorted.map((s) => toHallPoint(s, w, h)),
      source: 'spatialSort',
    });
  }

  return { rowLines, columnLines };
}

/**
 * @param {{ sector: string, row: string, seat: string, xPct: number, yPct: number }[]} seats
 * @param {{
 *   sector?: string;
 *   hallWidth?: number;
 *   hallHeight?: number;
 *   sectorPaths?: { label: string, path: string }[];
 *   preferAnchorMesh?: boolean;
 * }} [options]
 */
export function buildSeatRowColumnGrid(seats, options = {}) {
  const hallWidth = Number(options.hallWidth) > 0 ? Number(options.hallWidth) : 11413;
  const hallHeight = Number(options.hallHeight) > 0 ? Number(options.hallHeight) : 9676;
  const sectorFilter = options.sector?.trim() ?? '';
  const preferAnchorMesh = options.preferAnchorMesh !== false;

  const filtered = sectorFilter
    ? seats.filter((s) => {
        const f = sectorFilter.toLowerCase();
        const sl = String(s.sector).toLowerCase();
        return sl.includes(f) || f.includes(sl);
      })
    : seats;

  const pathsByNorm = new Map();
  for (const sp of options.sectorPaths || []) {
    const label = String(sp.label ?? '').trim();
    const path = String(sp.path ?? '').trim();
    if (!label || !path) continue;
    pathsByNorm.set(normalizeSectorLabel(label), { label, path });
  }

  const blocksByNorm = loadSectorCalibrationBlocksByNorm();
  const fieldCenter = computeFieldCenterPct(filtered);

  const bySector = new Map();
  for (const s of filtered) {
    const norm = normalizeSectorLabel(s.sector);
    if (!bySector.has(norm)) bySector.set(norm, []);
    bySector.get(norm).push(s);
  }

  const rowLines = [];
  const columnLines = [];
  let anchorSectorCount = 0;
  let spatialSectorCount = 0;

  for (const [norm, sectorSeats] of bySector) {
    const block = blocksByNorm.get(norm);
    const sp = pathsByNorm.get(norm);
    const sectorLabel = sp?.label ?? sectorSeats[0]?.sector ?? norm;

    const canMesh =
      preferAnchorMesh &&
      block &&
      (block.mode === 'polarGrid' ||
        (Array.isArray(block.anchors) && inferCornerAnchors(block.anchors)));

    if (canMesh) {
      const range = seatRangeFromSeats(sectorSeats);
      const mesh = buildAnchorMeshRowColumnGrid(
        block,
        sectorLabel,
        hallWidth,
        hallHeight,
        range,
      );
      rowLines.push(...mesh.rowLines);
      columnLines.push(...mesh.columnLines);
      anchorSectorCount += 1;
      continue;
    }

    if (!sp?.path) continue;
    const spatial = buildSpatialSortGrid(sectorSeats, sp.path, fieldCenter, hallWidth, hallHeight);
    rowLines.push(...spatial.rowLines);
    columnLines.push(...spatial.columnLines);
    spatialSectorCount += 1;
  }

  rowLines.sort((a, b) => a.label.localeCompare(b.label, 'ru'));
  columnLines.sort((a, b) => a.label.localeCompare(b.label, 'ru'));

  return {
    rowLines,
    columnLines,
    hallWidth,
    hallHeight,
    sectorCount: bySector.size,
    dotCount: filtered.length,
    anchorSectorCount,
    spatialSectorCount,
  };
}
