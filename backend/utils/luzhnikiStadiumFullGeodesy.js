/**
 * Полная геодезия стадиона: strict из tickets.json + cloud grid snap по luzhniki.txt.
 */

import { buildFullCloudGridLabeledSeats } from './luzhnikiCloudGridSeatIndex.js';

/**
 * @param {{
 *   ticketsPayload: unknown;
 *   coordinatesPayload: unknown;
 *   svgMarkup?: string;
 *   hallWidth?: number;
 *   hallHeight?: number;
 * }} input
 */
export function buildFullStadiumLabeledSeats(input) {
  const built = buildFullCloudGridLabeledSeats(input);
  const cloudGridCount = built.stats.cloudGridCount ?? 0;
  return {
    ...built,
    stats: {
      ...built.stats,
      fieldGridCount: cloudGridCount,
      cloudGridCount,
    },
  };
}
