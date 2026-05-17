/**
 * Полная геодезия стадиона: strict из tickets.json + fieldGrid по облаку luzhniki.txt.
 */

import {
  extractPbiletCoordinateCategoriesSectorPaths,
  extractPbiletCoordinatesSeatDots,
  extractPbiletTicketsSeatGeodesy,
  extractPbiletTicketSectorPaths,
  mergeSectorMetaPreferTickets,
} from './luzhnikiPbiletGeodesyExtract.js';
import {
  buildStadiumLayoutSeatsFromDotGrid,
  mergeLayoutSeatsPreferPbiletStrict,
} from './hallSeatGeodesyLuzhnikiGrid.js';

/**
 * @param {{
 *   ticketsPayload: unknown;
 *   coordinatesPayload: unknown;
 *   svgMarkup: string;
 *   hallWidth?: number;
 *   hallHeight?: number;
 * }} input
 * @returns {{
 *   seats: { sector: string; row: string; seat: string; xPct: number; yPct: number; geodesySource?: string }[];
 *   sectorPaths: Record<string, unknown>[];
 *   hallWidth: number;
 *   hallHeight: number;
 *   stats: { strictCount: number; fieldGridCount: number; sectorCount: number };
 * }}
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
        })
      : [];

  const seats = mergeLayoutSeatsPreferPbiletStrict(ticketsSeats, gridSeats);
  const strictCount = seats.filter((s) => s.geodesySource === 'strict').length;

  return {
    seats,
    sectorPaths,
    hallWidth: w,
    hallHeight: h,
    stats: {
      strictCount,
      fieldGridCount: seats.length - strictCount,
      sectorCount: new Set(seats.map((s) => s.sector)).size,
      coordinateDots: allSeatCoordinates.length,
      gridRaw: gridSeats.length,
      ticketsStrict: ticketsSeats.length,
    },
  };
}
