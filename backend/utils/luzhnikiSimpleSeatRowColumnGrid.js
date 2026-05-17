/**
 * Сетка рядов/колонн = полилинии через layout.seats (как на /map).
 * Зеркало frontend/src/utils/luzhnikiSeatRowColumnGrid.ts — без polar/LMR/ellipse.
 */

function parseOrdinal(value) {
  const n = Number.parseInt(String(value).replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : Number.NaN;
}

function compareOrdinal(a, b) {
  const na = parseOrdinal(a);
  const nb = parseOrdinal(b);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return String(a).localeCompare(String(b), 'ru', { numeric: true });
}

function normSector(s) {
  return String(s).replace(/\s+/g, ' ').trim().toLowerCase();
}

function sectorMatches(sector, filter) {
  const f = normSector(filter);
  const s = normSector(sector);
  return s.includes(f) || f.includes(s);
}

function toHallPoint(s, w, h) {
  return { x: (s.xPct / 100) * w, y: (s.yPct / 100) * h };
}

/**
 * Row N: линия через все seat одного row.
 * Column M: линия через одинаковые seat в разных row.
 */
export function buildSimpleSeatRowColumnGrid(seats, options = {}) {
  const hallWidth = Number(options.hallWidth) > 0 ? Number(options.hallWidth) : 11413;
  const hallHeight = Number(options.hallHeight) > 0 ? Number(options.hallHeight) : 9676;
  const sectorFilter = options.sector?.trim() ?? '';

  const filtered = sectorFilter
    ? seats.filter((s) => sectorMatches(s.sector, sectorFilter))
    : seats;

  const byRow = new Map();
  const byColumn = new Map();

  for (const s of filtered) {
    const rowKey = `${s.sector}\0${s.row}`;
    const colKey = `${s.sector}\0${s.seat}`;
    if (!byRow.has(rowKey)) byRow.set(rowKey, []);
    if (!byColumn.has(colKey)) byColumn.set(colKey, []);
    byRow.get(rowKey).push(s);
    byColumn.get(colKey).push(s);
  }

  const rowLines = [];
  for (const [key, group] of byRow) {
    const [sector, row] = key.split('\0');
    const sorted = [...group].sort((a, b) => compareOrdinal(a.seat, b.seat));
    if (sorted.length < 2) continue;
    rowLines.push({
      kind: 'row',
      label: `${sector} · ряд ${row}`,
      sector,
      rowId: row,
      source: 'layoutSeat',
      points: sorted.map((s) => toHallPoint(s, hallWidth, hallHeight)),
    });
  }

  const columnLines = [];
  for (const [key, group] of byColumn) {
    const [sector, seat] = key.split('\0');
    const sorted = [...group].sort((a, b) => compareOrdinal(a.row, b.row));
    if (sorted.length < 2) continue;
    columnLines.push({
      kind: 'column',
      label: `${sector} · место ${seat}`,
      sector,
      seat,
      source: 'layoutSeat',
      points: sorted.map((s) => toHallPoint(s, hallWidth, hallHeight)),
    });
  }

  rowLines.sort((a, b) => a.label.localeCompare(b.label, 'ru'));
  columnLines.sort((a, b) => a.label.localeCompare(b.label, 'ru'));

  const sectorCount = new Set(filtered.map((s) => normSector(s.sector))).size;

  return {
    rowLines,
    columnLines,
    hallWidth,
    hallHeight,
    sectorCount,
    dotCount: filtered.length,
    anchorSectorCount: 0,
    spatialSectorCount: sectorCount,
    columnLineCount: columnLines.length,
  };
}
