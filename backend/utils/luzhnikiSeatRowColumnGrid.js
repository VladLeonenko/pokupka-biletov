/**
 * Метрики качества сетки + re-export построения линий.
 */

export { buildSeatRowColumnGrid } from './luzhnikiSeatGridLines.js';

const ROW_DEVIATION_OK_PCT = 4;
const COL_DEVIATION_OK_PCT = 6;

function distPointToSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = a.x + t * dx;
  const py = a.y + t * dy;
  return Math.hypot(p.x - px, p.y - py);
}

function maxChordDeviationPct(line) {
  const pts = line.points;
  if (pts.length < 3) return 0;
  const a = pts[0];
  const b = pts[pts.length - 1];
  const chord = Math.hypot(b.x - a.x, b.y - a.y);
  if (chord < 1e-6) return 0;
  let maxD = 0;
  for (let i = 1; i < pts.length - 1; i += 1) {
    maxD = Math.max(maxD, distPointToSegment(pts[i], a, b));
  }
  return (maxD / chord) * 100;
}

function segmentsIntersect(p1, p2, p3, p4) {
  const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = cross(p1, p2, p3);
  const d2 = cross(p1, p2, p4);
  const d3 = cross(p3, p4, p1);
  const d4 = cross(p3, p4, p2);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  return false;
}

function countPolylineCrossings(lines, sameSectorOnly = false) {
  let n = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const li = lines[i];
    const pi = li.points;
    if (pi.length < 2) continue;
    for (let j = i + 1; j < lines.length; j += 1) {
      const lj = lines[j];
      if (sameSectorOnly && li.sector && lj.sector && li.sector !== lj.sector) continue;
      const pj = lj.points;
      if (pj.length < 2) continue;
      if (segmentsIntersect(pi[0], pi[pi.length - 1], pj[0], pj[pj.length - 1])) {
        n += 1;
      }
    }
  }
  return n;
}

export function analyzeSeatGridQuality(rowLines, columnLines, options = {}) {
  let maxRowChordDeviationPct = 0;
  for (const line of rowLines) {
    maxRowChordDeviationPct = Math.max(maxRowChordDeviationPct, maxChordDeviationPct(line));
  }

  let maxColumnChordDeviationPct = 0;
  for (const line of columnLines) {
    maxColumnChordDeviationPct = Math.max(
      maxColumnChordDeviationPct,
      maxChordDeviationPct(line),
    );
  }

  const rowLineCrossings = countPolylineCrossings(rowLines, true);
  const columnLineCrossings = countPolylineCrossings(columnLines, true);

  const chordOk = !options.curvedRows && !options.anchorMesh;
  const gridCrooked =
    (chordOk && maxRowChordDeviationPct > ROW_DEVIATION_OK_PCT) ||
    (chordOk && maxColumnChordDeviationPct > COL_DEVIATION_OK_PCT) ||
    (!options.anchorMesh && rowLineCrossings > 0) ||
    (!options.anchorMesh && columnLineCrossings > 0);

  let verdict;
  let verdictHint;

  if (gridCrooked) {
    verdict = 'grid_crooked';
    verdictHint =
      'Сетка кривая — проверь fieldGrid / калибровку рядов или якоря sector-row-anchors.json.';
  } else if (rowLines.length >= 2) {
    verdict = options.anchorMesh ? 'grid_ok' : 'grid_ok_svg_suspect';
    verdictHint = options.anchorMesh
      ? 'Сетка по угловым якорям (bilinear + rowCurve).'
      : 'Сетка по spatial sort вдоль осей сектора.';
  } else {
    verdict = 'grid_ok_svg_suspect';
    verdictHint = 'Мало линий для оценки.';
  }

  return {
    rowLineCount: rowLines.length,
    columnLineCount: columnLines.length,
    maxRowChordDeviationPct: Math.round(maxRowChordDeviationPct * 10) / 10,
    maxColumnChordDeviationPct: Math.round(maxColumnChordDeviationPct * 10) / 10,
    rowLineCrossings,
    columnLineCrossings,
    verdict,
    verdictHint,
  };
}
