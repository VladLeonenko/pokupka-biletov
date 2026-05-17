/**
 * Local Sector Transform: полярка от центра поля, ось сектора, row_id/seat_id, обрезка по местам.
 */

import { pathBBox } from './hallSeatGeodesyFromDots.js';
import { computeFieldCenterPct, rowAxisFromSector } from './hallSeatGeodesySectorNative.js';
import { normalizeSectorLabel, strictSeatKey } from './ticketHallSectorNormalize.js';
import {
  arcPointsSmooth,
  buildSectorMasterRowModel,
  isForceFullGrid,
  snapSeatToMasterGrid,
} from './luzhnikiMasterGridGapFill.js';

function parseSeatNum(seat) {
  const n = parseInt(String(seat ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function parseRowNum(row) {
  const n = parseInt(String(row ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function sectorCenterPct(path, w, h) {
  const b = pathBBox(path);
  if (!b) return null;
  return {
    xPct: ((b.minX + b.maxX) / 2 / w) * 100,
    yPct: ((b.minY + b.maxY) / 2 / h) * 100,
  };
}

/** Трибуна: торец / бок / угол / VIP — влияет на сегменты дуги. */
export function sectorTribuneClass(sectorLabel) {
  const n = String(sectorLabel ?? '').toLowerCase();
  if (/vip|лож/i.test(n)) return 'vip';
  const m = n.match(/сектор\s*([abcd])\s*(\d+)/i) || n.match(/\b([abcd])\s*(\d{2,3})\b/i);
  if (!m) return 'side';
  const letter = m[1].toLowerCase();
  const num = parseInt(m[2], 10);
  if (letter === 'a' || letter === 'c') {
    if (num >= 100 && num <= 145) return 'end';
    if (num >= 146 || num <= 99) return 'corner';
  }
  if (letter === 'b' || letter === 'd') return 'side';
  return 'side';
}

export function tribuneArcSegmentCount(tribune) {
  if (tribune === 'end') return 36;
  if (tribune === 'corner') return 28;
  if (tribune === 'vip') return 24;
  return 18;
}

/**
 * Локальная система сектора: origin = центр поля, phiBisector = ось сектора.
 */
export function buildSectorLocalFrame(fieldCenter, path, w, h, sectorLabel) {
  const sc = sectorCenterPct(path, w, h);
  const fc = fieldCenter ?? { xPct: 50, yPct: 50 };
  const tribune = sectorTribuneClass(sectorLabel);
  let phiBisector = 0;
  if (sc) {
    phiBisector = Math.atan2(sc.yPct - fc.yPct, sc.xPct - fc.xPct);
  }
  const rowAxis = path
    ? rowAxisFromSector(path, fc, w, h)
    : { x: Math.cos(phiBisector), y: Math.sin(phiBisector) };
  return {
    origin: { xPct: fc.xPct, yPct: fc.yPct },
    phiBisector,
    rowAxis,
    tribune,
    arcSegments: tribuneArcSegmentCount(tribune),
    sectorCenter: sc,
  };
}

/** Полярные координаты от центра поля (как Portalbilet). */
export function toFieldPolar(dot, origin) {
  const dx = dot.xPct - origin.xPct;
  const dy = dot.yPct - origin.yPct;
  return {
    r: Math.hypot(dx, dy),
    phi: Math.atan2(dy, dx),
  };
}

export function fieldPolarToXY(r, phi, origin) {
  return {
    xPct: origin.xPct + r * Math.cos(phi),
    yPct: origin.yPct + r * Math.sin(phi),
  };
}

function seatPriority(s, priorityKeys) {
  if (!priorityKeys?.size) return 1;
  return priorityKeys.has(strictSeatKey(s.sector, s.row, s.seat)) ? 4 : 1;
}

/** φ колонны: взвешенная регрессия + sellable; только по фактическим местам. */
function buildColumnPhiMap(rowsSorted, frame, priorityKeys) {
  const phiColumn = new Map();
  const seatNums = new Set();
  for (const [, rowSeats] of rowsSorted) {
    for (const s of rowSeats) {
      const sn = parseSeatNum(s.seat);
      if (sn) seatNums.add(sn);
    }
  }

  for (const sn of [...seatNums].sort((a, b) => a - b)) {
    let sumW = 0;
    let sumPhi = 0;
    const samples = [];
    for (const [rk, rowSeats] of rowsSorted) {
      const rn = parseRowNum(rk);
      const s = rowSeats.find((x) => parseSeatNum(x.seat) === sn);
      if (!s || !rn) continue;
      const { phi } = toFieldPolar(s, frame.origin);
      const wgt = seatPriority(s, priorityKeys);
      samples.push({ rowNum: rn, phi, wgt });
      sumW += wgt;
      sumPhi += phi * wgt;
    }
    if (!samples.length) continue;
    if (samples.length === 1) {
      phiColumn.set(sn, samples[0].phi);
      continue;
    }
    let sumR = 0;
    let sumP = 0;
    let sumRR = 0;
    let sumRP = 0;
    let sumWls = 0;
    for (const { rowNum, phi, wgt } of samples) {
      sumWls += wgt;
      sumR += rowNum * wgt;
      sumP += phi * wgt;
      sumRR += rowNum * rowNum * wgt;
      sumRP += rowNum * phi * wgt;
    }
    const denom = sumWls * sumRR - sumR * sumR;
    let phiRay;
    if (Math.abs(denom) > 1e-9) {
      const b = (sumWls * sumRP - sumR * sumP) / denom;
      const a = (sumP - b * sumR) / sumWls;
      phiRay = a + b * (sumR / sumWls);
    } else {
      phiRay = sumPhi / sumW;
    }
    phiColumn.set(sn, phiRay);
  }
  return phiColumn;
}

function rowArcBounds(rowSeats, frame) {
  const polars = rowSeats.map((s) => toFieldPolar(s, frame.origin));
  const rMean = polars.reduce((s, p) => s + p.r, 0) / polars.length;
  const phis = polars.map((p) => p.phi);
  return {
    rMean,
    phi0: Math.min(...phis),
    phi1: Math.max(...phis),
  };
}

function columnRayBounds(rowsSorted, seatNum, frame, phiCol) {
  const pts = [];
  for (const [, rowSeats] of rowsSorted) {
    const s = rowSeats.find((x) => parseSeatNum(x.seat) === seatNum);
    if (s) pts.push(toFieldPolar(s, frame.origin));
  }
  if (!pts.length) return null;
  if (pts.length === 1) {
    return { phi: pts[0].phi, r0: pts[0].r, r1: pts[0].r };
  }
  const phi = phiCol ?? pts.reduce((s, p) => s + p.phi, 0) / pts.length;
  const rs = pts.map((p) => p.r);
  return { phi, r0: Math.min(...rs), r1: Math.max(...rs) };
}

export function arcPointsField(frame, r, phi0, phi1, w, h, segments) {
  const n = segments ?? frame.arcSegments;
  const pts = [];
  const span = phi1 - phi0;
  for (let i = 0; i <= n; i += 1) {
    const phi = phi0 + (span * i) / n;
    const xy = fieldPolarToXY(r, phi, frame.origin);
    pts.push({ x: (xy.xPct / 100) * w, y: (xy.yPct / 100) * h });
  }
  return pts;
}

export function columnRayField(frame, phi, r0, r1, w, h) {
  const p0 = fieldPolarToXY(r0, phi, frame.origin);
  const p1 = fieldPolarToXY(r1, phi, frame.origin);
  return [
    { x: (p0.xPct / 100) * w, y: (p0.yPct / 100) * h },
    { x: (p1.xPct / 100) * w, y: (p1.yPct / 100) * h },
  ];
}

function normSectorFilter(sectorLabel, filter) {
  if (!filter?.trim()) return true;
  const f = filter.trim().toLowerCase();
  const s = String(sectorLabel).trim().toLowerCase();
  return s.includes(f) || f.includes(s);
}

export function mergeSeatsWithSellablePriority(labeledSeats, prioritySeats) {
  const byKey = new Map();
  for (const s of labeledSeats || []) {
    byKey.set(strictSeatKey(s.sector, s.row, s.seat), { ...s });
  }
  for (const s of prioritySeats || []) {
    const k = strictSeatKey(s.sector, s.row, s.seat);
    const prev = byKey.get(k);
    byKey.set(k, {
      ...(prev || s),
      ...s,
      xPct: s.xPct ?? prev?.xPct,
      yPct: s.yPct ?? prev?.yPct,
      sellablePriority: true,
    });
  }
  return [...byKey.values()];
}

/**
 * Snap fieldGrid → LST (local sector transform).
 */
export function applyLocalMagneticResonanceToLabeledSeats(
  seats,
  sectorPaths,
  cloud,
  w,
  h,
  prioritySeats = [],
  opts = {},
) {
  const fieldCenter = computeFieldCenterPct(cloud);
  const priorityKeys = new Set(
    (prioritySeats || []).map((s) => strictSeatKey(s.sector, s.row, s.seat)),
  );
  const dotsBySector = opts.dotsBySector ?? null;
  const svgMarkup = opts.svgMarkup ?? '';
  const ticketsStrict = prioritySeats || [];

  const pathByNorm = new Map();
  for (const sp of sectorPaths || []) {
    const label = String(sp.label ?? '').trim();
    if (!label) continue;
    pathByNorm.set(normalizeSectorLabel(label), { path: sp.path, label });
  }

  const bySector = new Map();
  for (const s of seats) {
    if (s.geodesySource === 'strict') continue;
    const norm = normalizeSectorLabel(s.sector);
    if (!bySector.has(norm)) bySector.set(norm, []);
    bySector.get(norm).push(s);
  }

  const out = seats.map((s) => ({ ...s }));
  const idx = new Map(out.map((s, i) => [`${s.sector}\0${s.row}\0${s.seat}`, i]));

  for (const [norm, sectorSeats] of bySector) {
    const meta = pathByNorm.get(norm);
    if (!meta?.path) continue;

    const sectorDots = dotsBySector?.get(norm) ?? cloud;
    const model = buildSectorMasterRowModel({
      sectorLabel: meta.label,
      sectorPath: meta.path,
      sectorSeats,
      sectorDots,
      fieldCenter,
      hallWidth: w,
      hallHeight: h,
      svgMarkup,
      ticketsStrict,
    });

    const rowsSorted = model.rows.map((r) => [r.rowId, r.rowSeats]);
    const phiColumn = buildColumnPhiMap(rowsSorted, model.frame, priorityKeys);

    for (const s of sectorSeats) {
      const xy = snapSeatToMasterGrid(s, model, phiColumn);
      if (!xy) continue;
      const oi = idx.get(`${s.sector}\0${s.row}\0${s.seat}`);
      if (oi == null) continue;
      out[oi] = { ...out[oi], xPct: xy.xPct, yPct: xy.yPct, geodesySource: 'lmrSnap' };
    }
  }

  return { seats: out, fieldCenter };
}

/**
 * Диагностика: 1 row_id = 1 дуга, колонна обрезана по крайним местам.
 */
export function buildLMRDiagnosticGridFromLabeledSeats(opts) {
  const w = Number(opts.hallWidth) > 0 ? Number(opts.hallWidth) : 11413;
  const h = Number(opts.hallHeight) > 0 ? Number(opts.hallHeight) : 9676;
  const sectorFilter = opts.sectorFilter?.trim() ?? '';
  const maxCols = Number(opts.maxColumnsPerSector) > 0 ? Number(opts.maxColumnsPerSector) : 16;
  const seats = Array.isArray(opts.labeledSeats) ? opts.labeledSeats : [];
  const sectorPaths = Array.isArray(opts.sectorPaths) ? opts.sectorPaths : [];
  const dotsBySector = opts.dotsBySector ?? null;
  const cloud = opts.cloudDots ?? [];
  const svgMarkup = opts.svgMarkup ?? '';
  const ticketsStrict = opts.prioritySeats ?? [];
  const fieldCenter = opts.fieldCenter ?? computeFieldCenterPct(seats.length ? seats : cloud);
  const priorityKeys = new Set(
    (opts.prioritySeats || []).map((s) => strictSeatKey(s.sector, s.row, s.seat)),
  );
  const forceFull = opts.forceFullGrid ?? isForceFullGrid();

  const pathByNorm = new Map();
  for (const sp of sectorPaths) {
    const label = String(sp.label ?? '').trim();
    if (!label) continue;
    pathByNorm.set(normalizeSectorLabel(label), { path: sp.path, label });
  }

  const bySector = new Map();
  for (const s of seats) {
    const norm = normalizeSectorLabel(s.sector);
    if (!bySector.has(norm)) bySector.set(norm, []);
    bySector.get(norm).push(s);
  }

  const rowLines = [];
  const columnLines = [];
  let sectorCount = 0;
  let dotCount = 0;
  let virtualRowCount = 0;

  for (const [norm, sectorSeats] of bySector) {
    const meta = pathByNorm.get(norm);
    if (!meta?.path || !normSectorFilter(meta.label, sectorFilter)) continue;

    sectorCount += 1;
    dotCount += sectorSeats.length;

    const sectorDots = dotsBySector?.get(norm) ?? cloud;
    const model = buildSectorMasterRowModel({
      sectorLabel: meta.label,
      sectorPath: meta.path,
      sectorSeats,
      sectorDots,
      fieldCenter,
      hallWidth: w,
      hallHeight: h,
      svgMarkup,
      ticketsStrict,
    });

    const rowsSorted = model.rows.map((r) => [r.rowId, r.rowSeats]);
    const phiColumn = buildColumnPhiMap(rowsSorted, model.frame, priorityKeys);

    for (const row of model.rows) {
      if (row.virtual) virtualRowCount += 1;
      rowLines.push({
        sector: meta.label,
        kind: 'row',
        source: row.virtual ? 'masterArcVirtual' : 'masterArc',
        rowId: row.rowId,
        virtual: row.virtual,
        points: arcPointsSmooth(model.frame, row.rMean, row.phi0, row.phi1, w, h, meta.label),
      });
    }

    const seatList = [...phiColumn.keys()].sort((a, b) => a - b);
    const colPick =
      seatList.length <= maxCols
        ? seatList
        : (() => {
            const set = new Set([seatList[0], seatList[seatList.length - 1]]);
            const step = Math.max(1, Math.ceil(seatList.length / maxCols));
            for (let i = 0; i < seatList.length; i += step) set.add(seatList[i]);
            for (const s of sectorSeats) {
              if (priorityKeys.has(strictSeatKey(s.sector, s.row, s.seat))) {
                set.add(parseSeatNum(s.seat));
              }
            }
            return [...set].sort((a, b) => a - b);
          })();

    for (const sn of colPick) {
      const bounds = columnRayBounds(rowsSorted, sn, model.frame, phiColumn.get(sn));
      if (!bounds || bounds.r1 - bounds.r0 < 1e-6) continue;
      columnLines.push({
        sector: meta.label,
        kind: 'column',
        source: 'masterRay',
        seat: String(sn),
        points: columnRayField(model.frame, bounds.phi, bounds.r0, bounds.r1, w, h),
      });
    }
  }

  return {
    rowLines,
    columnLines,
    hallWidth: w,
    hallHeight: h,
    sectorCount,
    dotCount,
    fieldCenter,
    forceFullGrid: forceFull,
    virtualRowCount,
    totalRows: rowLines.length,
  };
}

/** @deprecated совместимость тестов */
export function circleCenterFromThreePoints(p1, p2, p3) {
  const ax = Number(p1.xPct);
  const ay = Number(p1.yPct);
  const bx = Number(p2.xPct);
  const by = Number(p2.yPct);
  const cx = Number(p3.xPct);
  const cy = Number(p3.yPct);
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-14) return null;
  const a2 = ax * ax + ay * ay;
  const b2 = bx * bx + by * by;
  const c2 = cx * cx + cy * cy;
  return {
    xPct: (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d,
    yPct: (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d,
  };
}

export function computeSectorLocalFocus(dots, path, w, h, fieldCenter) {
  return fieldCenter ?? { xPct: 50, yPct: 50 };
}

export function computeSectorLocalFocusFromLabeledRows(rowsSorted, fieldCenter, path, w, h) {
  return fieldCenter ?? { xPct: 50, yPct: 50 };
}

export function arcPointsHall(focus, phiRef, r, phi0, phi1, scales, w, h, segments = 28) {
  const frame = buildSectorLocalFrame(focus, '', w, h, '');
  frame.origin = focus;
  return arcPointsField(frame, r, phi0, phi1, w, h, segments);
}

export function columnRayHall(focus, phiRef, phi, r0, r1, scales, w, h) {
  const frame = buildSectorLocalFrame(focus, '', w, h, '');
  frame.origin = focus;
  return columnRayField(frame, phi, r0, r1, w, h);
}
