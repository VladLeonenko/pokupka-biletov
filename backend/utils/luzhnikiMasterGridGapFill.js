/**
 * Master Grid: достройка рядов 1..maxRow по геометрии сектора + облаку (не только имеющиеся row_id).
 * FORCE_FULL_GRID=1
 */

import { pathBBox } from './hallSeatGeodesyFromDots.js';
import { parseSvgHallRowLabels } from './hallSeatGeodesyFromSvgRows.js';
import {
  resolveSectorNativeMaxRow,
  sortSectorRowBandsFromField,
  rowNumToBandIndex,
} from './hallSeatGeodesySectorNative.js';
import { buildSectorRowCalibrationFromStrict } from './luzhnikiFieldGridRowCalibration.js';
import {
  buildSectorLocalFrame,
  sectorTribuneClass,
  toFieldPolar,
  fieldPolarToXY,
  tribuneArcSegmentCount,
} from './luzhnikiLocalMagneticResonance.js';

function parseRowNum(row) {
  const n = parseInt(String(row ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function median(values) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function isForceFullGrid() {
  const v = String(process.env.FORCE_FULL_GRID ?? process.env.LUZHNIKI_FORCE_FULL_GRID ?? '').trim();
  return v === '1' || v.toLowerCase() === 'true';
}

function sectorPhiWedge(path, w, h, origin) {
  const b = pathBBox(path);
  if (!b) return null;
  const corners = [
    [b.minX, b.minY],
    [b.maxX, b.minY],
    [b.maxX, b.maxY],
    [b.minX, b.maxY],
  ];
  const phis = corners.map(([px, py]) => {
    const xPct = (px / w) * 100;
    const yPct = (py / h) * 100;
    return toFieldPolar({ xPct, yPct }, origin).phi;
  });
  return { phiMin: Math.min(...phis), phiMax: Math.max(...phis) };
}

function clipPhi(phi0, phi1, wedge) {
  if (!wedge) return { phi0, phi1 };
  let a = Math.max(phi0, wedge.phiMin);
  let b = Math.min(phi1, wedge.phiMax);
  if (b < a) {
    a = wedge.phiMin;
    b = wedge.phiMax;
  }
  return { phi0: a, phi1: b };
}

/** R(rowNum) из полос облака + уточнение по известным row_id. */
function buildFullRowRadiusMap({
  maxRow,
  bands,
  knownRowR,
  origin,
}) {
  const bandR = bands.map((band) => {
    const dots = band?.dots ?? band;
    const rs = Array.isArray(dots) ? dots.map((d) => toFieldPolar(d, origin).r) : [];
    return rs.length ? median(rs) : 0;
  });
  if (!bandR.length) {
    const sorted = [...knownRowR.entries()].sort((a, b) => a[0] - b[0]);
    const out = new Map();
    for (let rn = 1; rn <= maxRow; rn += 1) {
      out.set(rn, interpolateScalar(rn, sorted));
    }
    return out;
  }

  const out = new Map();
  for (let rn = 1; rn <= maxRow; rn += 1) {
    const bi = rowNumToBandIndex(rn, maxRow, bandR.length);
    let r = bandR[bi];
    if (knownRowR.has(rn)) {
      const known = knownRowR.get(rn);
      r = known * 0.72 + r * 0.28;
    }
    out.set(rn, r);
  }
  return out;
}

function interpolateScalar(x, sortedPairs) {
  if (!sortedPairs.length) return 0;
  if (x <= sortedPairs[0][0]) return sortedPairs[0][1];
  if (x >= sortedPairs[sortedPairs.length - 1][0]) return sortedPairs[sortedPairs.length - 1][1];
  for (let i = 0; i < sortedPairs.length - 1; i += 1) {
    const [x0, y0] = sortedPairs[i];
    const [x1, y1] = sortedPairs[i + 1];
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / Math.max(1e-9, x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return sortedPairs[sortedPairs.length - 1][1];
}

/**
 * Полная модель рядов сектора для LST / snap.
 */
export function buildSectorMasterRowModel({
  sectorLabel,
  sectorPath,
  sectorSeats,
  sectorDots,
  fieldCenter,
  hallWidth: w,
  hallHeight: h,
  svgMarkup = '',
  ticketsStrict = [],
}) {
  const origin = fieldCenter ?? { xPct: 50, yPct: 50 };
  const frame = buildSectorLocalFrame(origin, sectorPath, w, h, sectorLabel);
  const wedge = sectorPhiWedge(sectorPath, w, h, frame.origin);

  const svgRowLabels =
    typeof svgMarkup === 'string' && svgMarkup.includes('<tspan')
      ? parseSvgHallRowLabels(svgMarkup, w, h)
      : [];

  const sectorStrict = (ticketsStrict || []).filter(
    (s) => String(s.sector).trim() === String(sectorLabel).trim(),
  );
  const strictMax = sectorStrict.reduce((m, s) => Math.max(m, parseRowNum(s.row) || 0), 0);

  const dots = sectorDots?.length ? sectorDots : sectorSeats;
  const { bands } = sortSectorRowBandsFromField(dots, sectorPath, origin, w, h, 32);

  const maxRow = resolveSectorNativeMaxRow(
    sectorPath,
    svgRowLabels,
    bands.length,
    strictMax || null,
    w,
    h,
    origin,
  );

  const knownRowR = new Map();
  const byRow = new Map();
  for (const s of sectorSeats || []) {
    const rn = parseRowNum(s.row);
    if (!rn) continue;
    if (!byRow.has(rn)) byRow.set(rn, []);
    byRow.get(rn).push(s);
  }
  for (const [rn, rowSeats] of byRow) {
    const rs = rowSeats.map((s) => toFieldPolar(s, frame.origin).r);
    knownRowR.set(rn, rs.reduce((a, b) => a + b, 0) / rs.length);
  }

  const forceFull = isForceFullGrid();
  const knownMax = knownRowR.size ? Math.max(...knownRowR.keys()) : 0;
  const effectiveMaxRow = forceFull
    ? maxRow
    : Math.max(maxRow, knownMax, Math.ceil(maxRow * 0.85));

  const rowRadius = buildFullRowRadiusMap({
    maxRow: effectiveMaxRow,
    bands,
    knownRowR,
    origin: frame.origin,
  });

  const allPolars = (sectorSeats || []).map((s) => toFieldPolar(s, frame.origin));
  const dotPolars = (sectorDots || []).map((d) => toFieldPolar(d, frame.origin));
  const phis = [...allPolars, ...dotPolars].map((p) => p.phi);
  let phi0 = phis.length ? Math.min(...phis) : wedge?.phiMin ?? -0.5;
  let phi1 = phis.length ? Math.max(...phis) : wedge?.phiMax ?? 0.5;
  ({ phi0, phi1 } = clipPhi(phi0, phi1, wedge));

  const rows = [];
  for (let rn = 1; rn <= effectiveMaxRow; rn += 1) {
    const r = rowRadius.get(rn) ?? rowRadius.get([...rowRadius.keys()].pop());
    if (!r || r <= 0) continue;
    rows.push({
      rowNum: rn,
      rowId: String(rn),
      rMean: r,
      phi0,
      phi1,
      virtual: !knownRowR.has(rn),
      rowSeats: byRow.get(rn) || [],
    });
  }

  return {
    frame,
    wedge,
    maxRow: effectiveMaxRow,
    rows,
    knownRowR,
    rowRadius,
    phi0,
    phi1,
  };
}

/** Плавная дуга: constant R + квадратичные сегменты (2 полудуги). */
export function arcPointsSmooth(frame, r, phi0, phi1, w, h, sectorLabel) {
  const tribune = sectorTribuneClass(sectorLabel);
  const segments = Math.max(24, tribuneArcSegmentCount(tribune) * 2);
  const pts = [];
  const origin = frame.origin;
  const mid = (phi0 + phi1) / 2;

  const emit = (a0, a1, n) => {
    for (let i = 0; i <= n; i += 1) {
      const t = i / n;
      const phi = a0 + t * (a1 - a0);
      const xy = fieldPolarToXY(r, phi, origin);
      pts.push({ x: (xy.xPct / 100) * w, y: (xy.yPct / 100) * h });
    }
  };

  const half = Math.floor(segments / 2);
  emit(phi0, mid, half);
  emit(mid, phi1, segments - half);
  return pts;
}

export function snapSeatToMasterGrid(seat, model, phiColumn) {
  const rn = parseRowNum(seat.row);
  const sn = parseInt(String(seat.seat ?? '').replace(/\D/g, ''), 10);
  if (!rn) return null;
  const row = model.rows.find((r) => r.rowNum === rn);
  if (!row) return null;
  let phi = phiColumn?.get(sn);
  if (phi == null && row.rowSeats?.length) {
    const hit = row.rowSeats.find((s) => parseRowNum(s.seat) === sn);
    if (hit) phi = toFieldPolar(hit, model.frame.origin).phi;
  }
  if (phi == null) phi = (row.phi0 + row.phi1) / 2;
  return fieldPolarToXY(row.rMean, phi, model.frame.origin);
}
