/**
 * Номера рядов с подложки pbilet SVG (<tspan>1..N</tspan>).
 * Для секторов без r[] в tickets.json — target Y ряда с подписи на схеме.
 */

import {
  clusterDotsByRow,
  pickDotNearRowSeat,
  pathBBox,
  resolveOfferSeatSnapInSector,
} from './hallSeatGeodesyFromDots.js';

const TSPAN_RE =
  /<tspan\s+[^>]*\bx=["']([\d.]+)["'][^>]*\by=["']([\d.]+)["'][^>]*>([^<]*)<\/tspan>/gi;
const TSPAN_RE_ALT =
  /<tspan\s+[^>]*\by=["']([\d.]+)["'][^>]*\bx=["']([\d.]+)["'][^>]*>([^<]*)<\/tspan>/gi;

function pointInSectorBBox(x, y, bbox, margin = 120) {
  return (
    x >= bbox.minX - margin &&
    x <= bbox.maxX + margin &&
    y >= bbox.minY - margin &&
    y <= bbox.maxY + margin
  );
}

/** @returns {{ row: number, x: number, y: number, xPct: number, yPct: number }[]} */
export function parseSvgHallRowLabels(svgMarkup, hallWidth, hallHeight) {
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;
  const out = [];
  const seen = new Set();

  const ingest = (re) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(svgMarkup))) {
      const x = Number(m[1]);
      const y = Number(m[2]);
      const text = String(m[3] ?? '').trim();
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (!/^\d{1,2}$/.test(text)) continue;
      const row = Number.parseInt(text, 10);
      if (row < 1 || row > 99) continue;
      const key = `${row}|${x.toFixed(1)}|${y.toFixed(1)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ row, x, y, xPct: (x / w) * 100, yPct: (y / h) * 100 });
    }
  };

  if (typeof svgMarkup !== 'string' || !svgMarkup.includes('<svg')) return out;
  ingest(TSPAN_RE);
  ingest(TSPAN_RE_ALT);
  return out;
}

function clusterLabelsByAisle(labels, minGap = 120) {
  if (!labels?.length) return [];
  const sorted = [...labels].sort((a, b) => a.x - b.x);
  const groups = [];
  let cur = [sorted[0]];
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].x - sorted[i - 1].x > minGap) {
      groups.push(cur);
      cur = [sorted[i]];
    } else cur.push(sorted[i]);
  }
  groups.push(cur);

  return groups.map((group) => {
    const rowY = new Map();
    const byRow = new Map();
    for (const l of group) {
      const arr = byRow.get(l.row) ?? [];
      arr.push(l.yPct);
      byRow.set(l.row, arr);
    }
    for (const [row, ys] of byRow) {
      ys.sort((a, b) => a - b);
      rowY.set(row, ys[Math.floor(ys.length / 2)]);
    }
    const xs = group.map((g) => g.x);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      centerX: xs.reduce((s, v) => s + v, 0) / xs.length,
      rowY,
    };
  });
}

export function buildSectorSvgRowAisles(sectorPath, allLabels, hallWidth, hallHeight) {
  const b = pathBBox(sectorPath);
  if (!b || !allLabels?.length) return [];
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const h = Number(hallHeight) > 0 ? Number(hallHeight) : 9676;
  const inside = allLabels.filter((l) =>
    pointInSectorBBox(l.x, l.y, { minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY }),
  );
  return clusterLabelsByAisle(inside);
}

function pickAisle(aisles, rowNum, hintXAbs) {
  const withRow = aisles.filter((a) => a.rowY.has(rowNum));
  if (withRow.length === 0) return null;
  if (withRow.length === 1) return withRow[0];
  let best = withRow[0];
  let bestD = Infinity;
  for (const a of withRow) {
    const d = Math.abs(a.centerX - hintXAbs);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best;
}

export function resolveRowYPctFromSvgLabels(
  rowNum,
  sectorPath,
  allLabels,
  hallWidth,
  hallHeight,
  hintXPct = 50,
) {
  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const aisles = buildSectorSvgRowAisles(sectorPath, allLabels, hallWidth, hallHeight);
  const aisle = pickAisle(aisles, rowNum, (hintXPct / 100) * w);
  if (!aisle) return null;
  const y = aisle.rowY.get(rowNum);
  return Number.isFinite(y) ? y : null;
}

/**
 * @param {{ xPct: number, yPct: number }[]} sectorDots
 */
export function resolveOfferSeatFromSvgRowLabels(
  rowNum,
  seatNum,
  sectorDots,
  sectorPath,
  allLabels,
  hallWidth,
  hallHeight,
  seatRangeInRow,
) {
  if (!sectorDots?.length || !allLabels?.length || !sectorPath) return null;

  const w = Number(hallWidth) > 0 ? Number(hallWidth) : 11413;
  const bands = clusterDotsByRow(sectorDots);
  if (bands.length < 2) return null;

  const roughX =
    seatNum != null && seatRangeInRow
      ? ((seatNum - 1) / Math.max(1, seatRangeInRow.max - 1)) * 100
      : 50;
  const targetYPct = resolveRowYPctFromSvgLabels(
    rowNum,
    sectorPath,
    allLabels,
    hallWidth,
    hallHeight,
    roughX,
  );
  if (targetYPct == null) return null;

  let bestBand = bands[0];
  let bestDy = Math.abs(bands[0].yPct - targetYPct);
  for (const band of bands) {
    const dy = Math.abs(band.yPct - targetYPct);
    if (dy < bestDy) {
      bestDy = dy;
      bestBand = band;
    }
  }

  let rowDots = [...bestBand.dots].sort((a, b) => a.xPct - b.xPct);

  const seatMax = Math.max(seatRangeInRow?.max ?? seatNum ?? 1, rowDots.length, 1);
  const seatMin = 1;
  let targetX;
  if (seatNum != null && rowDots.length >= 1) {
    const st = (seatNum - seatMin) / Math.max(1, seatMax - seatMin);
    const seatIdx = Math.round(st * (rowDots.length - 1));
    targetX = rowDots[Math.min(Math.max(seatIdx, 0), rowDots.length - 1)].xPct;
  } else {
    targetX = rowDots[Math.floor(rowDots.length / 2)]?.xPct ?? 50;
  }

  if (rowDots.length >= 2) {
    const hit = pickDotNearRowSeat(rowDots, bestBand.yPct, targetX, 0.75);
    if (hit) return { xPct: hit.xPct, yPct: hit.yPct };
  }

  return resolveOfferSeatSnapInSector(
    sectorDots,
    targetYPct,
    seatNum,
    seatRangeInRow,
    0.9,
  );
}
