/**
 * Диагностика геодезии: линии вдоль рядов и «колонн» (одинаковый номер места).
 * Ровная сетка + кривая подложка → кривой SVG. Кривая сетка → сломанные координаты.
 */

export type GridSeat = {
  sector: string;
  row: string;
  seat: string;
  xPct: number;
  yPct: number;
};

export type GridPoint = { x: number; y: number };

export type GridLine = {
  kind: 'row' | 'column';
  label: string;
  points: GridPoint[];
};

export type GridQualityReport = {
  rowLineCount: number;
  columnLineCount: number;
  /** Макс. отклонение точки ряда от прямой «первое–последнее место» (% от длины хорды), по всем рядам */
  maxRowChordDeviationPct: number;
  /** Макс. то же для колонок */
  maxColumnChordDeviationPct: number;
  /** Число пересечений линий рядов (не соседних) */
  rowLineCrossings: number;
  /** Число пересечений линий колонок */
  columnLineCrossings: number;
  verdict: 'grid_ok' | 'grid_crooked' | 'grid_ok_svg_suspect';
  verdictHint: string;
};

const DEFAULT_W = 11413;
const DEFAULT_H = 9676;

function parseOrdinal(value: string): number {
  const n = Number.parseInt(String(value).replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : Number.NaN;
}

function compareOrdinal(a: string, b: string): number {
  const na = parseOrdinal(a);
  const nb = parseOrdinal(b);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return a.localeCompare(b, 'ru', { numeric: true });
}

function normSector(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

function sectorMatches(sector: string, filter: string): boolean {
  const f = normSector(filter);
  const s = normSector(sector);
  return s.includes(f) || f.includes(s);
}

function toHallPoint(s: GridSeat, w: number, h: number): GridPoint {
  return { x: (s.xPct / 100) * w, y: (s.yPct / 100) * h };
}

/** Линии: внутри ряда (места 1→N) и внутри «колонны» (ряды с одним номером места). */
export function buildSeatRowColumnGrid(
  seats: GridSeat[],
  options: { sector?: string; hallWidth?: number; hallHeight?: number } = {},
): { rowLines: GridLine[]; columnLines: GridLine[]; hallWidth: number; hallHeight: number } {
  const hallWidth = options.hallWidth ?? DEFAULT_W;
  const hallHeight = options.hallHeight ?? DEFAULT_H;
  const sectorFilter = options.sector?.trim();

  const filtered = sectorFilter
    ? seats.filter((s) => sectorMatches(s.sector, sectorFilter))
    : seats;

  const byRow = new Map<string, GridSeat[]>();
  const byColumn = new Map<string, GridSeat[]>();

  for (const s of filtered) {
    const rowKey = `${s.sector}\0${s.row}`;
    const colKey = `${s.sector}\0${s.seat}`;
    if (!byRow.has(rowKey)) byRow.set(rowKey, []);
    if (!byColumn.has(colKey)) byColumn.set(colKey, []);
    byRow.get(rowKey)!.push(s);
    byColumn.get(colKey)!.push(s);
  }

  const rowLines: GridLine[] = [];
  for (const [key, group] of byRow) {
    const [sector, row] = key.split('\0');
    const sorted = [...group].sort((a, b) => compareOrdinal(a.seat, b.seat));
    if (sorted.length < 2) continue;
    rowLines.push({
      kind: 'row',
      label: `${sector} · ряд ${row}`,
      points: sorted.map((s) => toHallPoint(s, hallWidth, hallHeight)),
    });
  }

  const columnLines: GridLine[] = [];
  for (const [key, group] of byColumn) {
    const [sector, seat] = key.split('\0');
    const sorted = [...group].sort((a, b) => compareOrdinal(a.row, b.row));
    if (sorted.length < 2) continue;
    columnLines.push({
      kind: 'column',
      label: `${sector} · место ${seat}`,
      points: sorted.map((s) => toHallPoint(s, hallWidth, hallHeight)),
    });
  }

  rowLines.sort((a, b) => a.label.localeCompare(b.label, 'ru'));
  columnLines.sort((a, b) => a.label.localeCompare(b.label, 'ru'));

  return { rowLines, columnLines, hallWidth, hallHeight };
}

function distPointToSegment(p: GridPoint, a: GridPoint, b: GridPoint): number {
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

function maxChordDeviationPct(line: GridLine): number {
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

function segmentsIntersect(p1: GridPoint, p2: GridPoint, p3: GridPoint, p4: GridPoint): boolean {
  const cross = (a: GridPoint, b: GridPoint, c: GridPoint) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = cross(p1, p2, p3);
  const d2 = cross(p1, p2, p4);
  const d3 = cross(p3, p4, p1);
  const d4 = cross(p3, p4, p2);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  return false;
}

function countPolylineCrossings(lines: GridLine[]): number {
  let n = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const pi = lines[i].points;
    if (pi.length < 2) continue;
    for (let j = i + 1; j < lines.length; j += 1) {
      const pj = lines[j].points;
      if (pj.length < 2) continue;
      const a1 = pi[0];
      const a2 = pi[pi.length - 1];
      const b1 = pj[0];
      const b2 = pj[pj.length - 1];
      if (segmentsIntersect(a1, a2, b1, b2)) n += 1;
    }
  }
  return n;
}

const ROW_DEVIATION_OK_PCT = 4;
const COL_DEVIATION_OK_PCT = 6;

export function analyzeSeatGridQuality(
  rowLines: GridLine[],
  columnLines: GridLine[],
): GridQualityReport {
  let maxRowChordDeviationPct = 0;
  for (const line of rowLines) {
    maxRowChordDeviationPct = Math.max(maxRowChordDeviationPct, maxChordDeviationPct(line));
  }

  let maxColumnChordDeviationPct = 0;
  for (const line of columnLines) {
    maxColumnChordDeviationPct = Math.max(maxColumnChordDeviationPct, maxChordDeviationPct(line));
  }

  const rowLineCrossings = countPolylineCrossings(rowLines);
  const columnLineCrossings = countPolylineCrossings(columnLines);

  const gridCrooked =
    maxRowChordDeviationPct > ROW_DEVIATION_OK_PCT ||
    maxColumnChordDeviationPct > COL_DEVIATION_OK_PCT ||
    rowLineCrossings > 0 ||
    columnLineCrossings > 0;

  let verdict: GridQualityReport['verdict'];
  let verdictHint: string;

  if (gridCrooked) {
    verdict = 'grid_crooked';
    verdictHint =
      'Сетка кривая (зигзаги, сильный изгиб рядов или пересечения линий) — проверь алгоритм координат (fieldGrid, интерполяция, layout.seats).';
  } else {
    verdict = 'grid_ok_svg_suspect';
    verdictHint =
      'Сетка ровная, но может не совпасть с картинкой подложки — тогда виноват SVG/экспорт pbilet (первый слой), не математика рядов.';
  }

  if (!gridCrooked && rowLines.length >= 2) {
    verdict = 'grid_ok';
    verdictHint =
      'Сетка геометрически ровная. Сравни визуально с подложкой: расхождение = кривой SVG, совпадение сетки и сдвиг фона = калибровка viewBox.';
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

export function gridLinesToSvgMarkup(
  rowLines: GridLine[],
  columnLines: GridLine[],
  hallWidth: number,
  hallHeight: number,
): string {
  const rowPolylines = rowLines
    .map(
      (l) =>
        `<polyline fill="none" stroke="#e53935" stroke-width="2" stroke-opacity="0.85" points="${l.points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')}" data-label="${l.label.replace(/"/g, '')}"/>`,
    )
    .join('\n');

  const colPolylines = columnLines
    .map(
      (l) =>
        `<polyline fill="none" stroke="#1e88e5" stroke-width="1.5" stroke-opacity="0.7" stroke-dasharray="6 4" points="${l.points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')}" data-label="${l.label.replace(/"/g, '')}"/>`,
    )
    .join('\n');

  const dots = [...rowLines, ...columnLines]
    .flatMap((l) => l.points)
    .map((p) => `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="5" fill="#ffeb3b" stroke="#333" stroke-width="0.5"/>`)
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${hallWidth} ${hallHeight}" width="100%" height="100%" style="position:absolute;inset:0;pointer-events:none">
  ${rowPolylines}
  ${colPolylines}
  ${dots}
</svg>`;
}
