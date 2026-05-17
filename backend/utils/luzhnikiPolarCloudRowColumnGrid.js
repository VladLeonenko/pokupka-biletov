/**
 * Диагностика: полилинии только через узлы Master Map (luzhniki.txt).
 * LMR / R_mean / виртуальные дуги — отключены (LUZHNIKI_CLOUD_MASTER=0 для legacy).
 */

import { extractPbiletTicketsSeatGeodesy } from './luzhnikiPbiletGeodesyExtract.js';
import { buildCloudMasterDiagnosticGrid, useCloudMasterMap } from './luzhnikiCloudMasterMap.js';
import {
  buildLMRDiagnosticGridFromLabeledSeats,
  mergeSeatsWithSellablePriority,
} from './luzhnikiLocalMagneticResonance.js';
import { buildSectorDotIndex } from './hallSeatGeodesyFromDots.js';
import { computeFieldCenterPct } from './hallSeatGeodesySectorNative.js';
import { isForceFullGrid } from './luzhnikiMasterGridGapFill.js';
import { buildFullStadiumLabeledSeats } from './luzhnikiStadiumFullGeodesy.js';

/**
 * @param {{
 *   allSeatCoordinates?: { xPct: number, yPct: number }[];
 *   labeledSeats?: object[];
 *   ticketsPayload?: unknown;
 *   coordinatesPayload?: unknown;
 *   sectorPaths: { label: string, path: string }[];
 *   hallWidth: number;
 *   hallHeight: number;
 *   sectorFilter?: string;
 *   minDotsPerSector?: number;
 *   maxColumnsPerSector?: number;
 *   fieldCenter?: { xPct: number, yPct: number };
 *   svgMarkup?: string;
 * }} opts
 */
export function buildPolarCloudRowColumnGrid(opts) {
  const w = Number(opts.hallWidth) > 0 ? Number(opts.hallWidth) : 11413;
  const h = Number(opts.hallHeight) > 0 ? Number(opts.hallHeight) : 9676;

  if (useCloudMasterMap()) {
    let labeledSeats = Array.isArray(opts.labeledSeats) ? opts.labeledSeats : [];
    if (!labeledSeats.length && opts.ticketsPayload && opts.coordinatesPayload) {
      const built = buildFullStadiumLabeledSeats({
        ticketsPayload: opts.ticketsPayload,
        coordinatesPayload: opts.coordinatesPayload,
        svgMarkup: String(opts.svgMarkup ?? ''),
        hallWidth: w,
        hallHeight: h,
      });
      labeledSeats = built.seats.filter((s) => s.geodesySource === 'cloudGrid');
    }

    const grid = buildCloudMasterDiagnosticGrid({
      ticketsPayload: opts.ticketsPayload,
      coordinatesPayload: opts.coordinatesPayload,
      allSeatCoordinates: opts.allSeatCoordinates,
      labeledSeats: labeledSeats.length ? labeledSeats : undefined,
      hallWidth: w,
      hallHeight: h,
      sectorFilter: opts.sectorFilter,
      maxColumnsPerSector: opts.maxColumnsPerSector,
    });

    return {
      ...grid,
      cloudDotCount: opts.allSeatCoordinates?.length ?? grid.cloudDotCount,
      forceFullGrid: false,
      virtualRowCount: 0,
      totalRows: grid.rowLines.length,
    };
  }

  let labeledSeats = Array.isArray(opts.labeledSeats) ? opts.labeledSeats : [];
  let prioritySeats = Array.isArray(opts.prioritySeats) ? opts.prioritySeats : [];
  if (opts.ticketsPayload && opts.coordinatesPayload) {
    if (!prioritySeats.length) {
      prioritySeats = extractPbiletTicketsSeatGeodesy(opts.ticketsPayload, w, h);
    }
    if (!labeledSeats.length) {
      const built = buildFullStadiumLabeledSeats({
        ticketsPayload: opts.ticketsPayload,
        coordinatesPayload: opts.coordinatesPayload,
        svgMarkup: String(opts.svgMarkup ?? ''),
        hallWidth: w,
        hallHeight: h,
      });
      labeledSeats = built.seats.filter(
        (s) => s.geodesySource === 'lmrSnap' || s.geodesySource === 'fieldGrid',
      );
    }
  }
  labeledSeats = mergeSeatsWithSellablePriority(labeledSeats, prioritySeats);

  const fieldCenter =
    opts.fieldCenter ??
    computeFieldCenterPct(
      labeledSeats.length ? labeledSeats : opts.allSeatCoordinates || [],
    );

  const cloudDots = opts.allSeatCoordinates ?? [];
  const dotsBySector = buildSectorDotIndex(cloudDots, opts.sectorPaths, w, h);

  const grid = buildLMRDiagnosticGridFromLabeledSeats({
    labeledSeats,
    sectorPaths: opts.sectorPaths,
    hallWidth: w,
    hallHeight: h,
    sectorFilter: opts.sectorFilter,
    maxColumnsPerSector: opts.maxColumnsPerSector,
    fieldCenter,
    prioritySeats,
    dotsBySector,
    cloudDots,
    svgMarkup: String(opts.svgMarkup ?? ''),
    forceFullGrid: isForceFullGrid(),
  });

  return {
    ...grid,
    cloudDotCount: opts.allSeatCoordinates?.length ?? 0,
  };
}
