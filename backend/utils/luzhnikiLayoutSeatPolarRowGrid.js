/**
 * Ряды для диагностики: места с одним row_id → дуга (постоянный R от центра поля, угол φ).
 * Кольца рисуются в пикселях SVG (cx, cy, rPx), не в «кривых» pct.
 */

import { computeFieldCenterPct } from './hallSeatGeodesySectorNative.js';
import { DEFAULT_SECTOR_MAX_ROW } from './luzhnikiRadialStepFieldGrid.js';

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

function toHallPx(seat, w, h) {
  return { x: (seat.xPct / 100) * w, y: (seat.yPct / 100) * h };
}

function polarPx(px, py, cx, cy) {
  const dx = px - cx;
  const dy = py - cy;
  return { r: Math.hypot(dx, dy), phi: Math.atan2(dy, dx) };
}

/** Полное кольцо в пикселях (годовые кольца), R постоянный. */
export function circleArcPointsPx(cx, cy, rPx, segments = 360) {
  const pts = [];
  const seg = Math.max(72, segments);
  for (let i = 0; i <= seg; i += 1) {
    const phi = -Math.PI + (2 * Math.PI * i) / seg;
    pts.push({
      x: cx + rPx * Math.cos(phi),
      y: cy + rPx * Math.sin(phi),
    });
  }
  return pts;
}

/**
 * Дуга через фактические места ряда: сортировка по φ, одна линия (горизонтальная дуга трибуны).
 */
export function rowPolylineThroughSeats(rowSeats, w, h, fieldCenter) {
  const cx = (fieldCenter.xPct / 100) * w;
  const cy = (fieldCenter.yPct / 100) * h;
  const sorted = [...rowSeats]
    .map((s) => {
      const p = toHallPx(s, w, h);
      return { ...p, phi: polarPx(p.x, p.y, cx, cy).phi };
    })
    .sort((a, b) => a.phi - b.phi);
  if (sorted.length < 2) return [];
  return sorted.map((p) => ({ x: p.x, y: p.y }));
}

/**
 * 35 вложенных колец: R ряда = медиана R мест с этим row_id (пиксели от центра поля).
 */
export function buildLayoutSeatConcentricRowRings(seats, hallWidth, hallHeight, opts = {}) {
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;
  const maxRows = Number(opts.maxRows) > 0 ? Number(opts.maxRows) : DEFAULT_SECTOR_MAX_ROW;
  const labeled = Array.isArray(seats) ? seats : [];
  const fieldCenter = computeFieldCenterPct(labeled);
  const cx = (fieldCenter.xPct / 100) * w;
  const cy = (fieldCenter.yPct / 100) * h;

  const rByRow = new Map();
  for (const s of labeled) {
    const rn = parseRowNum(s.row);
    if (rn < 1 || rn > maxRows) continue;
    const p = toHallPx(s, w, h);
    const { r } = polarPx(p.x, p.y, cx, cy);
    if (!rByRow.has(rn)) rByRow.set(rn, []);
    rByRow.get(rn).push(r);
  }

  const rowRadii = [];
  for (let row = 1; row <= maxRows; row += 1) {
    const rs = rByRow.get(row);
    if (rs?.length) {
      rowRadii.push({ row, rPx: median(rs) });
    }
  }

  if (rowRadii.length < 2 && labeled.length > 0) {
    const allR = labeled.map((s) => {
      const p = toHallPx(s, w, h);
      return polarPx(p.x, p.y, cx, cy).r;
    });
    const rMin = Math.min(...allR);
    const rMax = Math.max(...allR);
    for (let row = 1; row <= maxRows; row += 1) {
      const t = maxRows <= 1 ? 0 : (row - 1) / (maxRows - 1);
      rowRadii.push({ row, rPx: rMin + t * (rMax - rMin) });
    }
  } else {
    for (let row = 1; row <= maxRows; row += 1) {
      if (rByRow.has(row)) continue;
      const lower = rowRadii.filter((x) => x.row < row).pop();
      const upper = rowRadii.find((x) => x.row > row);
      if (lower && upper) {
        const t = (row - lower.row) / (upper.row - lower.row);
        rowRadii.push({ row, rPx: lower.rPx + t * (upper.rPx - lower.rPx) });
      }
    }
    rowRadii.sort((a, b) => a.row - b.row);
  }

  const rowLines = rowRadii.map(({ row, rPx }) => ({
    kind: 'row',
    rowId: String(row),
    source: 'polarRowRing',
    sector: '',
    label: `ряд ${row}`,
    points: circleArcPointsPx(cx, cy, rPx, 360),
  }));

  return {
    rowLines,
    columnLines: [],
    hallWidth: w,
    hallHeight: h,
    sectorCount: new Set(labeled.map((s) => s.sector)).size,
    dotCount: labeled.length,
    fieldCenter,
    maxRows,
    ringCount: rowLines.length,
  };
}

/**
 * Сетка по секторам: в каждом секторе ряд = polyline мест с одним row (φ), без колонн.
 */
export function buildLayoutSeatSectorRowArcs(seats, hallWidth, hallHeight, opts = {}) {
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;
  const sectorFilter = opts.sector?.trim() ?? '';
  const labeled = Array.isArray(seats) ? seats : [];
  const fieldCenter = computeFieldCenterPct(labeled);

  const filtered = sectorFilter
    ? labeled.filter((s) => {
        const f = sectorFilter.trim().toLowerCase();
        const t = String(s.sector).trim().toLowerCase();
        return t.includes(f) || f.includes(t);
      })
    : labeled;

  const bySectorRow = new Map();
  for (const s of filtered) {
    const key = `${s.sector}\0${s.row}`;
    if (!bySectorRow.has(key)) bySectorRow.set(key, []);
    bySectorRow.get(key).push(s);
  }

  const rowLines = [];
  for (const [key, group] of bySectorRow) {
    const [sector, row] = key.split('\0');
    const pts = rowPolylineThroughSeats(group, w, h, fieldCenter);
    if (pts.length < 2) continue;
    rowLines.push({
      kind: 'row',
      rowId: row,
      sector,
      source: 'rowSeatArc',
      label: `${sector} · ряд ${row}`,
      points: pts,
    });
  }

  rowLines.sort((a, b) => a.label.localeCompare(b.label, 'ru'));

  return {
    rowLines,
    columnLines: [],
    hallWidth: w,
    hallHeight: h,
    sectorCount: new Set(filtered.map((s) => s.sector)).size,
    dotCount: filtered.length,
    fieldCenter,
  };
}
