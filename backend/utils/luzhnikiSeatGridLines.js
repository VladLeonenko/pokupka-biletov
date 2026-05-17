/**
 * Сетка рядов/колонн: полярная система от центра поля + guide rows (1-й и последний ряд).
 */

import { loadSectorCalibrationBlocksByNorm } from './hallSeatGeodesySectorRowAnchors.js';
import {
  computeFieldCenterPct,
  rowAxisFromSector,
  seatLeftAxisFromSector,
} from './hallSeatGeodesySectorNative.js';
import { inferCornerAnchors, polarGridSeatPosition } from './luzhnikiSeatWarp.js';
import { normalizeSectorLabel } from './ticketHallSectorNormalize.js';

function parseNum(value) {
  const n = Number.parseInt(String(value ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function toHallPoint(p, w, h) {
  return { x: (p.xPct / 100) * w, y: (p.yPct / 100) * h };
}

function toPolarPct(xPct, yPct, cx, cy) {
  const dx = xPct - cx;
  const dy = yPct - cy;
  return { r: Math.hypot(dx, dy), phi: Math.atan2(dy, dx) };
}

function fromPolarPct(r, phi, cx, cy) {
  return { xPct: cx + r * Math.cos(phi), yPct: cy + r * Math.sin(phi) };
}

/** Кратчайшая дельта угла. */
function deltaPhi(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

function lerpPolarGuide(pNear, pFar, t, cx, cy) {
  const a = toPolarPct(pNear.xPct, pNear.yPct, cx, cy);
  const b = toPolarPct(pFar.xPct, pFar.yPct, cx, cy);
  const r = a.r + t * (b.r - a.r);
  const phi = a.phi + t * deltaPhi(a.phi, b.phi);
  return fromPolarPct(r, phi, cx, cy);
}

/**
 * Bilinear в (R, φ) от центра поля — ряд ≈ фиксированный R, место ≈ φ.
 */
function interpolateSeatPolarField(anchors, corners, row, seat, fieldCenter) {
  const rowN = parseNum(row);
  const seatN = parseNum(seat);
  if (rowN == null || seatN == null) return null;

  const { minR, maxR, minS, maxS, p00, p10, p01, p11 } = corners;
  const cx = fieldCenter.xPct;
  const cy = fieldCenter.yPct;

  const pol = {
    p00: toPolarPct(p00.xPct, p00.yPct, cx, cy),
    p10: toPolarPct(p10.xPct, p10.yPct, cx, cy),
    p01: toPolarPct(p01.xPct, p01.yPct, cx, cy),
    p11: toPolarPct(p11.xPct, p11.yPct, cx, cy),
  };

  pol.p10.phi = pol.p00.phi + deltaPhi(pol.p00.phi, pol.p10.phi);
  pol.p01.phi = pol.p00.phi + deltaPhi(pol.p00.phi, pol.p01.phi);
  pol.p11.phi = pol.p00.phi + deltaPhi(pol.p00.phi, pol.p11.phi);

  const u = maxR === minR ? 0 : (rowN - minR) / (maxR - minR);
  const v = maxS === minS ? 0 : (seatN - minS) / (maxS - minS);
  const uc = Math.max(0, Math.min(1, u));
  const vc = Math.max(0, Math.min(1, v));

  const r =
    (1 - uc) * (1 - vc) * pol.p00.r +
    uc * (1 - vc) * pol.p10.r +
    (1 - uc) * vc * pol.p01.r +
    uc * vc * pol.p11.r;

  const phi =
    (1 - uc) * (1 - vc) * pol.p00.phi +
    uc * (1 - vc) * pol.p10.phi +
    (1 - uc) * vc * pol.p01.phi +
    uc * vc * pol.p11.phi;

  return fromPolarPct(r, phi, cx, cy);
}

function columnSeatIndices(minS, maxS, maxLines = 16) {
  const span = maxS - minS + 1;
  if (span <= maxLines) {
    const out = [];
    for (let s = minS; s <= maxS; s += 1) out.push(s);
    return out;
  }
  const set = new Set([minS, maxS]);
  const step = Math.max(1, Math.ceil(span / maxLines));
  for (let s = minS; s <= maxS; s += step) set.add(s);
  for (const highlight of [1, 5, 10, 15, 20]) {
    if (highlight >= minS && highlight <= maxS) set.add(highlight);
  }
  return [...set].sort((a, b) => a - b);
}

/**
 * Guide rows: крайние ряды в полярной mesh, средние — пропорционально между ними по φ и R.
 */
export function buildPolarGuideRowColumnGrid(
  block,
  sectorLabel,
  hallWidth,
  hallHeight,
  fieldCenter,
  seatRange = null,
  columnOpts = {},
) {
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;
  const maxColLines = Number(columnOpts.maxColumnsPerSector) > 0 ? columnOpts.maxColumnsPerSector : 18;

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
          source: 'polarGrid',
        });
      }
    }
    for (const s of columnSeatIndices(1, maxSeat, maxColLines)) {
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
          source: 'polarGrid',
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

  const cx = fieldCenter.xPct;
  const cy = fieldCenter.yPct;

  const rowEnds = (rowN) => {
    const pts = [];
    for (let s = minS; s <= maxS; s += 1) {
      const p = interpolateSeatPolarField(anchors, corners, rowN, s, fieldCenter);
      if (p) pts.push(p);
    }
    return pts;
  };

  const firstRow = rowEnds(minR);
  const lastRow = rowEnds(maxR);
  if (firstRow.length < 2 || lastRow.length < 2) {
    return { rowLines: [], columnLines: [] };
  }

  const rowLines = [];
  const rowSpan = maxR - minR;
  for (let r = minR; r <= maxR; r += 1) {
    const t = rowSpan > 0 ? (r - minR) / rowSpan : 0;
    const points = [];
    const n = Math.min(firstRow.length, lastRow.length);
    for (let i = 0; i < n; i += 1) {
      const p =
        r === minR
          ? firstRow[i]
          : r === maxR
            ? lastRow[i]
            : lerpPolarGuide(firstRow[i], lastRow[i], t, cx, cy);
      points.push(toHallPoint(p, w, h));
    }
    if (points.length >= 2) {
      rowLines.push({
        kind: 'row',
        label: `${sectorLabel} · ряд ${r}`,
        sector: sectorLabel,
        row: String(r),
        points,
        source: 'polarGuide',
      });
    }
  }

  const columnLines = [];
  for (const seatN of columnSeatIndices(minS, maxS, maxColLines)) {
    const points = [];
    for (let r = minR; r <= maxR; r += 1) {
      const p = interpolateSeatPolarField(anchors, corners, r, seatN, fieldCenter);
      if (p) points.push(toHallPoint(p, w, h));
    }
    if (points.length >= 2) {
      columnLines.push({
        kind: 'column',
        label: `${sectorLabel} · место ${seatN}`,
        sector: sectorLabel,
        seat: String(seatN),
        points,
        source: 'polarColumn',
      });
    }
  }

  return { rowLines, columnLines };
}

/** @deprecated alias */
export function buildAnchorMeshRowColumnGrid(
  block,
  sectorLabel,
  hallWidth,
  hallHeight,
  seatRange,
  columnOpts,
) {
  const fieldCenter = columnOpts?.fieldCenter ?? { xPct: 50, yPct: 50 };
  return buildPolarGuideRowColumnGrid(
    block,
    sectorLabel,
    hallWidth,
    hallHeight,
    fieldCenter,
    seatRange,
    columnOpts,
  );
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

function seatSortKey(seat, axis) {
  return seat.xPct * axis.x + seat.yPct * axis.y;
}

function buildSpatialSortGrid(seats, sectorPath, fieldCenter, hallWidth, hallHeight, columnOpts) {
  const w = hallWidth;
  const h = hallHeight;
  const seatAxis = seatLeftAxisFromSector(sectorPath, fieldCenter, w, h);
  const rowAxis = rowAxisFromSector(sectorPath, fieldCenter, w, h);
  const maxCol = columnOpts?.maxColumnsPerSector ?? 18;

  const byRow = new Map();
  const byCol = new Map();
  for (const s of seats) {
    const row = String(s.row ?? '').trim();
    const seat = String(s.seat ?? '').trim();
    if (!row || row === '—' || !seat) continue;
    if (!byRow.has(row)) byRow.set(row, []);
    if (!byCol.has(seat)) byCol.set(seat, []);
    byRow.get(row).push(s);
    byCol.get(seat).push(s);
  }

  const sectorLabel = seats[0]?.sector ?? '';
  const rowLines = [];
  for (const [row, group] of byRow) {
    const sorted = [...group].sort((a, b) => seatSortKey(a, seatAxis) - seatSortKey(b, seatAxis));
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

  const colNums = new Set();
  for (const seat of byCol.keys()) colNums.add(parseNum(seat));
  const valid = [...colNums].filter((n) => n != null).sort((a, b) => a - b);
  const minS = valid[0] ?? 1;
  const maxS = valid[valid.length - 1] ?? 1;
  const columnLines = [];
  for (const seatN of columnSeatIndices(minS, maxS, maxCol)) {
    const group = byCol.get(String(seatN)) ?? [];
    const sorted = [...group].sort((a, b) => {
      const ra = parseNum(a.row);
      const rb = parseNum(b.row);
      if (ra != null && rb != null && ra !== rb) return ra - rb;
      return seatSortKey(a, rowAxis) - seatSortKey(b, rowAxis);
    });
    if (sorted.length < 2) continue;
    columnLines.push({
      kind: 'column',
      label: `${sectorLabel} · место ${seatN}`,
      sector: sectorLabel,
      seat: String(seatN),
      points: sorted.map((s) => toHallPoint(s, w, h)),
      source: 'spatialSort',
    });
  }

  return { rowLines, columnLines };
}

/**
 * @param {{ sector: string, row: string, seat: string, xPct: number, yPct: number }[]} seats
 */
export function buildSeatRowColumnGrid(seats, options = {}) {
  const hallWidth = Number(options.hallWidth) > 0 ? Number(options.hallWidth) : 11413;
  const hallHeight = Number(options.hallHeight) > 0 ? Number(options.hallHeight) : 9676;
  const sectorFilter = options.sector?.trim() ?? '';
  const preferAnchorMesh = options.preferAnchorMesh !== false;
  const maxColumnsPerSector = Number(options.maxColumnsPerSector) > 0 ? options.maxColumnsPerSector : 18;

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
  const fieldCenter = computeFieldCenterPct(
    options.allSeatCoordinates?.length ? options.allSeatCoordinates : filtered,
  );

  const columnOpts = { maxColumnsPerSector, fieldCenter };

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
      const mesh = buildPolarGuideRowColumnGrid(
        block,
        sectorLabel,
        hallWidth,
        hallHeight,
        fieldCenter,
        range,
        columnOpts,
      );
      rowLines.push(...mesh.rowLines);
      columnLines.push(...mesh.columnLines);
      anchorSectorCount += 1;
      continue;
    }

    if (!sp?.path) continue;
    const spatial = buildSpatialSortGrid(
      sectorSeats,
      sp.path,
      fieldCenter,
      hallWidth,
      hallHeight,
      columnOpts,
    );
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
    columnLineCount: columnLines.length,
  };
}
