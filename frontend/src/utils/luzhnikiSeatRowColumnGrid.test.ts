import { describe, expect, it } from 'vitest';
import {
  analyzeSeatGridQuality,
  buildSeatRowColumnGrid,
  type GridSeat,
} from './luzhnikiSeatRowColumnGrid';

function straightGrid(): GridSeat[] {
  const out: GridSeat[] = [];
  for (let row = 1; row <= 5; row += 1) {
    for (let seat = 1; seat <= 8; seat += 1) {
      out.push({
        sector: 'Сектор D 230',
        row: String(row),
        seat: String(seat),
        xPct: 10 + seat * 2,
        yPct: 20 + row * 3,
      });
    }
  }
  return out;
}

function crookedRow(): GridSeat[] {
  const out: GridSeat[] = [];
  for (let seat = 1; seat <= 10; seat += 1) {
    const zig = seat % 2 === 0 ? 8 : 0;
    out.push({
      sector: 'Сектор X',
      row: '1',
      seat: String(seat),
      xPct: 10 + seat * 2,
      yPct: 50 + zig,
    });
  }
  return out;
}

const ROW_DEV_OK = 4;

describe('luzhnikiSeatRowColumnGrid', () => {
  it('строит ряды и колонны для прямой сетки', () => {
    const { rowLines, columnLines } = buildSeatRowColumnGrid(straightGrid(), { sector: 'D 230' });
    expect(rowLines.length).toBe(5);
    expect(columnLines.length).toBe(8);
    const q = analyzeSeatGridQuality(rowLines, columnLines);
    expect(q.rowLineCrossings).toBe(0);
    expect(q.maxRowChordDeviationPct).toBeLessThan(2);
    expect(q.verdict).not.toBe('grid_crooked');
  });

  it('детектит зигзаг в ряду', () => {
    const { rowLines, columnLines } = buildSeatRowColumnGrid(crookedRow(), { sector: 'X' });
    const q = analyzeSeatGridQuality(rowLines, columnLines);
    expect(q.maxRowChordDeviationPct).toBeGreaterThan(ROW_DEV_OK);
    expect(q.verdict).toBe('grid_crooked');
  });
});
