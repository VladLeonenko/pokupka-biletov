import type { GridSeat } from '@/utils/luzhnikiSeatRowColumnGrid';

export type FieldGridCompareReport = {
  strictCount: number;
  gridCount: number;
  matched: number;
  exactRowMatch: number;
  within1Row: number;
  exactPct: number;
  medianRowDelta: number | null;
  rowDeltaHistogram: { delta: number; count: number }[];
  mismatchSamples: {
    strictRow: string;
    strictSeat: string;
    gridRow: string;
    gridSeat: string;
    rowDelta: number;
    distPct: number;
  }[];
};

export type GridLinePayload = {
  kind: 'row' | 'column';
  label: string;
  sector: string;
  points: { x: number; y: number }[];
  source?: string;
};

export type GridOverlayPayload = {
  rowLines: GridLinePayload[];
  columnLines: GridLinePayload[];
  quality: {
    verdict: string;
    verdictHint: string;
    rowLineCount: number;
    columnLineCount: number;
    maxRowChordDeviationPct: number;
    maxColumnChordDeviationPct: number;
    rowLineCrossings: number;
    columnLineCrossings: number;
  };
  anchorSectorCount?: number;
  spatialSectorCount?: number;
};

export type LuzhnikiSeatGridDiagnosticPayload = {
  hallWidth: number;
  hallHeight: number;
  sectorFilter: string | null;
  sectors: string[];
  strict: GridSeat[];
  fieldGrid: GridSeat[];
  compare: FieldGridCompareReport;
  referenceSectors: string[];
  stats?: Record<string, number>;
  gridOverlay?: GridOverlayPayload;
  strictGridOverlay?: GridOverlayPayload;
};

export function seatsToGridSeats(
  seats: { sector: string; row: string; seat: string; xPct: number; yPct: number }[],
): GridSeat[] {
  return seats.map((s) => ({
    sector: s.sector,
    row: s.row,
    seat: s.seat,
    xPct: s.xPct,
    yPct: s.yPct,
  }));
}
