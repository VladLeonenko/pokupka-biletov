/**
 * Полная геодезия стадиона: strict из tickets.json + fieldGrid по облаку luzhniki.txt.
 * fieldGrid: калибровка рядов через luzhnikiFieldGridRowCalibration (ticketsSeats).
 */

import {
  extractPbiletCoordinateCategoriesSectorPaths,
  extractPbiletCoordinatesSeatDots,
  extractPbiletTicketsSeatGeodesy,
  extractPbiletTicketSectorPaths,
  mergeSectorMetaPreferTickets,
} from './luzhnikiPbiletGeodesyExtract.js';
import { buildSectorDotIndex } from './hallSeatGeodesyFromDots.js';
import {
  buildStadiumLayoutSeatsFromDotGrid,
  mergeLayoutSeatsPreferPbiletStrict,
} from './hallSeatGeodesyLuzhnikiGrid.js';
import { buildFullCloudGridLabeledSeats } from './luzhnikiCloudGridSeatIndex.js';
import { useCloudMasterMap } from './luzhnikiCloudMasterMap.js';
import { applyLocalMagneticResonanceToLabeledSeats } from './luzhnikiLocalMagneticResonance.js';
import { useRadialStepFieldGrid } from './luzhnikiRadialStepFieldGrid.js';

/**
 * @param {{
 *   ticketsPayload: unknown;
 *   coordinatesPayload: unknown;
 *   svgMarkup: string;
 *   hallWidth?: number;
 *   hallHeight?: number;
 * }} input
 */
export function buildFullStadiumLabeledSeats({
  ticketsPayload,
  coordinatesPayload,
  svgMarkup,
  hallWidth,
  hallHeight,
}) {
  const w = Number(hallWidth) || Number(coordinatesPayload?.width) || 11413;
  const h = Number(hallHeight) || Number(coordinatesPayload?.height) || 9676;

  if (useCloudMasterMap()) {
    const built = buildFullCloudGridLabeledSeats({
      ticketsPayload,
      coordinatesPayload,
      hallWidth: w,
      hallHeight: h,
    });
    return {
      seats: built.seats,
      sectorPaths: built.sectorPaths,
      hallWidth: built.hallWidth,
      hallHeight: built.hallHeight,
      stats: {
        strictCount: built.stats.strictCount,
        cloudGridCount: built.stats.cloudGridCount,
        fieldGridCount: 0,
        lmrSnapCount: 0,
        sectorCount: built.stats.sectorCount,
        coordinateDots: built.stats.coordinateDots,
        gridRaw: 0,
        ticketsStrict: built.stats.strictCount,
      },
    };
  }

  const ticketsSeats = extractPbiletTicketsSeatGeodesy(ticketsPayload, w, h);
  const allSeatCoordinates = extractPbiletCoordinatesSeatDots(coordinatesPayload, w, h);
  const fromTickets = extractPbiletTicketSectorPaths(ticketsPayload);
  const fromCats = extractPbiletCoordinateCategoriesSectorPaths(coordinatesPayload);
  const sectorPaths = mergeSectorMetaPreferTickets(fromTickets, fromCats);

  const gridSeats =
    allSeatCoordinates.length > 0 && sectorPaths.length > 0
      ? buildStadiumLayoutSeatsFromDotGrid({
          sectorPaths,
          allSeatCoordinates,
          svgMarkup: String(svgMarkup ?? ''),
          hallWidth: w,
          hallHeight: h,
          ticketsSeats,
        })
      : [];

  const merged = mergeLayoutSeatsPreferPbiletStrict(ticketsSeats, gridSeats);
  let seats = merged;
  let lmrSnapCount = 0;
  const runLmr =
    useRadialStepFieldGrid() &&
    process.env.LUZHNIKI_SKIP_LMR !== '1' &&
    process.env.LUZHNIKI_SKIP_LMR !== 'true';
  if (runLmr) {
    const dotsBySector = buildSectorDotIndex(allSeatCoordinates, sectorPaths, w, h);
    const lmr = applyLocalMagneticResonanceToLabeledSeats(
      merged,
      sectorPaths,
      allSeatCoordinates,
      w,
      h,
      ticketsSeats,
      { dotsBySector, svgMarkup: String(svgMarkup ?? '') },
    );
    seats = lmr.seats;
    lmrSnapCount = seats.filter((s) => s.geodesySource === 'lmrSnap').length;
  }
  const strictCount = seats.filter((s) => s.geodesySource === 'strict').length;

  return {
    seats,
    sectorPaths,
    hallWidth: w,
    hallHeight: h,
    stats: {
      strictCount,
      fieldGridCount: seats.length - strictCount,
      lmrSnapCount,
      sectorCount: new Set(seats.map((s) => s.sector)).size,
      coordinateDots: allSeatCoordinates.length,
      gridRaw: gridSeats.length,
      ticketsStrict: ticketsSeats.length,
    },
  };
}
